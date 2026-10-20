import {
  ENTRY_FIELDS,
  ENTRY_TYPES,
  safeWebsiteUrl,
  websiteDisplayText,
} from "./resume-data.js";

function createElement(document, tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function createSection(document, id, title, idPrefix) {
  const section = createElement(document, "section", "resume-section");
  section.id = `${idPrefix}${id}-preview-section`;
  section.append(createElement(document, "h2", "", title));
  const content = createElement(document, "div", "", "");
  if (id !== "summary") content.id = `${idPrefix}${id}-preview`;
  section.append(content);
  return section;
}

function renderEntries(document, container, entries, fields) {
  const visibleEntries = entries.filter((entry) => fields.some((field) => entry[field]));
  container.hidden = visibleEntries.length === 0;
  const content = container.lastElementChild;
  content.replaceChildren();

  visibleEntries.forEach((entry) => {
    const item = createElement(document, "article", "resume-entry");
    const heading = createElement(document, "div", "resume-entry-heading");
    heading.append(createElement(document, "strong", "", entry.role || entry.organization));
    const dateRange = [entry.start, entry.end].filter(Boolean).join(" – ");
    if (dateRange) heading.append(createElement(document, "span", "resume-entry-dates", dateRange));
    item.append(heading);

    if (entry.role && entry.organization) {
      item.append(createElement(document, "p", "resume-entry-subtitle", entry.organization));
    }
    if (entry.proficiency) {
      item.append(createElement(document, "p", "resume-entry-subtitle", entry.proficiency));
    }
    if (entry.description) {
      const description = createElement(document, "p", "resume-entry-description");
      description.style.whiteSpace = "pre-line";
      description.textContent = entry.description;
      item.append(description);
    }
    content.append(item);
  });
}

export function createResumePreview(document, resume, { className = "", idPrefix = "" } = {}) {
  const paper = createElement(document, "article", `resume-paper ${className}`.trim());
  paper.dataset.template = resume.template;
  paper.setAttribute("aria-label", "Resume preview");

  const header = createElement(document, "header", "resume-header");
  const name = createElement(document, "h1", "", resume.name || "Your Name");
  name.dataset.preview = "name";
  const title = createElement(document, "p", "resume-title", resume.title || "Professional Title");
  title.dataset.preview = "title";
  header.append(name, title);

  const contact = createElement(document, "div", "contact-line");
  for (const field of ["email", "phone", "location"]) {
    const item = createElement(document, "span", "", resume[field]);
    item.dataset.preview = field;
    contact.append(item);
  }
  const safeUrl = safeWebsiteUrl(resume.website);
  const website = createElement(document, "a", "", websiteDisplayText(resume.website));
  website.dataset.preview = "website";
  if (safeUrl) {
    website.href = safeUrl;
    website.target = "_blank";
    website.rel = "noopener noreferrer";
  } else {
    website.hidden = true;
  }
  contact.append(website);
  header.append(contact);
  paper.append(header);

  const summary = createSection(document, "summary", "Profile", idPrefix);
  summary.hidden = !resume.summary.trim();
  const summaryContent = summary.lastElementChild;
  const summaryText = createElement(document, "p", "resume-summary", resume.summary);
  summaryText.dataset.preview = "summary";
  summaryContent.append(summaryText);
  paper.append(summary);

  const sectionTitles = {
    experience: "Experience",
    education: "Education",
    projects: "Projects",
    certifications: "Certifications",
    languages: "Languages",
  };
  ENTRY_TYPES.forEach((type) => {
    const section = createSection(document, type, sectionTitles[type], idPrefix);
    renderEntries(document, section, resume[type], ENTRY_FIELDS[type]);
    paper.append(section);
  });

  const skillsSection = createSection(document, "skills", "Skills", idPrefix);
  const skills = resume.skills.split(/[,\n]/).map((skill) => skill.trim()).filter(Boolean);
  skillsSection.hidden = skills.length === 0;
  const skillsContent = skillsSection.lastElementChild;
  skillsContent.id = `${idPrefix}skills-preview`;
  skillsContent.className = "skills-preview";
  skills.forEach((skill) => skillsContent.append(createElement(document, "span", "skill-chip", skill)));
  paper.append(skillsSection);
  return paper;
}
