import assert from "node:assert/strict";
import test from "node:test";
import {
  createEntry,
  createInitialResume,
  loadResume,
  normalizeResume,
  STORAGE_KEY,
} from "../resume-data.mjs";

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

test("non-array experience and education values become empty arrays", () => {
  const resume = normalizeResume({ experience: {}, education: "school" });

  assert.deepEqual(resume.experience, []);
  assert.deepEqual(resume.education, []);
});

test("malformed entries are normalized to the supported string fields", () => {
  const resume = normalizeResume({
    experience: [null, "unexpected", { role: 5, organization: "Example Co.", start: null }],
    education: [{ role: "B.A.", unknown: "ignored" }],
  });

  assert.deepEqual(resume.experience, [
    { role: "", organization: "", start: "", end: "", description: "" },
    { role: "", organization: "", start: "", end: "", description: "" },
    { role: "", organization: "Example Co.", start: "", end: "", description: "" },
  ]);
  assert.deepEqual(resume.education, [
    { role: "B.A.", organization: "", start: "", end: "", description: "" },
  ]);
});

test("new entries use the same schema as normalized entries", () => {
  assert.deepEqual(createEntry(), {
    role: "",
    organization: "",
    start: "",
    end: "",
    description: "",
  });
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
