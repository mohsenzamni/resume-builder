import { ENTRY_FIELDS, ENTRY_TYPES, websiteDisplayText } from "./resume-data.js";

const sectionTitles = {
  experience: "Experience",
  education: "Education",
  projects: "Projects",
  certifications: "Certifications",
  languages: "Languages",
};

function createEntryContent(entry) {
  const heading = {
    columns: [
      { text: entry.role || entry.organization, style: "entryTitle", width: "*" },
      { text: [entry.start, entry.end].filter(Boolean).join(" – "), style: "entryDates", width: "auto" },
    ],
    columnGap: 12,
    margin: [0, 0, 0, 3],
  };
  const content = [heading];
  if (entry.role && entry.organization) {
    content.push({ text: entry.organization, style: "entryOrganization" });
  }
  if (entry.proficiency) {
    content.push({ text: entry.proficiency, style: "entryOrganization" });
  }
  if (entry.description.trim()) {
    content.push({ text: entry.description, style: "body" });
  }
  return { stack: content, margin: [0, 0, 0, 11] };
}

function createSection(title, content) {
  return {
    stack: [
      { text: title.toUpperCase(), style: "sectionTitle", margin: [0, 16, 0, 7] },
      ...content,
    ],
  };
}

export function createResumePdfDefinition(resume, paperSize = "letter") {
  if (resume.template !== "classic") {
    throw new Error("Direct PDF download currently supports the Classic template only.");
  }
  const content = [];
  const name = resume.name.trim();
  const title = resume.title.trim();
  if (name) content.push({ text: name, style: "name" });
  if (title) content.push({ text: title, style: "professionalTitle" });

  const contacts = [
    resume.email.trim(),
    resume.phone.trim(),
    resume.location.trim(),
    websiteDisplayText(resume.website),
  ].filter(Boolean);
  if (contacts.length) content.push({ text: contacts.join("   •   "), style: "contact" });

  if (resume.summary.trim()) {
    content.push(createSection("Profile", [{ text: resume.summary.trim(), style: "body" }]));
  }

  ENTRY_TYPES.forEach((type) => {
    const entries = resume[type].filter((entry) =>
      ENTRY_FIELDS[type].some((field) => entry[field].trim()),
    );
    if (entries.length) {
      content.push(createSection(sectionTitles[type], entries.map(createEntryContent)));
    }
  });

  const skills = resume.skills.split(/[,\n]/).map((skill) => skill.trim()).filter(Boolean);
  if (skills.length) {
    content.push(createSection("Skills", [{ text: skills.join("   •   "), style: "body" }]));
  }

  if (!content.length) {
    throw new Error("Add resume details before downloading a PDF.");
  }

  return {
    pageSize: paperSize === "a4" ? "A4" : "LETTER",
    pageMargins: [42, 42, 42, 42],
    content,
    defaultStyle: { font: "Roboto", fontSize: 9.5, color: "#293246", lineHeight: 1.25 },
    styles: {
      name: { fontSize: 24, bold: true, color: "#202b42", margin: [0, 0, 0, 4] },
      professionalTitle: { fontSize: 12, bold: true, color: "#515bcf", margin: [0, 0, 0, 8] },
      contact: { fontSize: 8.5, color: "#69748a", margin: [0, 0, 0, 13] },
      sectionTitle: { fontSize: 9, bold: true, characterSpacing: 0.8, color: "#303c55" },
      entryTitle: { fontSize: 10, bold: true, color: "#29354d" },
      entryDates: { fontSize: 8, color: "#667085", alignment: "right" },
      entryOrganization: { fontSize: 9, bold: true, color: "#515bcf", margin: [0, 0, 0, 2] },
      body: { fontSize: 9, color: "#586479", lineHeight: 1.3 },
    },
    footer: (currentPage, pageCount) => ({
      text: `${currentPage} / ${pageCount}`,
      alignment: "center",
      fontSize: 8,
      color: "#7b8496",
      margin: [0, 16, 0, 0],
    }),
  };
}

function createFilename(name) {
  const safeName = String(name ?? "")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/^\.+|\.+$/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  return `${safeName || "resumecraft-resume"}.pdf`;
}

export async function downloadResumePdf(pdfMake, resume, paperSize = "letter") {
  if (!pdfMake || typeof pdfMake.createPdf !== "function") {
    throw new Error("The PDF exporter is unavailable.");
  }
  const definition = createResumePdfDefinition(resume, paperSize);
  await pdfMake.createPdf(definition).download(createFilename(resume.name));
}
