export type PdfErrorCode = "invalid" | "empty" | "encrypted" | "readFailed";

export class PdfInputError extends Error {
  constructor(public readonly code: PdfErrorCode) { super(code); }
}

export async function inspectPdf(bytes: ArrayBuffer): Promise<number> {
  if (!bytes.byteLength) throw new PdfInputError("empty");
  const { PDFDocument } = await import("pdf-lib");
  try {
    // Inspect encryption before touching pages; encrypted documents are never merged.
    const document = await PDFDocument.load(bytes, { ignoreEncryption: true });
    if (document.isEncrypted) throw new PdfInputError("encrypted");
    const count = document.getPageCount();
    if (!count) throw new PdfInputError("empty");
    return count;
  } catch (error) {
    if (error instanceof PdfInputError) throw error;
    throw new PdfInputError("invalid");
  }
}

export async function mergePdfs(files: readonly Blob[]): Promise<Uint8Array> {
  if (files.length < 2) throw new Error("At least two PDFs are required");
  const { PDFDocument } = await import("pdf-lib");
  const output = await PDFDocument.create();
  for (const file of files) {
    const source = await PDFDocument.load(await file.arrayBuffer());
    const pages = await output.copyPages(source, source.getPageIndices());
    for (const page of pages) output.addPage(page);
  }
  return output.save();
}
