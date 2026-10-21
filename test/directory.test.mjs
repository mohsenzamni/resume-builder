import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";
import { jobRoles } from "../src/main/resources/static/job-roles.js";

const directoryPath = pathToFileURL(
  new URL("../src/main/resources/static/directory.js", import.meta.url).pathname,
).href;
const html = await readFile(
  new URL("../src/main/resources/static/directory.html", import.meta.url),
  "utf8",
);
let dom;
let importNumber = 0;

test("curated role guides have unique slugs, guidance, and example terms", () => {
  const slugs = jobRoles.map((role) => role.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.equal(jobRoles.length, 12);
  for (const role of jobRoles) {
    assert.ok(role.title);
    assert.ok(role.category);
    assert.ok(role.focus.length > 0);
    assert.ok(role.keywords.length > 0);
    assert.ok(role.suggestedSections.length > 0);
    assert.ok(role.suggestedSections.every((section) =>
      ["experience", "education", "projects", "certifications", "languages", "skills"].includes(section)));
    assert.match(role.exampleFrame, /\[[^\]]+\]/);
  }
});

test("directory search filters roles and builds safe editor links", async () => {
  dom = new JSDOM(html, {
    url: "http://localhost/directory.html",
    runScripts: "outside-only",
  });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  await import(`${directoryPath}?test=${++importNumber}`);

  assert.equal(document.querySelectorAll(".role-card").length, 12);
  const search = document.querySelector("#role-search");
  search.value = "patient care";
  search.dispatchEvent(new window.Event("input", { bubbles: true }));

  const cards = document.querySelectorAll(".role-card");
  assert.equal(cards.length, 1);
  assert.match(cards[0].querySelector("h2").textContent, /Registered Nurse/);
  assert.equal(cards[0].querySelector(".role-link").getAttribute("href"), "./?role=registered-nurse");

  search.value = "<script>";
  search.dispatchEvent(new window.Event("input", { bubbles: true }));
  assert.equal(document.querySelectorAll(".role-card").length, 0);
  assert.equal(document.querySelector("#role-result-count").textContent, "0 of 12 role guides");
  dom.window.close();
  delete globalThis.window;
  delete globalThis.document;
});
