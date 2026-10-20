import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { afterEach, test } from "node:test";
import { pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";

const appPath = pathToFileURL(
  new URL("../src/main/resources/static/app.js", import.meta.url).pathname,
).href;
const html = await readFile(new URL("../src/main/resources/static/index.html", import.meta.url), "utf8");
let dom;
let importNumber = 0;

async function openApp(draft = {}) {
  dom = new JSDOM(html, {
    url: "http://localhost/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  dom.window.localStorage.setItem("resumecraft-draft-v1", JSON.stringify(draft));
  dom.window.confirm = () => true;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = dom.window.localStorage;
  await import(`${appPath}?test=${++importNumber}`);
}

afterEach(() => {
  dom?.window.close();
  delete globalThis.window;
  delete globalThis.document;
  delete globalThis.localStorage;
});

test("adding an entry updates the preview and focuses the new entry", async () => {
  await openApp({
    experience: [{ role: "Designer", organization: "First Company" }],
  });

  document.querySelector('[data-add="experience"]').click();

  const cards = document.querySelectorAll("#experience-list .entry-card");
  assert.equal(cards.length, 2);
  assert.equal(document.activeElement, cards[1].querySelector("input"));
});

test("removing an entry updates preview and moves focus to a useful control", async () => {
  await openApp({
    experience: [
      { role: "Designer", organization: "First Company" },
      { role: "Researcher", organization: "Second Company" },
    ],
  });

  document.querySelector('[data-remove="experience"][data-index="0"]').click();

  assert.equal(document.querySelectorAll("#experience-list .entry-card").length, 1);
  assert.match(document.querySelector("#experience-preview").textContent, /Researcher/);
  assert.equal(
    document.activeElement,
    document.querySelector('[data-remove="experience"][data-index="0"]'),
  );
});

test("removing the final entry moves focus to Add and persists the empty list", async () => {
  await openApp({
    experience: [{ role: "Designer", organization: "First Company" }],
  });

  document.querySelector('[data-remove="experience"][data-index="0"]').click();
  window.dispatchEvent(new window.Event("pagehide"));

  assert.equal(document.activeElement, document.querySelector('[data-add="experience"]'));
  assert.deepEqual(
    JSON.parse(localStorage.getItem("resumecraft-draft-v1")).experience,
    [],
  );
});

test("clearing cancels a pending save and pagehide does not restore the draft", async () => {
  await openApp({ name: "Existing draft" });

  const nameInput = document.querySelector('[name="name"]');
  nameInput.value = "Unsaved change";
  nameInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  document.querySelector("#clear-button").click();
  window.dispatchEvent(new window.Event("pagehide"));

  assert.equal(document.querySelector('[data-preview="name"]').textContent, "Your Name");
  assert.equal(localStorage.getItem("resumecraft-draft-v1"), null);
});

test("form fields cannot overwrite structured resume entry arrays", async () => {
  await openApp({
    experience: [{ role: "Designer", organization: "First Company" }],
  });
  const extraField = document.createElement("input");
  extraField.name = "experience";
  extraField.value = "invalid replacement";
  document.querySelector("#resume-form").append(extraField);

  extraField.dispatchEvent(new window.Event("input", { bubbles: true }));
  window.dispatchEvent(new window.Event("pagehide"));

  assert.deepEqual(
    JSON.parse(localStorage.getItem("resumecraft-draft-v1")).experience,
    [{ role: "Designer", organization: "First Company", start: "", end: "", description: "" }],
  );
});

test("invalid entry actions do not mutate resume data", async () => {
  await openApp({
    experience: [{ role: "Designer", organization: "First Company" }],
  });
  const removeButton = document.querySelector('[data-remove="experience"]');
  removeButton.dataset.index = "-1";

  removeButton.click();
  const addButton = document.querySelector('[data-add="education"]');
  addButton.dataset.add = "invalid";
  addButton.click();

  assert.equal(document.querySelectorAll("#experience-list .entry-card").length, 1);
  assert.equal(document.querySelectorAll("#education-list .entry-card").length, 0);
});
