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
  experience: [],
  education: [],
};

const textFields = Object.keys(initialResume).filter((field) => typeof initialResume[field] === "string");
export const ENTRY_FIELDS = ["role", "organization", "start", "end", "description"];
export const ENTRY_TYPES = ["experience", "education"];

export function createInitialResume() {
  return { ...initialResume, experience: [], education: [] };
}

export function createEntry() {
  return Object.fromEntries(ENTRY_FIELDS.map((field) => [field, ""]));
}

function normalizeEntries(entries) {
  return entries.map((entry) => {
    const source = entry && typeof entry === "object" && !Array.isArray(entry) ? entry : {};
    return Object.fromEntries(
      ENTRY_FIELDS.map((field) => [
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
    experience: Array.isArray(source.experience) ? normalizeEntries(source.experience) : [],
    education: Array.isArray(source.education) ? normalizeEntries(source.education) : [],
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
