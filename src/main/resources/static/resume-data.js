export const STORAGE_KEY = "resumecraft-draft-v1";

const initialResume = {
  name: "",
  title: "",
  email: "",
  phone: "",
  location: "",
  website: "",
  summary: "",
  skills: "",
  template: "classic",
  experience: [],
  education: [],
  projects: [],
  certifications: [],
  languages: [],
};

const textFields = Object.keys(initialResume).filter((field) => typeof initialResume[field] === "string");
export const ENTRY_FIELDS = {
  experience: ["role", "organization", "start", "end", "description"],
  education: ["role", "organization", "start", "end", "description"],
  projects: ["role", "organization", "start", "end", "description"],
  certifications: ["role", "organization", "start", "end", "description"],
  languages: ["role", "proficiency"],
};
export const ENTRY_TYPES = Object.keys(ENTRY_FIELDS);
export const TEMPLATES = ["classic", "modern"];

export function createInitialResume() {
  return {
    ...initialResume,
    ...Object.fromEntries(ENTRY_TYPES.map((type) => [type, []])),
  };
}

export function createEntry() {
  return createEntryFor("experience");
}

export function createEntryFor(type) {
  return Object.fromEntries((ENTRY_FIELDS[type] ?? []).map((field) => [field, ""]));
}

function normalizeEntries(entries, type) {
  return entries.map((entry) => {
    const source = entry && typeof entry === "object" && !Array.isArray(entry) ? entry : {};
    return Object.fromEntries(
      ENTRY_FIELDS[type].map((field) => [
        field,
        typeof source[field] === "string" ? source[field] : "",
      ]),
    );
  });
}

export function safeWebsiteUrl(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";

  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

export function websiteDisplayText(value) {
  const safeUrl = safeWebsiteUrl(value);
  if (!safeUrl) return "";

  const url = new URL(safeUrl);
  return `${url.host}${url.pathname}${url.search}${url.hash}`;
}

export function normalizeResume(saved) {
  const source = saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};

  return {
    ...createInitialResume(),
    ...Object.fromEntries(
      textFields.map((field) => [
        field,
        typeof source[field] === "string" ? source[field] : initialResume[field],
      ]),
    ),
    template: TEMPLATES.includes(source.template) ? source.template : initialResume.template,
    ...Object.fromEntries(
      ENTRY_TYPES.map((type) => [
        type,
        Array.isArray(source[type]) ? normalizeEntries(source[type], type) : [],
      ]),
    ),
  };
}

export function loadResume(storage) {
  try {
    const draftStorage = storage ?? globalThis.localStorage;
    return normalizeResume(JSON.parse(draftStorage.getItem(STORAGE_KEY)));
  } catch {
    return createInitialResume();
  }
}
