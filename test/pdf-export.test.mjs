import assert from "node:assert/strict";
import test from "node:test";
import { createInitialResume } from "../src/main/resources/static/resume-data.js";
import { createResumePdfDefinition, downloadResumePdf } from "../src/main/resources/static/pdf-export.js";

test("Classic PDF definition includes only entered resume content and requested paper size", () => {
  const resume = {
    ...createInitialResume(),
    name: "Alex Example",
    title: "Product Designer",
    email: "alex@example.com",
    website: "alex.example.com",
    summary: "A verified summary.",
    experience: [{
      role: "Product Designer",
      organization: "Example Company",
      start: "2022",
      end: "Present",
      description: "Designed and tested a real feature.",
    }],
    skills: "Research, Prototyping",
  };

  const definition = createResumePdfDefinition(resume, "a4");
  const serializedContent = JSON.stringify(definition.content);
  assert.equal(definition.pageSize, "A4");
  assert.deepEqual(definition.pageMargins, [42, 42, 42, 42]);
  assert.equal(definition.defaultStyle.font, "Roboto");
  assert.match(serializedContent, /Alex Example|Product Designer|Example Company/);
  assert.match(serializedContent, /A verified summary|Designed and tested a real feature/);
  assert.match(serializedContent, /Research.*Prototyping/);
  assert.doesNotMatch(serializedContent, /Your Name|Professional Title/);
});

test("PDF definition rejects empty content and non-Classic templates", () => {
  assert.throws(() => createResumePdfDefinition(createInitialResume()), /Add resume details/);
  assert.throws(
    () => createResumePdfDefinition({ ...createInitialResume(), name: "Alex", template: "modern" }),
    /Classic template only/,
  );
});

test("long resume entries can flow across page boundaries", () => {
  const resume = {
    ...createInitialResume(),
    name: "Alex Example",
    experience: [{
      role: "Product Designer",
      organization: "Example Company",
      start: "2022",
      end: "Present",
      description: "A verified detail. ".repeat(400),
    }],
  };
  const definition = createResumePdfDefinition(resume);
  const entry = definition.content
    .flatMap((section) => section.stack ?? [])
    .find((item) => item.stack?.[0]?.columns);

  assert.ok(entry);
  assert.equal(entry.unbreakable, undefined);
  assert.match(JSON.stringify(entry), /A verified detail/);
});

test("PDF download requests a sanitized filename from the browser generator", async () => {
  const resume = { ...createInitialResume(), name: "../Alex: Example" };
  let call;
  const pdfMake = {
    createPdf(definition) {
      return {
        async download(filename) {
          call = { definition, filename };
        },
      };
    },
  };

  await downloadResumePdf(pdfMake, resume);
  assert.equal(call.filename, "Alex-Example.pdf");
  assert.equal(call.definition.pageSize, "LETTER");
});
