"use client";

import { PDFDocument } from "pdf-lib";
import { ChangeEvent, useRef, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, FilePlus2, Trash2 } from "lucide-react";
import { DocumentUploader } from "./DocumentUploader";

const MAX_PAGES = 20;
const MAX_INPUT_BYTES = 50 * 1024 * 1024;
const ACCEPTED_IMAGES = new Set(["image/jpeg", "image/png"]);

type CapturePage = { id: string; file: File; previewUrl: string };

function asCapturePages(files: FileList | null): CapturePage[] {
    if (!files) return [];
    const selected = Array.from(files);
    if (!selected.length) return [];
    if (selected.some((file) => !ACCEPTED_IMAGES.has(file.type))) {
        throw new Error("Use JPG or PNG images. For a digital PDF, choose Upload file instead.");
    }
    if (selected.some((file) => file.size <= 0 || file.size > MAX_INPUT_BYTES)) {
        throw new Error("Each image must be non-empty and no larger than 50 MB.");
    }
    return selected.map((file) => ({ id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) }));
}

async function buildPdf(pages: CapturePage[]): Promise<File> {
    const pdf = await PDFDocument.create();
    for (const page of pages) {
        const bytes = await page.file.arrayBuffer();
        const image = page.file.type === "image/png"
            ? await pdf.embedPng(bytes)
            : await pdf.embedJpg(bytes);
        const sheet = pdf.addPage([595.28, 841.89]); // A4 points
        const scaled = image.scaleToFit(sheet.getWidth() - 36, sheet.getHeight() - 36);
        sheet.drawImage(image, {
            x: (sheet.getWidth() - scaled.width) / 2,
            y: (sheet.getHeight() - scaled.height) / 2,
            width: scaled.width,
            height: scaled.height,
        });
    }
    const bytes = await pdf.save();
    if (bytes.byteLength > MAX_INPUT_BYTES) {
        throw new Error("The generated PDF exceeds 50 MB. Remove pages or use smaller images.");
    }
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    return new File([buffer], `Camera-scan-${new Date().toISOString().slice(0, 10)}.pdf`, {
        type: "application/pdf",
    });
}

export function BrowserScanPdfBuilder({ caseId }: { caseId: string }) {
    const cameraInput = useRef<HTMLInputElement>(null);
    const filesInput = useRef<HTMLInputElement>(null);
    const [pages, setPages] = useState<CapturePage[]>([]);
    const [pendingPdf, setPendingPdf] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [building, setBuilding] = useState(false);

    function addPages(event: ChangeEvent<HTMLInputElement>) {
        try {
            const additions = asCapturePages(event.target.files);
            if (pages.length + additions.length > MAX_PAGES) {
                additions.forEach((page) => URL.revokeObjectURL(page.previewUrl));
                throw new Error(`You can arrange up to ${MAX_PAGES} pages at a time.`);
            }
            setPages((existing) => [...existing, ...additions]);
            setPendingPdf(null);
            setError(null);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Could not add these images.");
        } finally {
            event.target.value = "";
        }
    }

    function remove(index: number) {
        setPages((existing) => {
            const page = existing[index];
            if (page) URL.revokeObjectURL(page.previewUrl);
            return existing.filter((_, current) => current !== index);
        });
        setPendingPdf(null);
    }

    function move(index: number, direction: -1 | 1) {
        setPages((existing) => {
            const target = index + direction;
            if (target < 0 || target >= existing.length) return existing;
            const next = [...existing];
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
        setPendingPdf(null);
    }

    async function preparePdf() {
        if (!pages.length || building) return;
        setBuilding(true);
        setError(null);
        try {
            setPendingPdf(await buildPdf(pages));
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Could not create a PDF.");
        } finally {
            setBuilding(false);
        }
    }

    return (
        <section aria-labelledby="camera-import-heading" className="space-y-4 border-t border-slate-200 pt-5">
            <div>
                <h3 id="camera-import-heading" className="text-sm font-semibold text-slate-800">Camera scan or image pages</h3>
                <p className="mt-1 text-sm text-slate-600">Capture/import JPG or PNG pages, arrange them, then create a local PDF. Your pages are not sent anywhere until you explicitly upload the PDF.</p>
            </div>
            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => cameraInput.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-600">
                    <Camera size={17} aria-hidden="true" /> Use camera
                </button>
                <button type="button" onClick={() => filesInput.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-600">
                    <FilePlus2 size={17} aria-hidden="true" /> Add image pages
                </button>
                <input ref={cameraInput} className="sr-only" type="file" accept="image/jpeg,image/png" capture="environment" onChange={addPages} />
                <input ref={filesInput} className="sr-only" type="file" accept="image/jpeg,image/png" multiple onChange={addPages} />
            </div>
            {pages.length > 0 && <ol aria-label="PDF page order" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pages.map((page, index) => <li key={page.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={page.previewUrl} alt={`Page ${index + 1} preview`} className="h-36 w-full rounded object-contain bg-white" />
                    <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                        <span className="font-medium text-slate-700">Page {index + 1}</span>
                        <span className="text-slate-500">{(page.file.size / 1024 / 1024).toFixed(1)} MB</span>
                    </div>
                    <div className="mt-2 flex gap-1">
                        <button type="button" aria-label={`Move page ${index + 1} earlier`} disabled={index === 0} onClick={() => move(index, -1)} className="rounded p-2 text-slate-700 hover:bg-slate-200 disabled:opacity-40"><ChevronLeft size={18} /></button>
                        <button type="button" aria-label={`Move page ${index + 1} later`} disabled={index === pages.length - 1} onClick={() => move(index, 1)} className="rounded p-2 text-slate-700 hover:bg-slate-200 disabled:opacity-40"><ChevronRight size={18} /></button>
                        <button type="button" aria-label={`Remove page ${index + 1}`} onClick={() => remove(index)} className="ml-auto rounded p-2 text-red-700 hover:bg-red-50"><Trash2 size={18} /></button>
                    </div>
                </li>)}
            </ol>}
            {pages.length > 0 && <button type="button" disabled={building} onClick={() => void preparePdf()} className="min-h-11 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 disabled:opacity-60">{building ? "Creating PDF…" : `Create PDF from ${pages.length} page${pages.length === 1 ? "" : "s"}`}</button>}
            {pendingPdf && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3"><p className="text-sm font-medium text-emerald-900">PDF ready: {pendingPdf.name}</p><p className="mt-1 text-sm text-emerald-800">Choose it below to upload. No AI processing will start.</p><DocumentUploader caseId={caseId} origin="web_camera" prefilledFile={pendingPdf} /></div>}
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        </section>
    );
}
