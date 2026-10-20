import assert from "node:assert/strict";
import test from "node:test";
import {
  createEntry,
  createInitialResume,
  createEntryFor,
  ENTRY_FIELDS,
  ENTRY_TYPES,
  loadResume,
  normalizeResume,
  safeWebsiteUrl,
  STORAGE_KEY,
  websiteDisplayText,
} from "../src/main/resources/static/resume-data.js";

test("invalid JSON starts with a clean draft", () => {
  const storage = { getItem: () => "{" };
  assert.deepEqual(loadResume(storage), createInitialResume());
});

test("non-object drafts start with a clean draft", () => {
  for (const saved of [null, [], 5, "resume"]) {
    assert.deepEqual(normalizeResume(saved), createInitialResume());
  }
});

test("non-string fields fall back to empty strings", () => {
  const resume = normalizeResume({
    name: 5,
    summary: null,
    skills: ["design"],
    title: "Product Designer",
  });

  assert.equal(resume.name, "");
  assert.equal(resume.summary, "");
  assert.equal(resume.skills, "");
  assert.equal(resume.title, "Product Designer");
});

test("non-array optional sections become empty arrays", () => {
  const resume = normalizeResume({
    experience: {},
    education: "school",
    projects: null,
    certifications: false,
    languages: "English",
  });

  assert.deepEqual(resume.experience, []);
  assert.deepEqual(resume.education, []);
  assert.deepEqual(resume.projects, []);
  assert.deepEqual(resume.certifications, []);
  assert.deepEqual(resume.languages, []);
});

test("malformed entries are normalized to the supported string fields", () => {
  const resume = normalizeResume({
    experience: [null, "unexpected", { role: 5, organization: "Example Co.", start: null }],
    education: [{ role: "B.A.", unknown: "ignored" }],
    projects: [{ role: "Portfolio", organization: "Client", description: "Built it" }],
    certifications: [{ role: "Cloud Certificate", start: "2025" }],
    languages: [{ role: "English", proficiency: "Fluent", start: "ignored" }],
  });

  assert.deepEqual(resume.experience, [
    { role: "", organization: "", start: "", end: "", description: "" },
    { role: "", organization: "", start: "", end: "", description: "" },
    { role: "", organization: "Example Co.", start: "", end: "", description: "" },
  ]);
  assert.deepEqual(resume.education, [
    { role: "B.A.", organization: "", start: "", end: "", description: "" },
  ]);
  assert.deepEqual(resume.projects, [
    { role: "Portfolio", organization: "Client", start: "", end: "", description: "Built it" },
  ]);
  assert.deepEqual(resume.certifications, [
    { role: "Cloud Certificate", organization: "", start: "2025", end: "", description: "" },
  ]);
  assert.deepEqual(resume.languages, [{ role: "English", proficiency: "Fluent" }]);
});

test("new entries use the same schema as normalized entries", () => {
  assert.deepEqual(createEntry(), {
    role: "",
    organization: "",
    start: "",
    end: "",
    description: "",
  });
  assert.deepEqual(createEntryFor("languages"), { role: "", proficiency: "" });
});

test("initial drafts get independent arrays for every entry section", () => {
  const first = createInitialResume();
  const second = createInitialResume();
  first.projects.push(createEntryFor("projects"));
  assert.equal(second.projects.length, 0);
  assert.equal(second.certifications.length, 0);
  assert.equal(second.languages.length, 0);
});

test("draft loading reads the ResumeCraft storage key", () => {
  let requestedKey;
  const loaded = loadResume({
    getItem(key) {
      requestedKey = key;
      return JSON.stringify({ name: "Jordan Lee" });
    },
  });

  assert.equal(requestedKey, STORAGE_KEY);
  assert.equal(loaded.name, "Jordan Lee");
});

test("draft loading recovers when storage access throws", () => {
  assert.deepEqual(
    loadResume({
      getItem() {
        throw new Error("Storage unavailable");
      },
    }),
    createInitialResume(),
  );
});

test("website URLs allow HTTP(S) and normalize schemeless addresses", () => {
  assert.equal(safeWebsiteUrl("https://example.com/path"), "https://example.com/path");
  assert.equal(safeWebsiteUrl("linkedin.com/in/jordan"), "https://linkedin.com/in/jordan");
});

test("unsafe and malformed website URLs are rejected", () => {
  assert.equal(safeWebsiteUrl("javascript:alert(1)"), "");
  assert.equal(safeWebsiteUrl("ftp://example.com"), "");
  assert.equal(safeWebsiteUrl("https://[invalid"), "");
});

test("website display text is derived from the validated URL", () => {
  assert.equal(websiteDisplayText(" HTTPS://EXAMPLE.com/path "), "example.com/path");
  assert.equal(websiteDisplayText("javascript:alert(1)"), "");
});

test("entry fields are restricted to the shared schema", () => {
  assert.deepEqual(ENTRY_FIELDS.experience, [
    "role",
    "organization",
    "start",
    "end",
    "description",
  ]);
  assert.deepEqual(ENTRY_FIELDS.languages, ["role", "proficiency"]);
  assert.deepEqual(ENTRY_TYPES, [
    "experience",
    "education",
    "projects",
    "certifications",
    "languages",
  ]);
});

test("template preferences normalize to supported templates", () => {
  assert.equal(normalizeResume({ template: "modern" }).template, "modern");
  assert.equal(normalizeResume({ template: "unknown" }).template, "classic");
});
