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

test("moving an entry updates preview, persists order, and focuses its next control", async () => {
  await openApp({
    experience: [
      { role: "Designer", organization: "First Company" },
      { role: "Researcher", organization: "Second Company" },
    ],
  });

  document.querySelector('[data-move="experience"][data-index="1"][data-direction="up"]').click();
  window.dispatchEvent(new window.Event("pagehide"));

  const preview = document.querySelector("#experience-preview").textContent;
  assert.ok(preview.indexOf("Researcher") < preview.indexOf("Designer"));
  assert.equal(
    document.activeElement,
    document.querySelector('[data-move="experience"][data-index="0"][data-direction="down"]'),
  );
  assert.deepEqual(
    JSON.parse(localStorage.getItem("resumecraft-draft-v1")).experience.map((entry) => entry.role),
    ["Researcher", "Designer"],
  );
});

test("reordering controls are disabled at the ends and cannot move past a boundary", async () => {
  await openApp({
    education: [
      { role: "B.A.", organization: "First School" },
      { role: "M.A.", organization: "Second School" },
    ],
  });

  const upButton = document.querySelector(
    '[data-move="education"][data-index="0"][data-direction="up"]',
  );
  const downButton = document.querySelector(
    '[data-move="education"][data-index="1"][data-direction="down"]',
  );
  assert.equal(upButton.disabled, true);
  assert.equal(downButton.disabled, true);

  upButton.disabled = false;
  upButton.click();
  downButton.disabled = false;
  downButton.click();

  assert.deepEqual(
    [...document.querySelectorAll("#education-preview .resume-entry strong")].map(
      (entry) => entry.textContent,
    ),
    ["B.A.", "M.A."],
  );
});

test("projects can be created, edited, reordered, removed, previewed, and saved", async () => {
  await openApp();

  document.querySelector('[data-add="projects"]').click();
  const project = document.querySelector("#projects-list .entry-card");
  const fields = {
    role: "Open Source Portfolio",
    organization: "Personal",
    start: "2024",
    end: "Present",
    description: "Built a searchable portfolio for independent designers.",
  };
  for (const [key, value] of Object.entries(fields)) {
    const input = project.querySelector(`[data-key="${key}"]`);
    input.value = value;
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
  }

  document.querySelector('[data-add="projects"]').click();
  const second = document.querySelectorAll("#projects-list .entry-card")[1];
  second.querySelector('[data-key="role"]').value = "Research Library";
  second.querySelector('[data-key="role"]').dispatchEvent(
    new window.Event("input", { bubbles: true }),
  );
  document.querySelector('[data-move="projects"][data-index="1"][data-direction="up"]').click();
  window.dispatchEvent(new window.Event("pagehide"));

  const titles = [...document.querySelectorAll("#projects-preview .resume-entry strong")].map(
    (entry) => entry.textContent,
  );
  assert.deepEqual(titles, ["Research Library", "Open Source Portfolio"]);
  assert.match(document.querySelector("#projects-preview").textContent, /searchable portfolio/);
  assert.deepEqual(
    JSON.parse(localStorage.getItem("resumecraft-draft-v1")).projects.map((entry) => entry.role),
    titles,
  );

  document.querySelector('[data-remove="projects"][data-index="0"]').click();
  assert.equal(document.querySelectorAll("#projects-list .entry-card").length, 1);
  assert.doesNotMatch(document.querySelector("#projects-preview").textContent, /Research Library/);
});

test("certifications and languages are optional, editable sections", async () => {
  await openApp();

  assert.equal(document.querySelector("#certifications-preview-section").hidden, true);
  assert.equal(document.querySelector("#languages-preview-section").hidden, true);

  document.querySelector('[data-add="certifications"]').click();
  const certification = document.querySelector("#certifications-list .entry-card");
  certification.querySelector('[data-key="role"]').value = "Cloud Practitioner";
  certification.querySelector('[data-key="role"]').dispatchEvent(
    new window.Event("input", { bubbles: true }),
  );
  certification.querySelector('[data-key="organization"]').value = "Example Academy";
  certification.querySelector('[data-key="organization"]').dispatchEvent(
    new window.Event("input", { bubbles: true }),
  );

  document.querySelector('[data-add="languages"]').click();
  const language = document.querySelector("#languages-list .entry-card");
  language.querySelector('[data-key="role"]').value = "Spanish";
  language.querySelector('[data-key="role"]').dispatchEvent(
    new window.Event("input", { bubbles: true }),
  );
  language.querySelector('[data-key="proficiency"]').value = "Conversational";
  language.querySelector('[data-key="proficiency"]').dispatchEvent(
    new window.Event("input", { bubbles: true }),
  );

  assert.match(document.querySelector("#certifications-preview").textContent, /Cloud Practitioner/);
  assert.match(document.querySelector("#certifications-preview").textContent, /Example Academy/);
  assert.match(document.querySelector("#languages-preview").textContent, /Spanish/);
  assert.match(document.querySelector("#languages-preview").textContent, /Conversational/);
});

test("template selection updates the preview and persists locally", async () => {
  await openApp();
  const selector = document.querySelector("#template-select");
  selector.value = "modern";
  selector.dispatchEvent(new window.Event("change", { bubbles: true }));
  window.dispatchEvent(new window.Event("pagehide"));

  assert.equal(document.querySelector("#resume-preview").dataset.template, "modern");
  assert.equal(JSON.parse(localStorage.getItem("resumecraft-draft-v1")).template, "modern");

  await openApp(JSON.parse(localStorage.getItem("resumecraft-draft-v1")));
  assert.equal(document.querySelector("#template-select").value, "modern");
  assert.equal(document.querySelector("#resume-preview").dataset.template, "modern");
});

test("paper size selector configures letter or A4 print dimensions", async () => {
  await openApp();
  const selector = document.querySelector("#paper-size-select");
  selector.value = "a4";
  selector.dispatchEvent(new window.Event("change", { bubbles: true }));
  assert.match(document.querySelector("#print-page-style").textContent, /size:\s*A4/);

  selector.value = "letter";
  selector.dispatchEvent(new window.Event("change", { bubbles: true }));
  assert.match(document.querySelector("#print-page-style").textContent, /size:\s*letter/);
});
