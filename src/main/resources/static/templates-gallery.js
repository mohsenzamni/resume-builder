import {
  createInitialResume,
  hasResumeContent,
  loadResume,
  saveTemplateSelection,
} from "./resume-data.js";
import { createResumePreview } from "./resume-preview.js";
import { templates, templateCategories } from "./templates.js";

const sampleResume = {
  ...createInitialResume(),
  name: "Jordan Lee",
  title: "Product Designer",
  email: "jordan.lee@example.com",
  location: "New York, NY",
  website: "jordanlee.design",
  summary: "Product designer creating accessible digital experiences through research, prototyping, and close collaboration.",
  experience: [
    {
      role: "Senior Product Designer",
      organization: "Northstar Studio",
      start: "2022",
      end: "Present",
      description: "Led product design for a cross-functional team. Improved onboarding through usability testing and iterative prototyping.",
    },
  ],
  education: [{
    role: "B.A. Communication Design",
    organization: "State University",
    start: "2017",
    end: "2021",
    description: "",
  }],
  skills: "Product strategy, Prototyping, Accessibility, Figma",
};

export function initializeTemplateGallery({
  document = globalThis.document,
  window = globalThis.window,
  storage,
  navigate,
} = {}) {
  const search = document.querySelector("#template-search");
  const categoryFilter = document.querySelector("#template-category");
  const sortSelect = document.querySelector("#template-sort");
  const results = document.querySelector("#template-results");
  const dialog = document.querySelector("#template-preview-dialog");
  const dialogSelect = document.querySelector("#template-dialog-select");
  const dialogPreview = document.querySelector("#template-dialog-preview");
  const cardCache = new Map();
  const navigateToEditor = navigate ?? (() => window.location.assign("./"));
  let draftStorage = storage;
  let dialogOpener;
  try {
    draftStorage ??= window.localStorage;
  } catch {
    draftStorage = undefined;
  }

  const storedResume = loadResume(draftStorage);
  const hasDraftContent = hasResumeContent(
    storedResume,
    Object.keys(storedResume).filter((key) => key !== "template"),
  );
  const previewResume = hasDraftContent ? storedResume : sampleResume;
  document.querySelector("#template-sample-note").hidden = hasDraftContent;

  function addOption(select, value, label) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.append(option);
  }

  templateCategories.forEach((category) => addOption(categoryFilter, category, category));
  templates.forEach((template) => addOption(dialogSelect, template.id, template.name));

  function renderTemplatePreview(template, container, className, idPrefix) {
    const preview = createResumePreview(document, { ...previewResume, template: template.id }, {
      className,
      idPrefix,
    });
    container.replaceChildren(preview);
  }

  function openTemplatePreview(id, opener) {
    const template = templates.find((item) => item.id === id);
    if (!template) return;
    dialogSelect.value = template.id;
    document.querySelector("#template-dialog-title").textContent = template.name;
    document.querySelector("#template-dialog-description").textContent = template.description;
    renderTemplatePreview(template, dialogPreview, "", "dialog-");
    document.querySelector("#template-use-button").dataset.template = template.id;
    if (!dialog.open) {
      dialogOpener = opener ?? document.activeElement;
      dialog.showModal();
    }
  }

  function applyTemplate(id) {
    if (!saveTemplateSelection(id, draftStorage)) {
      const status = document.querySelector(
        dialog.open ? "#template-dialog-action-status" : "#template-action-status",
      );
      status.textContent =
        "Could not save your choice. Check browser storage and try again.";
      status.hidden = false;
      return;
    }
    navigateToEditor("./");
  }

  function createCard(template) {
    const card = document.createElement("article");
    card.className = "template-card";

    const preview = document.createElement("div");
    preview.className = "template-card-preview";
    renderTemplatePreview(template, preview, "template-thumbnail", `card-${template.id}-`);
    preview.querySelector(".resume-paper").setAttribute("aria-hidden", "true");
    const previewButton = document.createElement("button");
    previewButton.type = "button";
    previewButton.className = "template-card-preview-action";
    previewButton.setAttribute("aria-label", `Preview ${template.name} template`);
    previewButton.addEventListener("click", (event) =>
      openTemplatePreview(template.id, event.currentTarget));
    preview.append(previewButton);

    const content = document.createElement("div");
    content.className = "template-card-content";
    const titleRow = document.createElement("div");
    titleRow.className = "template-card-title";
    titleRow.append(
      Object.assign(document.createElement("h2"), { textContent: template.name }),
      Object.assign(document.createElement("button"), {
        type: "button",
        className: "button button-quiet template-preview-action",
        textContent: "Preview",
      }),
    );
    titleRow.lastElementChild.setAttribute("aria-label", `Preview ${template.name} template`);
    titleRow.lastElementChild.addEventListener("click", (event) =>
      openTemplatePreview(template.id, event.currentTarget));

    const description = document.createElement("p");
    description.textContent = template.description;
    const categories = document.createElement("ul");
    categories.className = "template-tags";
    template.categories.forEach((category) => {
      const tag = document.createElement("li");
      tag.textContent = category;
      categories.append(tag);
    });
    const useButton = document.createElement("button");
    useButton.type = "button";
    useButton.className = "button button-primary template-use-card";
    useButton.textContent = "Use template";
    useButton.addEventListener("click", () => applyTemplate(template.id));
    content.append(titleRow, description, categories, useButton);
    card.append(preview, content);
    return card;
  }

  function renderGallery() {
    const query = search.value.trim().toLocaleLowerCase();
    const category = categoryFilter.value;
    const visible = templates.filter((template) => {
      const searchable = [template.name, template.description, ...template.categories, ...template.tags]
        .join(" ").toLocaleLowerCase();
      return searchable.includes(query) && (!category || template.categories.includes(category));
    });
    visible.sort((left, right) => sortSelect.value === "alphabetical"
      ? left.name.localeCompare(right.name)
      : left.recommended - right.recommended);
    results.replaceChildren(...visible.map((template) => {
      if (!cardCache.has(template.id)) cardCache.set(template.id, createCard(template));
      return cardCache.get(template.id);
    }));
    document.querySelector("#template-result-count").textContent =
      `${visible.length} of ${templates.length} templates`;
    document.querySelector("#template-empty").hidden = visible.length > 0;
  }

  search.addEventListener("input", renderGallery);
  categoryFilter.addEventListener("change", renderGallery);
  sortSelect.addEventListener("change", renderGallery);
  document.querySelector("#template-reset").addEventListener("click", () => {
    search.value = "";
    categoryFilter.value = "";
    sortSelect.value = "recommended";
    renderGallery();
    search.focus();
  });
  document.querySelector("#template-dialog-close").addEventListener("click", () => dialog.close());
  dialogSelect.addEventListener("change", () => openTemplatePreview(dialogSelect.value));
  dialog.addEventListener("close", () => {
    if (dialogOpener?.isConnected) dialogOpener.focus();
    dialogOpener = undefined;
  });
  document.querySelector("#template-use-button").addEventListener("click", (event) => {
    applyTemplate(event.currentTarget.dataset.template);
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  document.querySelector("#template-count").textContent =
    `${templates.length} ${templates.length === 1 ? "template" : "templates"}`;
  renderGallery();
}
