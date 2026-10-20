import {
  createEntry,
  createInitialResume,
  ENTRY_FIELDS,
  ENTRY_TYPES,
  loadResume,
  safeWebsiteUrl,
  STORAGE_KEY,
  websiteDisplayText,
} from "./resume-data.js";

const form = document.querySelector("#resume-form");
const saveState = document.querySelector("#save-state");
let saveTimer;
let resume = loadResume();

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

function renderEntryForm(type) {
  const list = document.querySelector(`#${type}-list`);
  const entries = resume[type];

  if (!entries.length) {
    list.innerHTML = `<p class="empty-entry">No ${type} added yet. Select “Add” to include one.</p>`;
    return;
  }

  list.innerHTML = entries
    .map(
      (entry, index) => `
        <article class="entry-card">
          <div class="entry-card-header">
            <span>${type === "experience" ? "POSITION" : "EDUCATION"} ${index + 1}</span>
            <button class="remove-entry" data-remove="${type}" data-index="${index}" type="button" aria-label="Remove ${type} entry ${index + 1}">Remove</button>
          </div>
          <div class="entry-fields">
            <label class="field field-wide">
              <span>${type === "experience" ? "Job title" : "Degree or qualification"}</span>
              <input data-entry="${type}" data-index="${index}" data-key="role" value="${escapeHtml(entry.role)}" placeholder="${type === "experience" ? "e.g. Marketing Manager" : "e.g. B.A. in Economics"}" />
            </label>
            <label class="field field-wide">
              <span>${type === "experience" ? "Company" : "School"}</span>
              <input data-entry="${type}" data-index="${index}" data-key="organization" value="${escapeHtml(entry.organization)}" placeholder="${type === "experience" ? "Company name" : "School name"}" />
            </label>
            <label class="field">
              <span>Start date</span>
              <input data-entry="${type}" data-index="${index}" data-key="start" value="${escapeHtml(entry.start)}" placeholder="Month, year" />
            </label>
            <label class="field">
              <span>End date</span>
              <input data-entry="${type}" data-index="${index}" data-key="end" value="${escapeHtml(entry.end)}" placeholder="Present or month, year" />
            </label>
            <label class="field field-wide">
              <span>${type === "experience" ? "Highlights" : "Details"} <span class="optional-label">(optional)</span></span>
              <textarea data-entry="${type}" data-index="${index}" data-key="description" rows="2" placeholder="${type === "experience" ? "Key contributions and outcomes" : "Relevant coursework or honors"}">${escapeHtml(entry.description)}</textarea>
            </label>
          </div>
        </article>`,
    )
    .join("");
}

function renderEntriesPreview(type) {
  const container = document.querySelector(`#${type}-preview`);
  const entries = resume[type].filter((entry) => entry.role || entry.organization || entry.description);
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
          ${entry.description ? `<p class="resume-entry-description">${escapeHtml(entry.description)}</p>` : ""}
        </article>`;
    })
    .join("");
}

function renderPreview() {
  setText('[data-preview="name"]', resume.name, "Your Name");
  setText('[data-preview="title"]', resume.title, "Professional Title");
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

  renderEntriesPreview("experience");
  renderEntriesPreview("education");

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
  renderEntryForm("experience");
  renderEntryForm("education");
}

function persistDraft() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resume));
    saveState.textContent = "Saved on this device";
  } catch {
    saveState.textContent = "Could not save draft";
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

form.addEventListener("input", (event) => {
  const target = event.target;
  if (target.dataset.entry) {
    const { entry, index, key } = target.dataset;
    const entryIndex = Number(index);
    if (
      !["experience", "education"].includes(entry) ||
      !Number.isInteger(entryIndex) ||
      entryIndex < 0 ||
      entryIndex >= resume[entry].length ||
      !ENTRY_FIELDS.includes(key)
    ) {
      return;
    }
    resume[entry][entryIndex][key] = target.value;
    renderPreview();
  } else if (target.name && Object.hasOwn(resume, target.name)) {
    resume[target.name] = target.value;
    renderPreview();
  }
  saveDraft();
});

document.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add]");
  if (addButton) {
    const type = addButton.dataset.add;
    if (!ENTRY_TYPES.includes(type)) return;
    resume[type].push(createEntry());
    renderEntryForm(type);
    renderPreview();
    saveDraft();
    document.querySelector(`#${type}-list .entry-card:last-child input`)?.focus();
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
