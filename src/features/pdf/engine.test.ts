import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { inspectPdf, mergePdfs, PdfInputError } from "./engine";

async function fixture(sizes: [number, number][]) {
  const pdf = await PDFDocument.create();
  for (const size of sizes) pdf.addPage(size);
  return new Uint8Array(await pdf.save());
}

test("merges real PDFs in chosen order, preserving page dimensions and rotations", async () => {
  const a = await fixture([[200, 300], [400, 250]]);
  const pdf = await PDFDocument.create();
  const { degrees } = await import("pdf-lib");
  pdf.addPage([600, 800]).setRotation(degrees(90));
  const b = new Uint8Array(await pdf.save());
  assert.equal(await inspectPdf(a.buffer), 2);
  const output = await PDFDocument.load(await mergePdfs([new Blob([b]), new Blob([a])]));
  assert.deepEqual(output.getPages().map(page => [page.getWidth(), page.getHeight(), page.getRotation().angle]), [[600, 800, 90], [200, 300, 0], [400, 250, 0]]);
});

test("rejects empty, malformed and encrypted documents", async () => {
  await assert.rejects(inspectPdf(new ArrayBuffer(0)), (error: unknown) => error instanceof PdfInputError && error.code === "empty");
  await assert.rejects(inspectPdf(new TextEncoder().encode("not a pdf").buffer), (error: unknown) => error instanceof PdfInputError && error.code === "invalid");
  // A real PDF encryption dictionary is enough to exercise pdf-lib's encryption guard.
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const { PDFName } = await import("pdf-lib");
  pdf.context.trailerInfo.Encrypt = pdf.context.register(pdf.context.obj({ Filter: PDFName.of("Standard"), V: 1, R: 2 }));
  const encrypted = new Uint8Array(await pdf.save());
  await assert.rejects(inspectPdf(encrypted.buffer), (error: unknown) => error instanceof PdfInputError && error.code === "encrypted");
});

test("requires two documents and does not return partial output on invalid input", async () => {
  const good = new Blob([await fixture([[200, 300]])]);
  await assert.rejects(mergePdfs([good]));
  await assert.rejects(mergePdfs([good, new Blob(["broken"])]));
});
