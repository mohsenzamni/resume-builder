import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { afterEach, test } from "node:test";
import { pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";
import { templateCategories, templates } from "../src/main/resources/static/templates.js";

const galleryPath = pathToFileURL(
  new URL("../src/main/resources/static/templates-gallery.js", import.meta.url).pathname,
).href;
const html = await readFile(new URL("../src/main/resources/static/templates.html", import.meta.url), "utf8");
let dom;
let importNumber = 0;

async function openGallery(draft = {}) {
  dom = new JSDOM(html, {
    url: "http://localhost/templates.html",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  dom.window.localStorage.setItem("resumecraft-draft-v1", JSON.stringify(draft));
  const dialog = dom.window.document.querySelector("#template-preview-dialog");
  dialog.showModal = () => dialog.setAttribute("open", "");
  dialog.close = () => dialog.removeAttribute("open");
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = dom.window.localStorage;
  await import(`${galleryPath}?test=${++importNumber}`);
}

afterEach(() => {
  dom?.window.close();
  delete globalThis.window;
  delete globalThis.document;
  delete globalThis.localStorage;
});

test("template registry provides unique, searchable metadata and supported categories", () => {
  const ids = templates.map((template) => template.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const template of templates) {
    assert.ok(template.name);
    assert.ok(template.description);
    assert.ok(template.categories.length);
    assert.ok(template.tags.length);
    assert.ok(Number.isFinite(template.recommended));
    assert.ok(template.categories.every((category) => templateCategories.includes(category)));
  }
});

test("gallery displays registered templates and searches metadata", async () => {
  await openGallery();
  assert.equal(document.querySelectorAll(".template-card").length, templates.length);
  assert.equal(document.querySelector("#template-count").textContent, "5 templates");
  assert.equal(document.querySelector("#template-sample-note").hidden, false);

  const search = document.querySelector("#template-search");
  search.value = "ats-friendly";
  search.dispatchEvent(new window.Event("input", { bubbles: true }));
  assert.equal(document.querySelectorAll(".template-card").length, 1);
  assert.equal(document.querySelector(".template-card h2").textContent, "Minimal");

  search.value = "no-such-template";
  search.dispatchEvent(new window.Event("input", { bubbles: true }));
  assert.equal(document.querySelectorAll(".template-card").length, 0);
  assert.equal(document.querySelector("#template-empty").hidden, false);
});

test("categories combine with search, sorting, and reset", async () => {
  await openGallery();
  const category = document.querySelector("#template-category");
  category.value = "Executive";
  category.dispatchEvent(new window.Event("change", { bubbles: true }));
  assert.deepEqual(
    [...document.querySelectorAll(".template-card h2")].map((heading) => heading.textContent),
    ["Executive", "Compact"],
  );

  const search = document.querySelector("#template-search");
  search.value = "serif";
  search.dispatchEvent(new window.Event("input", { bubbles: true }));
  assert.deepEqual(
    [...document.querySelectorAll(".template-card h2")].map((heading) => heading.textContent),
    ["Executive"],
  );

  category.value = "";
  category.dispatchEvent(new window.Event("change", { bubbles: true }));
  document.querySelector("#template-sort").value = "alphabetical";
  document.querySelector("#template-sort").dispatchEvent(new window.Event("change", { bubbles: true }));
  assert.equal(document.querySelector(".template-card h2").textContent, "Classic");

  document.querySelector("#template-reset").click();
  assert.equal(document.querySelectorAll(".template-card").length, templates.length);
  assert.equal(category.value, "");
  assert.equal(search.value, "");
});

test("preview uses the saved resume and switches templates without changing the draft", async () => {
  const draft = {
    name: "Actual Resume",
    title: "Researcher",
    email: "person@example.com",
    summary: "Saved summary.",
    template: "modern",
  };
  await openGallery(draft);
  assert.equal(document.querySelector("#template-sample-note").hidden, true);
  document.querySelector(".template-preview-action").click();

  const dialog = document.querySelector("#template-preview-dialog");
  assert.equal(dialog.open, true);
  assert.equal(dialog.querySelector("#template-dialog-preview [data-preview='name']").textContent, "Actual Resume");
  assert.equal(dialog.querySelector("#template-dialog-preview .resume-paper").dataset.template, "classic");

  const select = document.querySelector("#template-dialog-select");
  select.value = "executive";
  select.dispatchEvent(new window.Event("change", { bubbles: true }));
  assert.equal(dialog.querySelector("#template-dialog-preview .resume-paper").dataset.template, "executive");
  assert.equal(dialog.querySelector("#template-dialog-preview [data-preview='summary']").textContent, "Saved summary.");
  assert.equal(JSON.parse(localStorage.getItem("resumecraft-draft-v1")).template, "modern");

  document.querySelector("#template-dialog-close").click();
  assert.equal(dialog.open, false);
});
