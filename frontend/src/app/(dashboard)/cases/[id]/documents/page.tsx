"use client";

import { useParams } from "next/navigation";
import { DocumentUploader } from "@/components/documents/DocumentUploader";
import { BrowserScanPdfBuilder } from "@/components/documents/BrowserScanPdfBuilder";
import { DocumentList } from "@/components/documents/DocumentList";
import { PageHeader } from "@/components/ui/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { WorkspacePage } from "@/components/ui/WorkspacePage";
import Link from "next/link";

export default function CaseDocumentsPage() {
    const params = useParams();
    const caseId = params.id as string;

    return (
        <WorkspacePage className='space-y-5'>
            <PageHeader title="Documents" description="Upload case documents and view original files. AI processing is not enabled yet." actions={<Link href={`/cases/${caseId}/working-documents`} className="inline-flex min-h-10 items-center rounded-md border border-emerald-700 px-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">Open draft workspace</Link>} />
            {/* Upload section */}
            <Surface className='p-5'>
                <h2 className='text-sm font-semibold text-slate-800 mb-4'>
                    Upload Document
                </h2>
                <DocumentUploader caseId={caseId} />
                <BrowserScanPdfBuilder caseId={caseId} />
            </Surface>

            {/* Document list */}
            <Surface className='p-5'>
                <h2 className='text-sm font-semibold text-slate-800 mb-4'>
                    Documents
                </h2>
                <DocumentList caseId={caseId} />
            </Surface>
        </WorkspacePage>
    );
}
