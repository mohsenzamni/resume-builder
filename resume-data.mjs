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
const entryFields = ["role", "organization", "start", "end", "description"];

export function createInitialResume() {
  return { ...initialResume, experience: [], education: [] };
}

export function createEntry() {
  return Object.fromEntries(entryFields.map((field) => [field, ""]));
}

function normalizeEntries(entries) {
  return entries.map((entry) => {
    const source = entry && typeof entry === "object" && !Array.isArray(entry) ? entry : {};
    return Object.fromEntries(
      entryFields.map((field) => [field, typeof source[field] === "string" ? source[field] : ""]),
    );
  });
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
