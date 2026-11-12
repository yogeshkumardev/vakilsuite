"use client";

import { useState } from "react";
import { draftsApi } from "@/lib/api/drafts";
import { jobsApi } from "@/lib/api/jobs";

export function DraftToolbar({ draftId }: { draftId: string }) {
    const [isExporting, setIsExporting] = useState(false);
    const [exportFormat, setExportFormat] = useState<"pdf" | "docx" | null>(null);

    const handleExport = async (format: "pdf" | "docx") => {
        try {
            setIsExporting(true);
            setExportFormat(format);
            const res = await draftsApi.triggerExport(draftId, format);
            const jobId = res.job_id;

            // Poll for job completion
            const interval = setInterval(async () => {
                const jobRes = await jobsApi.getStatus(jobId);
                const status = jobRes.status;
                if (status === "completed") {
                    clearInterval(interval);
                    const result = jobRes.result;
                    if (!result || typeof result.export_id !== "string") {
                        throw new Error("Invalid export result");
                    }
                    const exportId = result.export_id;
                    const downloadRes = await draftsApi.getExportDownload(exportId);
                    // Trigger download
                    window.open(downloadRes.url, "_blank");
                    setIsExporting(false);
                    setExportFormat(null);
                } else if (status === "failed") {
                    clearInterval(interval);
                    alert("Export failed");
                    setIsExporting(false);
                    setExportFormat(null);
                }
            }, 2000);
        } catch (error) {
            console.error("Export failed", error);
            setIsExporting(false);
            setExportFormat(null);
        }
    };

    return (
        <div className="flex items-center gap-3 bg-white p-3 border-b border-slate-200">
            <span className="text-sm font-medium text-slate-700">Actions:</span>
            <button
                onClick={() => handleExport("pdf")}
                disabled={isExporting}
                className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
            >
                {isExporting && exportFormat === "pdf" ? "Exporting PDF..." : "Export as PDF"}
            </button>
            <button
                onClick={() => handleExport("docx")}
                disabled={isExporting}
                className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
            >
                {isExporting && exportFormat === "docx" ? "Exporting DOCX..." : "Export as DOCX"}
            </button>
        </div>
    );
}
