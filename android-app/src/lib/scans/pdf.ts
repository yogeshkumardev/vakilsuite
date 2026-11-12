import { PDFDocument } from "pdf-lib";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as FS from "expo-file-system/legacy";
import { randomUUID } from "expo-crypto";
import { assertScope, getScan, saveScan, scanDirectory, withScanLock } from "./library";
import type { Quality, ScanPage } from "./types";

export async function editScan(owner: string, chamber: string, id: string, pages: ScanPage[], quality: Quality, name: string) {
  return withScanLock(id, async () => {
    const scan = await getScan(owner, chamber, id);
    if (!["draft", "paused"].includes(scan.status) || scan.documentId) throw new Error("An upload has already started. This PDF cannot be edited.");
    const trimmed = name.trim().replace(/\.pdf$/i, "").trim();
    if (!trimmed || trimmed.length > 150) throw new Error("Enter a file name of 1 to 150 characters.");
    if (!pages.length || new Set(pages.map((p) => p.uri)).size !== pages.length || pages.some((p) => !scan.pages.some((original) => original.uri === p.uri && original.originalIndex === p.originalIndex))) throw new Error("Invalid pages.");
    const changed = quality !== scan.quality || pages.length !== scan.pages.length || pages.some((p, i) => p.uri !== scan.pages[i]?.uri);
    let uri = scan.uri;
    if (changed) {
      const pdf = await PDFDocument.create();
      if (quality === "original") {
        const original = await PDFDocument.load(await FS.readAsStringAsync(`${scanDirectory(owner, chamber, id)}original.pdf`, { encoding: FS.EncodingType.Base64 }));
        const copied = await pdf.copyPages(original, pages.map((page) => page.originalIndex));
        copied.forEach((page) => pdf.addPage(page));
      } else for (const page of pages) {
        assertScope(owner, chamber);
        let source = page.uri;
        let temporary: string | undefined;
        try {
          const context = ImageManipulator.manipulate(page.uri);
          try {
            const maxEdge = quality === "compact" ? 1800 : 2500;
            const scale = Math.min(1, maxEdge / Math.max(page.width, page.height));
            context.resize({ width: Math.round(page.width * scale), height: Math.round(page.height * scale) });
            const rendered = await context.renderAsync();
            try { temporary = (await rendered.saveAsync({ format: SaveFormat.JPEG, compress: quality === "compact" ? 0.72 : 0.9 })).uri; }
            finally { rendered.release(); }
            source = temporary;
          } finally { context.release(); }
          const image = await pdf.embedJpg(await FS.readAsStringAsync(source, { encoding: FS.EncodingType.Base64 }));
          const sheet = pdf.addPage([image.width * 0.24, image.height * 0.24]);
          sheet.drawImage(image, { x: 0, y: 0, width: sheet.getWidth(), height: sheet.getHeight() });
        } finally { if (temporary) await FS.deleteAsync(temporary, { idempotent: true }); }
      }
      uri = `${scanDirectory(owner, chamber, id)}${randomUUID()}.pdf`;
      await FS.writeAsStringAsync(uri, await pdf.saveAsBase64(), { encoding: FS.EncodingType.Base64 });
    }
    try {
      const info = await FS.getInfoAsync(uri);
      if (!info.exists || !info.size) throw new Error("Could not save PDF.");
      if (info.size > 50 * 1024 * 1024) throw new Error("PDF exceeds 50 MB. Choose a smaller quality setting or fewer pages.");
      await saveScan({ ...scan, pages, quality, uri, status: "draft", fileName: `${trimmed}.pdf`, fileSize: info.size, pageCount: pages.length });
    } catch (error) {
      if (uri !== scan.uri) await FS.deleteAsync(uri, { idempotent: true });
      throw error;
    }
    if (uri !== scan.uri && scan.uri !== `${scanDirectory(owner, chamber, id)}original.pdf`) await FS.deleteAsync(scan.uri, { idempotent: true }).catch(() => undefined);
  });
}
