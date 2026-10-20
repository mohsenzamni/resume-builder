import {
  createEntryFor,
  createInitialResume,
  ENTRY_FIELDS,
  ENTRY_TYPES,
  loadResume,
  normalizeResume,
  safeWebsiteUrl,
  STORAGE_KEY,
  TEMPLATES,
  websiteDisplayText,
} from "./resume-data.js";
import { jobRoles } from "./job-roles.js";

const sectionConfig = {
  experience: {
    label: "POSITION",
    fields: [
      ["role", "Job title", "e.g. Marketing Manager", true],
      ["organization", "Company", "Company name", true],
      ["start", "Start date", "Month, year"],
      ["end", "End date", "Present or month, year"],
      ["description", "Highlights", "Key contributions and outcomes", true, "textarea"],
    ],
  },
  education: {
    label: "EDUCATION",
    fields: [
      ["role", "Degree or qualification", "e.g. B.A. in Economics", true],
      ["organization", "School", "School name", true],
      ["start", "Start date", "Month, year"],
      ["end", "End date", "Month, year"],
      ["description", "Details", "Relevant coursework or honors", true, "textarea"],
    ],
  },
  projects: {
    label: "PROJECT",
    fields: [
      ["role", "Project name", "e.g. Community garden app", true],
      ["organization", "Client or organization", "Optional", true],
      ["start", "Start date", "Month, year"],
      ["end", "End date", "Month, year"],
      ["description", "Project details", "What you built and the impact", true, "textarea"],
    ],
  },
  certifications: {
    label: "CERTIFICATION",
    fields: [
      ["role", "Certification", "e.g. AWS Certified Solutions Architect", true],
      ["organization", "Issuing organization", "e.g. Amazon Web Services", true],
      ["start", "Date earned", "Month, year"],
      ["description", "Details", "Optional credential details", true, "textarea"],
    ],
  },
  languages: {
    label: "LANGUAGE",
    fields: [
      ["role", "Language", "e.g. English", true],
      ["proficiency", "Proficiency", "e.g. Native, fluent, conversational", true],
    ],
  },
};

const form = document.querySelector("#resume-form");
const saveState = document.querySelector("#save-state");
const templateSelect = document.querySelector("#template-select");
const paperSizeSelect = document.querySelector("#paper-size-select");
const importFile = document.querySelector("#import-file");
let saveTimer;
let resume = loadResume();
let aiAvailable = false;
const requestedRole = jobRoles.find(
  (role) => role.slug === new URLSearchParams(window.location.search).get("role"),
);
const rolePrefilled = Boolean(requestedRole && !resume.title.trim());
if (rolePrefilled) {
  resume.title = requestedRole.title;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function setText(selector, value, fallback = "") {
  const element = document.querySelector(selector);
  element.textContent = value || fallback;
}

function aiControls(target) {
  return `
    <button class="button button-quiet ai-rewrite" data-ai-rewrite="${target}" type="button" hidden>
      ✨ Improve with AI
    </button>
    <p class="ai-privacy-note" hidden>
      Only this text and your professional title are sent to Google Gemini after confirmation.
      Avoid including confidential information.
    </p>
    <div class="ai-suggestion" data-ai-suggestion="${target}" hidden></div>`;
}

function renderEntryForm(type) {
  const list = document.querySelector(`#${type}-list`);
  const entries = resume[type];

  if (!entries.length) {
    list.innerHTML = `<p class="empty-entry">No ${type} added yet. Select “Add” to include one.</p>`;
    return;
  }

  list.innerHTML = entries
    .map(
      (entry, index) => {
        const fields = sectionConfig[type].fields
          .map(([key, label, placeholder, wide, elementType]) => {
            const control =
              elementType === "textarea"
                ? `<textarea data-entry="${type}" data-index="${index}" data-key="${key}" rows="2" ${type === "experience" && key === "description" ? 'maxlength="3000"' : ""} placeholder="${placeholder}">${escapeHtml(entry[key])}</textarea>`
                : `<input data-entry="${type}" data-index="${index}" data-key="${key}" value="${escapeHtml(entry[key])}" placeholder="${placeholder}" />`;
            const labelMarkup = `
              <label class="field${wide ? " field-wide" : ""}">
                <span>${label}</span>
                ${control}
              </label>`;
            if (type === "experience" && key === "description") {
              const target = `${type}:${index}`;
              return `<div class="ai-field">${labelMarkup}${aiControls(target)}</div>`;
            }
            return labelMarkup;
          })
          .join("");

        return `
        <article class="entry-card">
          <div class="entry-card-header">
            <span>${sectionConfig[type].label} ${index + 1}</span>
            <div class="entry-actions">
              <button class="reorder-entry" data-move="${type}" data-index="${index}" data-direction="up" type="button" aria-label="Move ${type} entry ${index + 1} up" ${index === 0 ? "disabled" : ""}>↑</button>
              <button class="reorder-entry" data-move="${type}" data-index="${index}" data-direction="down" type="button" aria-label="Move ${type} entry ${index + 1} down" ${index === entries.length - 1 ? "disabled" : ""}>↓</button>
              <button class="remove-entry" data-remove="${type}" data-index="${index}" type="button" aria-label="Remove ${type} entry ${index + 1}">Remove</button>
            </div>
          </div>
          <div class="entry-fields">${fields}</div>
        </article>`;
      },
    )
    .join("");
  setAIAvailability(aiAvailable);
}

function renderEntriesPreview(type) {
  const container = document.querySelector(`#${type}-preview`);
  const entries = resume[type].filter((entry) =>
    ENTRY_FIELDS[type].some((field) => entry[field]),
  );
  const section = document.querySelector(`#${type}-preview-section`);
  section.hidden = entries.length === 0;

  container.innerHTML = entries
    .map((entry) => {
      const dateRange = [entry.start, entry.end].filter(Boolean).join(" – ");
      return `
        <article class="resume-entry">
          <div class="resume-entry-heading">
            <strong>${escapeHtml(entry.role || entry.organization)}</strong>
            ${dateRange ? `<span class="resume-entry-dates">${escapeHtml(dateRange)}</span>` : ""}
          </div>
          ${entry.role && entry.organization ? `<p class="resume-entry-subtitle">${escapeHtml(entry.organization)}</p>` : ""}
          ${entry.proficiency ? `<p class="resume-entry-subtitle">${escapeHtml(entry.proficiency)}</p>` : ""}
          ${entry.description ? `<p class="resume-entry-description">${escapeHtml(entry.description)}</p>` : ""}
        </article>`;
    })
    .join("");
}

function renderPreview() {
  setText('[data-preview="name"]', resume.name, "Your Name");
  setText('[data-preview="title"]', resume.title, "Professional Title");
  document.querySelector("#resume-preview").dataset.template = resume.template;
  setText('[data-preview="email"]', resume.email);
  setText('[data-preview="phone"]', resume.phone);
  setText('[data-preview="location"]', resume.location);

  const website = document.querySelector('[data-preview="website"]');
  const safeUrl = safeWebsiteUrl(resume.website);
  website.textContent = websiteDisplayText(resume.website);
  if (safeUrl) {
    website.href = safeUrl;
  } else {
    website.removeAttribute("href");
  }
  website.hidden = !safeUrl;

  const summarySection = document.querySelector("#summary-preview-section");
  summarySection.hidden = !resume.summary.trim();
  setText('[data-preview="summary"]', resume.summary);

  ENTRY_TYPES.forEach(renderEntriesPreview);

  const skills = resume.skills
    .split(/[,\n]/)
    .map((skill) => skill.trim())
    .filter(Boolean);
  const skillsSection = document.querySelector("#skills-preview-section");
  skillsSection.hidden = skills.length === 0;
  document.querySelector("#skills-preview").innerHTML = skills
    .map((skill) => `<span class="skill-chip">${escapeHtml(skill)}</span>`)
    .join("");
}

function populateForm() {
  for (const [key, value] of Object.entries(resume)) {
    const field = form.elements.namedItem(key);
    if (field && typeof value === "string") field.value = value;
  }
  ENTRY_TYPES.forEach(renderEntryForm);
  templateSelect.value = resume.template;
}

function persistDraft() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resume));
    saveState.textContent = "Saved on this device";
  } catch {
    saveState.textContent = "Could not save draft";
  }
}

function setAIAvailability(available) {
  aiAvailable = available;
  document.querySelectorAll(".ai-rewrite, .ai-privacy-note").forEach((element) => {
    element.hidden = !available;
  });
  document.querySelector("#ai-status").textContent = available
    ? "AI suggestions are optional. Review each suggestion before applying it."
    : "AI writing is currently unavailable; your resume still works and stays in this browser.";
}

async function checkAIAvailability() {
  if (typeof window.fetch !== "function") {
    setAIAvailability(false);
    return;
  }
  try {
    const response = await window.fetch("/api/v1/ai/status", { headers: { Accept: "application/json" } });
    const status = response.ok ? await response.json() : null;
    setAIAvailability(status?.available === true);
  } catch {
    setAIAvailability(false);
  }
}

function getRewriteField(target) {
  if (target === "summary") {
    return { kind: "SUMMARY", field: form.elements.namedItem("summary") };
  }
  const match = /^experience:(\d+)$/.exec(target);
  if (!match) return null;
  const index = Number(match[1]);
  if (!Number.isSafeInteger(index) || index < 0 || index >= resume.experience.length) return null;
  return {
    kind: "EXPERIENCE",
    field: document.querySelector(
      `#experience-list textarea[data-index="${index}"][data-key="description"]`,
    ),
  };
}

function renderAISuggestion(target, suggestion, field) {
  const panel = document.querySelector(`[data-ai-suggestion="${target}"]`);
  if (!panel) return;
  panel.replaceChildren();

  const text = document.createElement("p");
  text.className = "ai-suggestion-copy";
  text.textContent = suggestion;
  const actions = document.createElement("div");
  actions.className = "ai-suggestion-actions";
  const applyButton = document.createElement("button");
  applyButton.className = "button button-primary";
  applyButton.type = "button";
  applyButton.textContent = "Use suggestion";
  applyButton.addEventListener("click", () => {
    field.value = suggestion;
    field.dispatchEvent(new window.Event("input", { bubbles: true }));
    panel.hidden = true;
    field.focus();
  });
  const dismissButton = document.createElement("button");
  dismissButton.className = "button button-quiet";
  dismissButton.type = "button";
  dismissButton.textContent = "Dismiss";
  dismissButton.addEventListener("click", () => {
    panel.hidden = true;
  });
  actions.append(applyButton, dismissButton);
  panel.append(text, actions);
  panel.hidden = false;
}

async function requestRewrite(button) {
  const target = button.dataset.aiRewrite;
  const rewrite = getRewriteField(target);
  if (!rewrite?.field || !rewrite.field.value.trim()) return;
  if (!window.confirm(
    "Send only this selected text and your professional title to Google Gemini for a rewrite? " +
    "Do not send confidential information. " +
    "Your other resume details are not sent. Review the suggestion before applying it.",
  )) return;

  button.disabled = true;
  button.textContent = "Working…";
  try {
    const response = await window.fetch("/api/v1/ai/rewrite", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        kind: rewrite.kind,
        text: rewrite.field.value,
        role: resume.title,
      }),
    });
    if (!response.ok) throw new Error("AI writing request failed");
    const result = await response.json();
    if (typeof result.suggestion !== "string" || !result.suggestion.trim()) {
      throw new Error("AI provider returned an empty suggestion");
    }
    renderAISuggestion(target, result.suggestion, rewrite.field);
    document.querySelector("#ai-status").textContent =
      "Suggestion ready. Review it carefully; it has not changed your resume.";
  } catch {
    document.querySelector("#ai-status").textContent =
      "Could not get an AI suggestion. Your original text has not changed.";
  } finally {
    button.disabled = false;
    button.textContent = "✨ Improve with AI";
  }
}

function saveDraft() {
  saveState.textContent = "Saving…";
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    saveTimer = undefined;
    persistDraft();
  }, 200);
}

window.addEventListener("pagehide", () => {
  if (saveTimer === undefined) return;
  window.clearTimeout(saveTimer);
  saveTimer = undefined;
  persistDraft();
});

document.querySelector("#export-button").addEventListener("click", () => {
  const payload = {
    format: "ResumeCraft",
    version: 1,
    exportedAt: new Date().toISOString(),
    resume,
  };
  const blob = new window.Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "resumecraft-resume.json";
  link.click();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
  saveState.textContent = "Resume exported";
});

document.querySelector("#import-button").addEventListener("click", () => importFile.click());
importFile.addEventListener("change", async () => {
  const file = importFile.files?.[0];
  if (!file) return;
  try {
    if (file.size > 1_000_000) throw new Error("File is too large.");
    const payload = JSON.parse(await file.text());
    if (
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload) ||
      payload.format !== "ResumeCraft" ||
      payload.version !== 1 ||
      !payload.resume ||
      typeof payload.resume !== "object" ||
      Array.isArray(payload.resume)
    ) {
      throw new Error("This is not a supported ResumeCraft export.");
    }
    if (!window.confirm("Replace the current browser draft with the imported resume?")) return;
    window.clearTimeout(saveTimer);
    saveTimer = undefined;
    resume = normalizeResume(payload.resume);
    populateForm();
    renderPreview();
    persistDraft();
    saveState.textContent = "Imported and saved on this device";
  } catch (error) {
    saveState.textContent = error.message || "Could not import this resume.";
  } finally {
    importFile.value = "";
  }
});

form.addEventListener("input", (event) => {
  const target = event.target;
  const suggestion = target.closest(".ai-field")?.querySelector(".ai-suggestion");
  if (suggestion) suggestion.hidden = true;
  if (target.dataset.entry) {
    const { entry, index, key } = target.dataset;
    const entryIndex = Number(index);
    if (
      !ENTRY_TYPES.includes(entry) ||
      !Number.isInteger(entryIndex) ||
      entryIndex < 0 ||
      entryIndex >= resume[entry].length ||
      !ENTRY_FIELDS[entry].includes(key)
    ) {
      return;
    }
    resume[entry][entryIndex][key] = target.value;
    renderPreview();
  } else if (target.name && typeof resume[target.name] === "string") {
    resume[target.name] = target.value;
    renderPreview();
  }
  saveDraft();
});

document.addEventListener("click", (event) => {
  const aiButton = event.target.closest("[data-ai-rewrite]");
  if (aiButton) {
    void requestRewrite(aiButton);
    return;
  }

  const addButton = event.target.closest("[data-add]");
  if (addButton) {
    const type = addButton.dataset.add;
    if (!ENTRY_TYPES.includes(type)) return;
    resume[type].push(createEntryFor(type));
    renderEntryForm(type);
    renderPreview();
    saveDraft();
    document.querySelector(`#${type}-list .entry-card:last-child input`)?.focus();
    return;
  }

  const moveButton = event.target.closest("[data-move]");
  if (moveButton) {
    const { move: type, index, direction } = moveButton.dataset;
    const entryIndex = Number(index);
    if (
      !ENTRY_TYPES.includes(type) ||
      !Number.isInteger(entryIndex) ||
      entryIndex < 0 ||
      entryIndex >= resume[type].length ||
      !["up", "down"].includes(direction)
    ) {
      return;
    }

    const nextIndex = entryIndex + (direction === "up" ? -1 : 1);
    if (nextIndex < 0 || nextIndex >= resume[type].length) return;

    [resume[type][entryIndex], resume[type][nextIndex]] = [
      resume[type][nextIndex],
      resume[type][entryIndex],
    ];
    renderEntryForm(type);
    renderPreview();
    saveDraft();
    const focusDirection = direction === "up" ? "down" : "up";
    document
      .querySelector(
        `[data-move="${type}"][data-index="${nextIndex}"][data-direction="${focusDirection}"]`,
      )
      ?.focus();
    return;
  }

  const removeButton = event.target.closest("[data-remove]");
  if (removeButton) {
    const { remove: type, index } = removeButton.dataset;
    const removedIndex = Number(index);
    if (
      !ENTRY_TYPES.includes(type) ||
      !Number.isInteger(removedIndex) ||
      removedIndex < 0 ||
      removedIndex >= resume[type].length
    ) {
      return;
    }
    resume[type].splice(removedIndex, 1);
    renderEntryForm(type);
    renderPreview();
    saveDraft();
    if (resume[type].length) {
      const nextIndex = Math.min(removedIndex, resume[type].length - 1);
      document.querySelector(`[data-remove="${type}"][data-index="${nextIndex}"]`)?.focus();
    } else {
      document.querySelector(`[data-add="${type}"]`)?.focus();
    }
  }
});

document.querySelector("#print-button").addEventListener("click", () => {
  window.print();
});

templateSelect.addEventListener("change", () => {
  if (!TEMPLATES.includes(templateSelect.value)) {
    templateSelect.value = resume.template;
    return;
  }
  resume.template = templateSelect.value;
  renderPreview();
  saveDraft();
});

paperSizeSelect.addEventListener("change", () => {
  const sizes = { letter: "letter", a4: "A4" };
  const size = sizes[paperSizeSelect.value];
  if (!size) {
    paperSizeSelect.value = "letter";
    return;
  }
  document.querySelector("#print-page-style").textContent =
    `@page { size: ${size}; margin: 0.55in; }`;
});

document.querySelector("#clear-button").addEventListener("click", () => {
  if (!window.confirm("Clear this resume draft from this browser? This cannot be undone.")) return;
  window.clearTimeout(saveTimer);
  saveTimer = undefined;
  resume = createInitialResume();
  populateForm();
  renderPreview();

  try {
    localStorage.removeItem(STORAGE_KEY);
    saveState.textContent = "Draft cleared";
  } catch {
    saveState.textContent = "Could not clear saved draft";
  }
});

populateForm();
renderPreview();
if (rolePrefilled) persistDraft();
void checkAIAvailability();
