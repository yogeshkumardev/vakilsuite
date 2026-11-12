import type { PersistedEditorDocument } from "@/features/editor-core/serialization";
import { apiClient, type DownloadedFile } from "./client";

export type ExportFormat = "docx" | "pdf";

export interface RenderExportInput {
    title: string;
    file_name?: string;
    output_format: ExportFormat;
    document: PersistedEditorDocument;
}

export const exportsApi = {
    render: async (input: RenderExportInput): Promise<DownloadedFile> => {
        const file = await apiClient.postFile("/exports/render", input);
        const ext = `.${input.output_format}`;
        let name = file.fileName?.trim() || (input.file_name || input.title || "legal-draft");
        if (!name.toLowerCase().endsWith(ext)) {
            name = `${name.replace(/\.[a-zA-Z0-9]+$/, "")}${ext}`;
        }
        const mimeType = input.output_format === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        const typedBlob = file.blob.type === mimeType ? file.blob : new Blob([file.blob], { type: mimeType });
        return {
            blob: typedBlob,
            fileName: name,
        };
    },
};

export function saveDownloadedFile(file: DownloadedFile): void {
    const url = URL.createObjectURL(file.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.fileName;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => {
        anchor.remove();
        URL.revokeObjectURL(url);
    }, 5000);
}
