"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Select } from "@/components/ui/Field";
import { WorkspacePage } from "@/components/ui/WorkspacePage";
import { courtDraftsApi, type CourtDraft } from "@/lib/api/court-drafts";
import { summariesApi } from "@/lib/api/summaries";
import { useAuthStore } from "@/store/auth.store";
import { useChamberStore } from "@/store/chamber.store";

type FormState = {
    district: string; crimeNumber: string; crimeYear: string; policeStation: string; sections: string; jailDistrict: string; custodySince: string; occurrenceDate: string;
    applicant: string; applicantRelation: string; applicantRelationName: string; applicantAddress: string;
    deponent: string; deponentAge: string; deponentRelation: string; deponentRelationName: string; deponentAddress: string; religion: string; occupation: string;
    capacity: "applicant" | "representative"; relationship: string; advocate: string; enrollment: string;
};

const initial: FormState = {
    district: "", crimeNumber: "", crimeYear: "", policeStation: "", sections: "", jailDistrict: "", custodySince: "", occurrenceDate: "",
    applicant: "", applicantRelation: "", applicantRelationName: "", applicantAddress: "", deponent: "", deponentAge: "", deponentRelation: "", deponentRelationName: "", deponentAddress: "", religion: "", occupation: "", capacity: "applicant", relationship: "", advocate: "", enrollment: "",
};

export function Bail483DraftWorkspace({ caseId, summaryRunId }: { caseId: string; summaryRunId?: string }) {
    const scope = useAuthStore((state) => state.generation);
    const chamber = useChamberStore((state) => state.selected?.id);
    const readiness = useQuery({ queryKey: ["draft-readiness", caseId, scope, chamber], queryFn: () => courtDraftsApi.readiness(caseId) });
    const summaries = useQuery({ queryKey: ["summary-runs", caseId, scope, chamber], queryFn: () => summariesApi.listRuns(caseId), retry: false });
    const [form, setForm] = useState<Partial<FormState>>({});
    const [draft, setDraft] = useState<CourtDraft | null>(null);
    const [showValidation, setShowValidation] = useState(false);
    const [profileForm, setProfileForm] = useState({ enrollment_number: "", office_address_line1: "", mobile_number: "", chamber_number: "" });
    const approved = summaryRunId
        ? summaries.data?.find((run) => run.id === summaryRunId && run.status === "completed")
        : summaries.data?.find((run) => run.status === "completed");
    const detail = useQuery({ queryKey: ["draft-summary", caseId, approved?.id, scope, chamber], queryFn: () => summariesApi.getRun(caseId, approved!.id), enabled: Boolean(approved), retry: false });
    const prefill = readiness.data?.prefill as Record<string, unknown> | undefined;
    const caseValues = (prefill?.case ?? {}) as Record<string, string | null>;
    const applicant = Array.isArray(prefill?.applicants) ? prefill.applicants[0] as Record<string, string> | undefined : undefined;
    const advocate = (prefill?.advocate ?? {}) as Record<string, string | null>;
    const effectiveForm: FormState = {
        ...initial,
        district: caseValues.district || "", crimeNumber: caseValues.case_crime_number || "", crimeYear: caseValues.case_crime_year || "", policeStation: caseValues.police_station || "", sections: caseValues.offence_sections || "", jailDistrict: caseValues.jail_district || "", custodySince: caseValues.custody_since || "", applicant: applicant?.full_name || "", advocate: advocate.full_name || "", enrollment: advocate.enrollment_or_aor || "",
        ...form,
    };
    const create = useMutation({
        mutationFn: () => courtDraftsApi.create(caseId, {
            draft_type: "regular_bail_483_bnss", summary_run_id: approved!.id, expected_summary_hash: detail.data!.result_hash!,
            court_code: "allahabad_hc", bench_code: "allahabad", filing_mode: "physical", pleading_language: "en", affidavit_mode: "separate",
            case: { district: effectiveForm.district, case_crime_number: effectiveForm.crimeNumber, case_crime_year: effectiveForm.crimeYear, police_station: effectiveForm.policeStation, offence_sections: effectiveForm.sections, jail_district: effectiveForm.jailDistrict, custody_since: effectiveForm.custodySince, occurrence_date: effectiveForm.occurrenceDate },
            applicants: [{ id: "applicant_1", full_name: effectiveForm.applicant, relation_label: effectiveForm.applicantRelation, relation_name: effectiveForm.applicantRelationName, address: effectiveForm.applicantAddress }],
            deponents: [{ full_name: effectiveForm.deponent, age_years: effectiveForm.deponentAge, relation_label: effectiveForm.deponentRelation, relation_name: effectiveForm.deponentRelationName, address: effectiveForm.deponentAddress, religion: effectiveForm.religion, occupation: effectiveForm.occupation, capacity: effectiveForm.capacity, relationship_to_applicant: effectiveForm.relationship, for_applicant_ids: ["applicant_1"] }],
            advocate: { full_name: effectiveForm.advocate, enrollment_or_aor: effectiveForm.enrollment }, verification: {}, annexures: [], case_specific_affidavit_paragraphs: "",
        }),
        onSuccess: setDraft,
    });
    const saveProfile = useMutation({
        mutationFn: async () => {
            await courtDraftsApi.updateProfile({ office_address_line1: profileForm.office_address_line1 || null, mobile_number: profileForm.mobile_number || null, chamber_number: profileForm.chamber_number || null });
            return courtDraftsApi.updateCourtRegistration("allahabad_hc", { enrollment_number: profileForm.enrollment_number || null });
        },
        onSuccess: () => readiness.refetch(),
    });
    const set = (key: keyof FormState) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));
    const submit = () => { setShowValidation(true); if (approved && detail.data?.result_hash && !summaries.isError && !detail.isError) create.mutate(); };

    return <WorkspacePage variant="form" className="space-y-6">
        <header><Link href={approved ? `/cases/${caseId}/summary/${approved.id}` : `/cases/${caseId}/drafts`} className="text-sm font-medium text-indigo-700 underline underline-offset-2">Back to {approved ? "reviewed summary" : "drafts"}</Link><h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Regular Bail Draft — Section 483 BNSS</h1><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Allahabad physical filing. The index uses only originals in the approved summary, ordered by Annexure-01 style numbers in their uploaded filenames. The draft is reviewable; creation does not call an AI provider.</p></header>
        {readiness.isError ? <Alert tone="danger" title="Blueprint could not be checked">{readiness.error.message}</Alert> : null}
        {readiness.data ? <Alert tone={readiness.data.missing_case_fields.length ? "warning" : "success"} title={`Approved blueprint · Tier ${readiness.data.tier}`}><p>{readiness.data.banner}</p><ul className="mt-2 list-disc pl-5">{readiness.data.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></Alert> : null}
        {readiness.data?.missing_profile_fields.length ? <section className="rounded-xl border border-amber-200 bg-amber-50 p-4"><h2 className="text-base font-semibold text-slate-900">Save your advocate details once</h2><p className="mt-1 text-sm text-slate-700">Only the missing professional details are requested. They will be reused for future Allahabad drafts.</p><div className="mt-4 grid gap-3 md:grid-cols-2"><Field label="Allahabad enrollment number" htmlFor="profile-enrollment"><Input id="profile-enrollment" value={profileForm.enrollment_number} onChange={(event) => setProfileForm((current) => ({ ...current, enrollment_number: event.target.value }))} /></Field><Field label="Office address" htmlFor="profile-office"><Input id="profile-office" value={profileForm.office_address_line1} onChange={(event) => setProfileForm((current) => ({ ...current, office_address_line1: event.target.value }))} /></Field><Field label="Mobile number" htmlFor="profile-mobile"><Input id="profile-mobile" value={profileForm.mobile_number} onChange={(event) => setProfileForm((current) => ({ ...current, mobile_number: event.target.value }))} /></Field><Field label="Chamber number" htmlFor="profile-chamber"><Input id="profile-chamber" value={profileForm.chamber_number} onChange={(event) => setProfileForm((current) => ({ ...current, chamber_number: event.target.value }))} /></Field></div>{saveProfile.error ? <p role="alert" className="mt-3 text-sm text-red-700">{saveProfile.error.message}</p> : null}<button type="button" onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending} className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-indigo-600 px-4 text-sm font-semibold text-indigo-700 disabled:opacity-50">{saveProfile.isPending ? "Saving…" : "Save advocate details"}</button></section> : null}
        {summaries.isPending ? <p role="status" className="text-sm text-slate-600">Loading approved summary status…</p> : null}
        {summaries.isError ? <Alert tone="danger" title="Summary status could not be loaded"><p>We could not verify the approved summary. Reload this page and try again; no draft will be created until the check succeeds.</p><button type="button" onClick={() => summaries.refetch()} className="mt-3 underline">Retry summary check</button></Alert> : null}
        {!summaries.isPending && !summaries.isError && !approved ? <Alert tone="warning" title="Approved summary required">{summaryRunId ? "This summary is no longer approved or is stale. Return to it and approve a current summary before creating this draft." : "Approve a current case summary before creating this draft."}</Alert> : null}
        {approved && detail.isPending ? <p role="status" className="text-sm text-slate-600">Loading the approved summary version…</p> : null}
        {approved && detail.isError ? <Alert tone="danger" title="Approved summary could not be verified"><p>Reload this page and try again; no draft will be created until the approved summary hash is available.</p><button type="button" onClick={() => detail.refetch()} className="mt-3 underline">Retry summary verification</button></Alert> : null}
        <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); submit(); }} noValidate>
            {showValidation && !summaries.isPending && !summaries.isError && !approved ? <Alert tone="danger" title="Approved summary required">Return to the summary and approve a current version before generating.</Alert> : null}
            <section className="grid gap-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5 md:grid-cols-2">
                <section className="space-y-3"><h2 className="text-base font-semibold text-slate-900">Court and case</h2><p className="text-sm text-slate-600">Allahabad bench · physical filing</p><FieldList fields={[["district", "District"], ["crimeNumber", "Case crime number"], ["crimeYear", "Case crime year"], ["policeStation", "Police station"], ["sections", "Offence sections"], ["jailDistrict", "Jail district"], ["custodySince", "Custody since"], ["occurrenceDate", "Occurrence date"]]} form={effectiveForm} set={set} showValidation={showValidation} /></section>
                <section className="space-y-3"><h2 className="text-base font-semibold text-slate-900">Applicant</h2><FieldList fields={[["applicant", "Full name"], ["applicantRelation", "Relation label"], ["applicantRelationName", "Relation name"], ["applicantAddress", "Address"]]} form={effectiveForm} set={set} showValidation={showValidation} /></section>
                <section className="space-y-3"><h2 className="text-base font-semibold text-slate-900">Deponent</h2><FieldList fields={[["deponent", "Full name"], ["deponentAge", "Age"], ["deponentRelation", "Relation label"], ["deponentRelationName", "Relation name"], ["deponentAddress", "Address"], ["religion", "Religion"], ["occupation", "Occupation"], ["relationship", "Relationship to applicant"]]} form={effectiveForm} set={set} showValidation={showValidation} /></section>
                <section className="space-y-3"><h2 className="text-base font-semibold text-slate-900">Affidavit and advocate</h2><Field label="Deponent capacity" htmlFor="capacity" required hint="This version produces one separate affidavit per deponent."><Select id="capacity" value={effectiveForm.capacity} onChange={set("capacity")}><option value="applicant">Applicant is the deponent</option><option value="representative">Relative / representative is the deponent</option></Select></Field><FieldList fields={[["advocate", "Advocate full name"], ["enrollment", "Enrollment / AOR number"]]} form={effectiveForm} set={set} showValidation={showValidation} /></section>
            </section>
            {create.error ? <Alert tone="danger" title="Draft could not be created">{create.error.message}</Alert> : null}
            <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" disabled={create.isPending || summaries.isPending || summaries.isError || !approved || detail.isPending || detail.isError || !detail.data?.result_hash}>{create.isPending ? "Creating reviewable draft…" : "Create reviewable draft"}</button>
        </form>
        {draft ? <DraftPreview caseId={caseId} draft={draft} onUpdated={setDraft} /> : null}
    </WorkspacePage>;
}

function FieldList({ fields, form, set }: { fields: [keyof FormState, string][]; form: FormState; set: (key: keyof FormState) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void; showValidation: boolean }) {
    return <>{fields.map(([key, label]) => <Field key={key} label={label} htmlFor={key} hint="Leave blank only if this must remain a lawyer-confirmation placeholder."><Input id={key} value={form[key]} onChange={set(key)} /></Field>)}</>;
}

function DraftPreview({ caseId, draft, onUpdated }: { caseId: string; draft: CourtDraft; onUpdated: (draft: CourtDraft) => void }) {
    type Paragraph = { role: string; text: string; editable?: boolean; citations?: Array<{ source_document_id?: string; document_id?: string; page_number?: number }> };
    const components = Array.isArray(draft.content.components) ? draft.content.components as Array<{ code: string; paragraphs?: Paragraph[] }> : [];
    const annexures = Array.isArray(draft.content.annexure_sources) ? draft.content.annexure_sources as Array<{ document_id: string; annexure_number: string }> : [];
    const annexureByDocument = new Map(annexures.map((item) => [item.document_id, item.annexure_number]));
    const coverage = draft.content.affidavit_coverage as { selected_findings?: number; generated_paragraphs?: number } | undefined;
    const [edits, setEdits] = useState<Record<string, string>>({});
    const [generationJobId, setGenerationJobId] = useState<string | null>(null);
    const router = useRouter();
    const completedGenerationId = useRef<string | null>(null);
    const save = useMutation({
        mutationFn: () => courtDraftsApi.update(caseId, draft.id, { expected_content_hash: draft.content_hash, edits: Object.entries(edits).map(([key, text]) => {
            const [component_code, paragraphIndex] = key.split(":");
            return { component_code, paragraph_index: Number(paragraphIndex), text };
        }) }),
        onSuccess: (updated) => { setEdits({}); onUpdated(updated); },
    });
    const generate = useMutation({ mutationFn: () => courtDraftsApi.startGeneration(caseId, draft.id, { expected_content_hash: draft.content_hash, idempotency_key: crypto.randomUUID() }), onSuccess: (job) => setGenerationJobId(job.id) });
    const generationJob = useQuery({ queryKey: ["court-draft-generation", generationJobId], queryFn: () => courtDraftsApi.getJob(generationJobId!), enabled: Boolean(generationJobId), refetchInterval: (query) => ["queued", "running"].includes(query.state.data?.status ?? "") ? 1500 : false });
    const openWordEditor = useMutation({ mutationFn: () => courtDraftsApi.openWordEditor(caseId, draft.id), onSuccess: ({ working_document_id }) => router.push(`/cases/${caseId}/working-documents/${working_document_id}`) });
    const [editorError, setEditorError] = useState<string | null>(null);
    const checks = Array.isArray(draft.compliance_report?.checks) ? draft.compliance_report.checks as Array<{ code: string; status: string; expected: string; found: string; source: string; locator: string }> : [];
    useEffect(() => {
        if (generationJob.data?.status === "succeeded" && completedGenerationId.current !== generationJob.data.id) {
            completedGenerationId.current = generationJob.data.id;
            void courtDraftsApi.get(caseId, draft.id).then(async (updated) => {
                onUpdated(updated);
                if (updated.status === "stale") throw new Error("The summary changed. Create a current draft before opening the editor.");
                const { working_document_id } = await courtDraftsApi.openWordEditor(caseId, draft.id);
                router.push(`/cases/${caseId}/working-documents/${working_document_id}`);
            }).catch((error: unknown) => {
                setEditorError(error instanceof Error ? error.message : "Could not open the Word editor. Please try again.");
            });
        }
    }, [generationJob.data?.id, generationJob.data?.status, caseId, draft.id, onUpdated, router]);

    return <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold text-slate-900">Structured draft v{draft.version}</h2><Badge tone={draft.status === "stale" ? "danger" : "warning"}>{draft.status === "stale" ? "Stale summary" : "Needs lawyer review"}</Badge></div>
        <p className="mt-1 text-sm text-slate-600">This saved draft is linked to its approved summary version and court-rule snapshot.{coverage ? ` Affidavit: ${coverage.generated_paragraphs ?? 0} cited paragraphs from ${coverage.selected_findings ?? 0} selected findings.` : ""}</p>
        {draft.status === "stale" ? <Alert tone="warning" title="Summary changed">This draft is not safe to file because its approved summary changed. Create a new draft from the current reviewed summary.</Alert> : <section className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50 p-4">
            <p className="text-sm font-medium text-indigo-950">Gemini drafts editable facts, grounds, prayer and cited affidavit paragraphs. Court rules and boilerplate stay deterministic.</p>
            {!draft.model ? <button type="button" onClick={() => generate.mutate()} disabled={generate.isPending || Boolean(generationJobId)} className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{generate.isPending ? "Submitting Gemini generation…" : generationJobId ? "Generation in progress" : "Generate draft prose and affidavit"}</button> : null}
            {generate.error ? <p role="alert" className="mt-2 text-sm text-red-700">{generate.error.message}</p> : null}
            {generationJob.data ? <p role="status" className="mt-2 text-sm text-indigo-900">Generation status: {generationJob.data.status}{generationJob.data.status === "succeeded" ? " — opening the formatted Word editor…" : null}{generationJob.data.status === "failed" ? ` — ${generationJob.data.error_message ?? "Please retry after checking provider policy."}` : null}</p> : null}
            {editorError ? <p role="alert" className="mt-2 text-sm text-red-700">{editorError} <button type="button" className="underline" onClick={() => { setEditorError(null); void openWordEditor.mutateAsync().catch(() => undefined); }}>Open editor manually</button></p> : null}
            {draft.model ? <div className="mt-4 border-t border-indigo-200 pt-4"><p className="text-sm text-indigo-950">Open the exact formatted DOCX in the Word editor to correct it. The editor saves versioned lawyer revisions and provides DOCX and PDF downloads.</p><button type="button" onClick={() => openWordEditor.mutate()} disabled={openWordEditor.isPending} className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-indigo-700 bg-white px-4 text-sm font-semibold text-indigo-800 disabled:opacity-50">{openWordEditor.isPending ? "Opening Word editor…" : "Open in Word editor"}</button>{openWordEditor.error ? <p role="alert" className="mt-2 text-sm text-red-700">{openWordEditor.error.message}</p> : null}</div> : null}
        </section>}
        {components.map((component) => <article key={component.code} className="mt-5 border-t border-slate-100 pt-4"><h3 className="text-sm font-semibold capitalize text-slate-800">{component.code.replaceAll("_", " ")}</h3>{component.paragraphs?.map((paragraph, index) => { const key = `${component.code}:${index}`; return paragraph.editable ? <div key={key} className="mt-3"><Field label={`${paragraph.role.replaceAll("_", " ")} (AI draft — lawyer editable)`} htmlFor={key}><textarea id={key} value={edits[key] ?? paragraph.text} onChange={(event) => setEdits((current) => ({ ...current, [key]: event.target.value }))} className="mt-1 min-h-32 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-6 text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></Field>{paragraph.citations?.length ? <p className="mt-1 text-xs text-slate-600">Original AI sources (recheck after editing): {paragraph.citations.map((citation, citationIndex) => { const documentId = citation.source_document_id ?? citation.document_id; const annexure = documentId ? annexureByDocument.get(documentId) : undefined; return <span key={`${key}:${citationIndex}`}>{citationIndex ? ", " : ""}{documentId ? <Link href={`/cases/${caseId}/documents/${documentId}`} className="underline underline-offset-2">{annexure ? `Annexure-${annexure}` : "Original document"}</Link> : "Original document"}{citation.page_number ? ` p. ${citation.page_number}` : " (page to verify)"}</span>; })}</p> : null}</div> : <p key={key} className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{paragraph.text}</p>; })}</article>)}
        {Object.keys(edits).length ? <><button type="button" onClick={() => save.mutate()} disabled={save.isPending || draft.status === "stale"} className="mt-5 inline-flex min-h-10 items-center rounded-lg bg-indigo-600 px-4 text-sm text-white disabled:opacity-50">{save.isPending ? "Saving sections…" : "Save section edits"}</button>{save.error ? <p role="alert" className="mt-2 text-sm text-red-700">{save.error.message}</p> : null}</> : null}
        {checks.length ? <section className="mt-6 border-t border-slate-200 pt-4"><h3 className="text-base font-semibold text-slate-900">Compliance report</h3><p className="mt-1 text-sm text-slate-600">Each result is checked against the saved court-format rule snapshot.</p><ul className="mt-3 space-y-3">{checks.map((check) => <li key={check.code} className="rounded-lg border border-slate-200 p-3 text-sm"><div className="flex items-center gap-2"><Badge tone={check.status === "pass" ? "success" : check.status === "fail" ? "danger" : "warning"}>{check.status}</Badge><span className="font-medium text-slate-900">{check.code}</span></div><p className="mt-1 text-slate-700">Expected: {check.expected}. Found: {check.found}.</p><p className="mt-1 text-slate-500">Why: {check.source} · {check.locator}</p></li>)}</ul></section> : null}
    </section>;
}
