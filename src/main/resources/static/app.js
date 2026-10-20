import {
  createEntryFor,
  createInitialResume,
  ENTRY_FIELDS,
  ENTRY_TYPES,
  loadResume,
  safeWebsiteUrl,
  STORAGE_KEY,
  TEMPLATES,
  websiteDisplayText,
} from "./resume-data.js";

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
      (entry, index) => {
        const fields = sectionConfig[type].fields
          .map(([key, label, placeholder, wide, elementType]) => {
            const control =
              elementType === "textarea"
                ? `<textarea data-entry="${type}" data-index="${index}" data-key="${key}" rows="2" placeholder="${placeholder}">${escapeHtml(entry[key])}</textarea>`
                : `<input data-entry="${type}" data-index="${index}" data-key="${key}" value="${escapeHtml(entry[key])}" placeholder="${placeholder}" />`;
            return `
              <label class="field${wide ? " field-wide" : ""}">
                <span>${label}</span>
                ${control}
              </label>`;
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
