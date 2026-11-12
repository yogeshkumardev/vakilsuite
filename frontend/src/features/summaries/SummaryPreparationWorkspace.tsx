"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import { useChamberStore } from "@/store/chamber.store";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Surface } from "@/components/ui/Surface";
import { WorkspacePage } from "@/components/ui/WorkspacePage";
import { summariesApi } from "@/lib/api/summaries";
import { summaryFailureMayHaveQueuedWork, summaryFailureMessage } from "./summary-errors";

const button = "inline-flex min-h-11 items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold disabled:opacity-50";
const reasons: Record<string,string> = {
    eligible: "Ready for case summary",
    scanned_review_required: "OCR / transcription and lawyer review required",
    source_page_assignment_required: "Review text and original page assignments",
    upload_incomplete: "Finish or remove this pending/failed upload",
    unsupported_summary_source: "Upload this document as a PDF or supported image",
    source_unavailable: "Original file is unavailable. Re-upload or remove this document",
};
export function SummaryPreparationWorkspace({caseId}:{caseId:string}) {
    const generation = useAuthStore(s=>s.generation);
    const chamber = useChamberStore(s=>s.selected?.id);
    return <CaseSummary key={`${generation}:${chamber}:${caseId}`} caseId={caseId} scope={`${generation}:${chamber}`}/>;
}
function CaseSummary({caseId,scope}:{caseId:string;scope:string}) {
    const client=useQueryClient();
    const [language,setLanguage]=useState<"en-IN"|"hi-IN">("en-IN");
    const [confirmedFingerprint,setConfirmedFingerprint]=useState("");
    const [paidRetryConfirmed,setPaidRetryConfirmed]=useState(false);
    const sourceKey=["summary-source-candidates",scope,caseId];
    const runKey=["summary-runs",scope,caseId];
    const candidates=useQuery({queryKey:sourceKey,queryFn:()=>summariesApi.listSourceCandidates(caseId),retry:false});
    const runs=useQuery({queryKey:runKey,queryFn:()=>summariesApi.listRuns(caseId),refetchInterval:q=>q.state.data?.some(r=>r.status==="running")?3000:false});
    const sources=candidates.data??[];
    const fingerprint=JSON.stringify(sources.map(s=>[s.working_document_id,s.revision_id,s.revision_sha256,s.eligible]));
    const ready=sources.length>0&&sources.length<=50&&sources.every(s=>s.eligible&&s.revision_id&&s.revision_sha256&&s.original_document_id);
    const confirmed=ready&&confirmedFingerprint===fingerprint;
    const generate=useMutation({mutationFn:async()=>{
        if(!confirmed||candidates.isFetching||candidates.error)throw new Error("Confirm current document readiness first.");
        if(runs.isPending||runs.error||(retryingFailedRun&&!paidRetryConfirmed))throw new Error("Check the existing summary attempt and confirm any new provider charge before retrying.");
        const run=await summariesApi.prepare(caseId,
            sources.filter(s=>s.source_kind!=="original_pdf").map(s=>({working_document_id:s.working_document_id,revision_id:s.revision_id!,expected_revision_sha256:s.revision_sha256!})),
            sources.filter(s=>s.source_kind==="original_pdf").map(s=>({document_id:s.original_document_id!,file_version_id:s.revision_id!,sha256:s.revision_sha256!})),language);
        if(run.status==="pending")await summariesApi.submit(caseId,run.id);
        return run;
    },onSettled:async()=>{setPaidRetryConfirmed(false);await client.invalidateQueries({queryKey:runKey});}});
    const resume=useMutation({mutationFn:(runId:string)=>summariesApi.submit(caseId,runId),onSettled:async()=>{await client.invalidateQueries({queryKey:runKey});}});
    const busy=generate.isPending||resume.isPending;
    const processing=Boolean(runs.data?.some(run=>run.status==="running"));
    const retryingFailedRun=runs.data?.[0]?.status==="failed";
    const submitFailure=generate.error??resume.error;
    return <WorkspacePage className="space-y-6">
        <header className="space-y-2"><Link href={`/cases/${caseId}`} className="text-sm text-emerald-700 underline">Back to case overview</Link><h1 className="text-2xl font-semibold">Case Summary</h1><p className="max-w-3xl text-sm text-slate-600">Upload all case documents, review scanned text, then generate one summary for the complete case. Digital PDFs are read directly.</p></header>
        <ol aria-label="Case workflow" className="flex flex-wrap gap-3 text-sm"><li>1. Upload documents</li><li>2. Review scanned text</li><li>3. Generate &amp; approve summary</li><li>4. Generate &amp; review draft</li><li>5. Download approved draft</li></ol>
        <Surface as="section" variant="bordered" className="space-y-4 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Document readiness</h2><button className={button} disabled={candidates.isFetching||busy} onClick={()=>{setConfirmedFingerprint("");void candidates.refetch();}}>Refresh readiness</button></div>
            {candidates.isPending&&<p role="status">Checking uploads and reviewed sources…</p>}
            {candidates.error&&<Alert tone="danger" title="Could not check document readiness.">{candidates.error.message}</Alert>}
            {!candidates.isPending&&!sources.length&&<p>Upload your case documents to begin.</p>}
            <ul className="divide-y">{sources.map(s=><li key={s.working_document_id} className="flex flex-wrap items-start justify-between gap-3 py-3"><div className="min-w-0"><p className="break-words font-medium">{s.title}</p><p className="text-sm text-slate-600">{s.source_kind==="original_pdf"?"Digital PDF · no OCR or text review needed":s.reasons.map(r=>reasons[r]??r.replaceAll("_"," ")).join(" · ")}</p></div><div className="flex flex-wrap items-center gap-2"><Badge tone={s.eligible?"success":"warning"}>{s.eligible?"Ready":"Action needed"}</Badge>{s.original_document_id&&<Link className={button} href={`/cases/${caseId}/documents/${s.original_document_id}`}>{s.eligible?"Open original":"Open document"}</Link>}</div></li>)}</ul>
            <Link className={button} href={`/cases/${caseId}?tab=documents`}>Upload / manage documents</Link>
            {!ready&&sources.length>0&&<Alert tone="warning" title="Complete document preparation first.">Every active upload must be ready. Review scanned text, finish failed uploads, or remove files that do not belong to this case. Maximum 50 sources per summary.</Alert>}
        </Surface>
        <Surface as="section" variant="bordered" className="space-y-4 p-4"><h2 className="text-lg font-semibold">Generate case summary</h2><label className="block text-sm">Summary language <select className="ml-2 min-h-11 rounded border px-3" disabled={busy} value={language} onChange={e=>setLanguage(e.target.value as "en-IN"|"hi-IN")}><option value="en-IN">English</option><option value="hi-IN">हिन्दी</option></select></label>
            <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={confirmed} disabled={!ready||candidates.isFetching||!!candidates.error||busy} onChange={e=>setConfirmedFingerprint(e.target.checked?fingerprint:"")}/>All required documents are uploaded, and I have reviewed the scanned text. Use this complete document set.</label>
            <p className="text-sm text-slate-600">Generation uses the configured AI provider and budget. Leaving this page will not cancel a queued job. Uploading files alone does not generate a summary.</p>
            {retryingFailedRun&&<label className="flex items-start gap-3 text-sm text-amber-900"><input type="checkbox" className="mt-1" checked={paidRetryConfirmed} disabled={busy||processing} onChange={event=>setPaidRetryConfirmed(event.target.checked)}/>I understand the previous attempt may have been billed, and a new attempt may incur another provider charge even if it fails.</label>}
            <button className={`${button} bg-indigo-600 text-white`} disabled={!confirmed||busy||processing||candidates.isFetching||!!candidates.error||runs.isPending||!!runs.error||(retryingFailedRun&&!paidRetryConfirmed)} onClick={()=>generate.mutate()}>{generate.isPending?"Starting summary…":processing?"Summary is processing…":retryingFailedRun?"Try generating again":"Generate Case Summary"}</button>
            {submitFailure&&<Alert tone="danger" title="Summary could not be started.">{summaryFailureMessage(submitFailure)}{summaryFailureMayHaveQueuedWork(submitFailure)&&" Refresh status before retrying; an existing job may already have been accepted."}</Alert>}
        </Surface>
        <section className="space-y-3"><h2 className="text-lg font-semibold">Summary history</h2>{runs.error&&<Alert tone="danger" title="Unable to load summary status.">{runs.error.message}<button className={button} onClick={()=>void runs.refetch()}>Refresh status</button></Alert>}{runs.isPending&&<p role="status">Loading summary status…</p>}{runs.data?.length===0&&<p>No case summary generated yet.</p>}
            {runs.data?.map(run=><Surface as="article" variant="bordered" key={run.id} className="space-y-3 p-4"><div className="flex flex-wrap gap-2"><Badge tone={run.status==="completed"?"success":run.status==="failed"?"danger":"info"}>{run.status==="completed"?"Approved":run.status.replaceAll("_"," ")}</Badge><span className="text-sm">{run.source_count} documents · {new Date(run.created_at).toLocaleString("en-IN")}</span></div>
                {run.status==="pending"?<button className={button} disabled={!confirmed||busy} onClick={()=>resume.mutate(run.id)}>Resume pending generation</button>:run.status==="running"?<div><p role="status">Queued / processing. Status is saved; you can safely return later.</p><button className={button} disabled={busy||!confirmed} onClick={()=>resume.mutate(run.id)}>Retry queue delivery</button><p className="text-xs text-slate-500">Use if the queue connection failed. This resumes the same request; it does not authorize a second provider call.</p></div>:run.status==="stale"?<p>Documents or the chamber policy changed. Prepare the current document set and generate a new summary.</p>:<Link className={button} href={`/cases/${caseId}/summary/${run.id}`}>{run.status==="pending_review"?"Review summary":run.status==="completed"?"Open approved summary & draft options":"View result / error"}</Link>}
            </Surface>)}
        </section>
    </WorkspacePage>;
}
