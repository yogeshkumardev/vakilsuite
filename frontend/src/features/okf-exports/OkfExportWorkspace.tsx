"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@/types/generated-api";
import { Alert } from "@/components/ui/Alert";
import { Surface } from "@/components/ui/Surface";
import { WorkspacePage } from "@/components/ui/WorkspacePage";
import { okfExportsApi, type OkfContext, type OkfSelection } from "@/lib/api/okf-exports";
import { summariesApi } from "@/lib/api/summaries";
import { quoteDraft, submitDraft, draftStatus, type Quote } from "@/lib/api/draft-generation";
import { workingDocumentsApi } from "@/lib/api/working-documents";
import { useAuthStore } from "@/store/auth.store";
import { useChamberStore } from "@/store/chamber.store";

type JsonRecord = Record<string, unknown>;
type FindingSelection = components["schemas"]["ConfirmedFindingSelection"];
type DraftField = components["schemas"]["DraftField"];

const DRAFT_TYPES = [
    {
        id: "s528_bnss",
        title: "Section 528 BNSS Quashing Application",
        subtitle: "Erstwhile Section 482 CrPC",
        description: "Criminal Miscellaneous Application to quash FIR, Charge-Sheet, Cognizance or Summoning Order in the High Court.",
        icon: "📜",
        badge: "Recommended",
        defaultRelief:
            "To quash and set aside the impugned First Information Report (FIR), charge-sheet, summoning/cognizance order, and all consequential proceedings arising out of the case against the applicant, in the interest of justice.",
    },
    {
        id: "anticipatory_bail",
        title: "Anticipatory Bail Application",
        subtitle: "Section 482 BNSS / Erstwhile Section 438 CrPC",
        description: "Application for grant of pre-arrest anticipatory bail in the High Court or Sessions Court.",
        icon: "⚖️",
        badge: "Pre-Arrest",
        defaultRelief:
            "To enlarge the applicant on anticipatory bail in the event of arrest in connection with the impugned Case Crime No. upon such terms and conditions as this Hon'ble Court may deem fit and proper.",
    },
    {
        id: "regular_bail",
        title: "Regular Bail Application",
        subtitle: "Section 483 BNSS / Erstwhile Section 439 CrPC",
        description: "Application for release on regular bail during the pendency of trial or investigation.",
        icon: "🛡️",
        badge: "Post-Arrest",
        defaultRelief:
            "To enlarge the applicant on regular bail during the pendency of trial in connection with the impugned Case Crime No. on such terms and conditions as this Hon'ble Court may deem fit and proper.",
    },
] as const;

function asRecord(value: unknown): JsonRecord | null {
    return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null;
}
function asString(value: unknown): string | null {
    return typeof value === "string" ? value : null;
}
function asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
}

export function OkfExportWorkspace({ caseId, runId }: { caseId: string; runId: string }) {
    const generation = useAuthStore((state) => state.generation);
    const chamberId = useChamberStore((state) => state.selected?.id);
    const queryClient = useQueryClient();
    return <ScopedWorkspace key={`${generation}:${chamberId}:${caseId}:${runId}`} caseId={caseId} runId={runId} />;
}

function ScopedWorkspace({ caseId, runId }: { caseId: string; runId: string }) {
    const generation = useAuthStore((state) => state.generation);
    const chamberId = useChamberStore((state) => state.selected?.id);
    const queryClient = useQueryClient();

    // Selected draft petition type
    const [selectedDraftTypeId, setSelectedDraftTypeId] = useState<string>("s528_bnss");
    const [relief, setRelief] = useState<string>(DRAFT_TYPES[0].defaultRelief);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Load templates & summary
    const templates = useQuery({
        queryKey: ["okf-templates", caseId, generation, chamberId],
        queryFn: () => okfExportsApi.listTemplates(caseId),
    });
    const run = useQuery({
        queryKey: ["summary-run", caseId, runId, generation, chamberId],
        queryFn: () => summariesApi.getRun(caseId, runId),
    });

    // Pick first available template
    const template = templates.data?.[0];

    // Compute all reviewed documents and automatically confirm them
    const documentOptions = useMemo(() => {
        if (run.data?.review_documents?.length) {
            return run.data.review_documents.map((d) => ({ id: d.document_id, name: d.filename }));
        }
        if (run.data?.presentation) {
            return [
                ...new Map(
                    run.data.presentation.selectable_facts.flatMap((f) =>
                        f.sources.map((source) => [
                            source.document_id,
                            { id: source.document_id, name: source.filename ?? `Document ${source.document_id.slice(0, 8)}` },
                        ] as const)
                    )
                ).values(),
            ];
        }
        return [];
    }, [run.data]);

    // Gather all selectable findings from presentation or sections
    const payload = asRecord(run.data?.result_payload);
    const legacyFindings = useMemo(
        () =>
            asArray(payload?.sections)
                .flatMap((sectionValue) => {
                    const section = asRecord(sectionValue);
                    const name = asString(section?.name);
                    return asArray(section?.findings)
                        .map(asRecord)
                        .filter((finding): finding is JsonRecord => finding !== null)
                        .map((finding, index) => ({
                            key: `${name}:${index}`,
                            section: name as components["schemas"]["SummarySectionName"],
                            finding_index: index,
                            text: asString(finding.text) ?? "Not available",
                            documentIds: asArray(finding.citations)
                                .map(asRecord)
                                .map((citation) => asString(citation?.source_document_id))
                                .filter((id): id is string => Boolean(id)),
                        }));
                })
                .filter((finding) => Boolean(finding.section)),
        [payload]
    );

    const findings: Array<FindingSelection & { key: string; text: string; documentIds: string[] }> = useMemo(() => {
        if (run.data?.presentation) {
            return run.data.presentation.selectable_facts.map((f) => ({
                key: f.id,
                finding_id: f.id,
                text: `[${f.status}] ${f.text}`,
                documentIds: [...new Set(f.sources.map((source) => source.document_id))],
            }));
        }
        return legacyFindings;
    }, [run.data, legacyFindings]);

    // Select all available findings with citations up to 200
    const confirmedFindings: FindingSelection[] = useMemo(() => {
        return findings
            .filter((f) => f.documentIds && f.documentIds.length > 0)
            .slice(0, 200)
            .map(({ section, finding_index, finding_id }) => (finding_id ? { finding_id } : { section, finding_index }));
    }, [findings]);

    // Update default relief when draft type changes
    const handleDraftTypeSelect = (typeId: string) => {
        setSelectedDraftTypeId(typeId);
        const dt = DRAFT_TYPES.find((t) => t.id === typeId);
        if (dt) setRelief(dt.defaultRelief);
    };

    // Helper to bind actual confirmed facts from saved context
    const buildFactBindings = (contextPayload: unknown) => {
        const app = (contextPayload as { application?: { confirmed_facts?: Array<{ id: string; text: string; citations?: unknown[] }> } })?.application;
        const rawFacts = app?.confirmed_facts ?? [];
        const eligibleFacts = rawFacts.filter((f) =>
            f &&
            typeof f.id === "string" &&
            Array.isArray(f.citations) &&
            f.citations.length > 0 &&
            typeof f.text === "string" &&
            f.text.trim().length > 0 &&
            f.text.trim().toLowerCase() !== "not available"
        );

        const result: Record<DraftField, string[]> = {
            parties: [],
            case_identification: [],
            impugned_order: [],
            procedural_history: [],
            material_facts: [],
        };
        const allEligibleIds = eligibleFacts.map((f) => f.id);
        if (!allEligibleIds.length) return result;

        for (const f of eligibleFacts) {
            const t = f.text.toLowerCase();
            const id = f.id;
            if (
                t.includes("party") ||
                t.includes("accused") ||
                t.includes("applicant") ||
                t.includes("complainant") ||
                t.includes("informant") ||
                t.includes("victim") ||
                t.includes("state of") ||
                t.includes("respondent")
            ) {
                if (result.parties.length < 15) result.parties.push(id);
            }
            if (
                t.includes("fir") ||
                t.includes("crime") ||
                t.includes("case") ||
                t.includes("police station") ||
                t.includes("ps") ||
                t.includes("section") ||
                t.includes("u/s") ||
                t.includes("bns") ||
                t.includes("ipc") ||
                t.includes("act")
            ) {
                if (result.case_identification.length < 15) result.case_identification.push(id);
            }
            if (
                t.includes("order") ||
                t.includes("charge sheet") ||
                t.includes("chargesheet") ||
                t.includes("cognizance") ||
                t.includes("summon") ||
                t.includes("warrant") ||
                t.includes("impugned") ||
                t.includes("judgment") ||
                t.includes("decree")
            ) {
                if (result.impugned_order.length < 15) result.impugned_order.push(id);
            }
            if (
                t.includes("dated") ||
                t.includes("date") ||
                t.includes("procedural") ||
                t.includes("remand") ||
                t.includes("bail") ||
                t.includes("investigation") ||
                t.includes("arrest") ||
                t.includes("custody") ||
                t.includes("trial") ||
                t.includes("court")
            ) {
                if (result.procedural_history.length < 15) result.procedural_history.push(id);
            }
            if (result.material_facts.length < 15) {
                result.material_facts.push(id);
            }
        }

        // Ensure every required field has valid citations bound
        for (const k of Object.keys(result) as DraftField[]) {
            if (result[k].length === 0 && allEligibleIds.length > 0) {
                result[k] = allEligibleIds.slice(0, Math.min(5, allEligibleIds.length));
            }
        }
        return result;
    };

    // Generation state
    const [step, setStep] = useState<"idle" | "preparing" | "quoting" | "submitting" | "polling" | "done" | "error">("idle");
    const [stepMessage, setStepMessage] = useState("");
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [contextSnapshot, setContextSnapshot] = useState<OkfContext | null>(null);
    const [createdDocumentId, setCreatedDocumentId] = useState<string | null>(null);

    // Existing working documents query
    const existingDocsQuery = useQuery({
        queryKey: ["working-documents", caseId],
        queryFn: () => workingDocumentsApi.listForCase(caseId),
    });
    const latestAiDraft = useMemo(() => {
        if (!existingDocsQuery.data?.length) return null;
        return (
            existingDocsQuery.data.find(
                (doc) =>
                    doc.title.toLowerCase().includes("ai working draft") ||
                    doc.title.toLowerCase().includes("s528") ||
                    doc.title.toLowerCase().includes("quashing") ||
                    doc.title.toLowerCase().includes("bail")
            ) ?? existingDocsQuery.data[0]
        );
    }, [existingDocsQuery.data]);

    // Check if draft already generated and if summary changed
    const [forceUnlockRegenerate, setForceUnlockRegenerate] = useState(false);
    const summaryChanged = useMemo(() => {
        if (!latestAiDraft || !run.data) return true;
        const draftCreated = new Date(latestAiDraft.created_at).getTime();
        const summaryTime = run.data.completed_at
            ? new Date(run.data.completed_at).getTime()
            : new Date(run.data.created_at).getTime();
        return summaryTime > draftCreated;
    }, [latestAiDraft, run.data]);

    const isGenerationBlocked = Boolean(latestAiDraft) && !summaryChanged && !forceUnlockRegenerate;

    // 1-Click Generate Workflow
    const handleGenerate = async () => {
        if (!template || !run.data?.result_hash) {
            setGenerationError("Template or approved summary hash is missing. Please reload.");
            return;
        }

        queryClient.removeQueries({ queryKey: ["s528-generation"] });
        setGenerationError(null);
        setStep("preparing");
        setStepMessage("Step 1/3: Preparing certified case context from approved summary…");

        try {
            const selection: OkfSelection = {
                summary_run_id: runId,
                expected_summary_result_hash: run.data.result_hash,
                bundle_id: template.bundle_id,
                bundle_version: template.bundle_version,
                template_entry_id: template.template_entry_id,
                confirmed_findings: confirmedFindings,
                annexure_ids: [],
            };

            // 1. Preview
            const previewResult = await okfExportsApi.preview(caseId, selection);

            // 2. Save Context
            const saved = await okfExportsApi.saveContext(caseId, {
                ...selection,
                expected_manifest_sha256: previewResult.manifest_sha256,
            });

            // 3. Read Context
            const context = await okfExportsApi.getContext(caseId, saved.id);
            setContextSnapshot(context);

            setStep("quoting");
            setStepMessage("Step 2/3: Authorizing provider reservation & legal budget…");

            // 4. Extract verified facts from the saved context and bind them
            const bindings = buildFactBindings(context.payload);
            const quoteBody = {
                expected_manifest_sha256: context.manifest_sha256,
                fact_bindings: bindings,
                requested_relief: relief,
            };
            const quote = await quoteDraft(caseId, context.id, quoteBody);

            setStep("submitting");
            setStepMessage("Step 3/3: Submitting to AI legal drafter for Section 528 petition drafting…");

            // 5. Submit Draft
            const initialJob = await submitDraft(caseId, context.id, quoteBody, quote.quote_hash);

            if (initialJob.status === "succeeded") {
                const docId = initialJob.result_summary?.working_document_id;
                if (typeof docId === "string") {
                    setCreatedDocumentId(docId);
                    setStep("done");
                    setStepMessage("Draft generated successfully!");
                    queryClient.invalidateQueries({ queryKey: ["working-documents", caseId] });
                    return;
                }
            } else if (initialJob.status === "failed") {
                setStep("error");
                setStepMessage("");
                setGenerationError(initialJob.error_message || "Draft generation failed.");
                return;
            }

            // 6. Robust sequential polling loop (up to 3 minutes)
            setStep("polling");
            setStepMessage("AI legal drafter is crafting the petition with grounds and citations…");

            const startTime = Date.now();
            const TIMEOUT_MS = 180000;
            while (Date.now() - startTime < TIMEOUT_MS) {
                await new Promise((r) => setTimeout(r, 2000));
                try {
                    const currentJob = await draftStatus(caseId, context.id);
                    if (currentJob) {
                        if (currentJob.status === "succeeded") {
                            const docId = currentJob.result_summary?.working_document_id;
                            if (typeof docId === "string") {
                                setCreatedDocumentId(docId);
                                setStep("done");
                                setStepMessage("Draft generated successfully!");
                                queryClient.invalidateQueries({ queryKey: ["working-documents", caseId] });
                                return;
                            }
                        } else if (currentJob.status === "failed") {
                            setStep("error");
                            setStepMessage("");
                            setGenerationError(currentJob.error_message || "Draft generation failed.");
                            return;
                        } else if (currentJob.status === "cancelled") {
                            setStep("error");
                            setStepMessage("");
                            setGenerationError("Draft generation was cancelled.");
                            return;
                        } else {
                            setStepMessage(`AI legal drafter working… (Status: ${currentJob.status.replaceAll("_", " ")})`);
                        }
                    }
                } catch (pollErr) {
                    console.warn("Polling draft status error:", pollErr);
                }
            }
            throw new Error("Draft generation timed out. Please check your working documents or refresh the page.");
        } catch (err) {
            setStep("error");
            setStepMessage("");
            setGenerationError(err instanceof Error ? err.message : "Failed to generate draft. Please try again.");
        }
    };

    const isWorking = step === "preparing" || step === "quoting" || step === "submitting" || step === "polling";
    const isApproved = run.data?.status === "completed";

    return (
        <WorkspacePage className="space-y-6 max-w-4xl">
            {/* Header */}
            <div>
                <Link
                    href={`/cases/${caseId}/summary/${runId}`}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline inline-flex items-center gap-1"
                >
                    ← Back to Reviewed Summary
                </Link>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                    Generate Legal Draft
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                    Select your desired draft petition. Verified facts and citations from your approved summary will be automatically woven into the draft.
                </p>
            </div>

            {run.error && <Alert tone="danger" title="Unable to load summary">{run.error.message}</Alert>}
            {!isApproved && run.data && (
                <Alert tone="warning" title="Summary approval required">
                    Please approve the case summary before generating a draft. Only verified summaries can be used for drafting.{" "}
                    <Link href={`/cases/${caseId}/summary/${runId}`} className="font-semibold underline">
                        Review and Approve Summary
                    </Link>
                </Alert>
            )}

            {/* Existing AI Draft Notice (if draft was already created) */}
            {latestAiDraft && step !== "done" && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white text-lg font-bold">
                            📝
                        </span>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                                    Generated Draft Available
                                </span>
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                                {latestAiDraft.title}
                            </h3>
                            <p className="text-xs text-slate-500">
                                An AI petition draft has already been generated for this case. You can open and edit it now, or generate another version below.
                            </p>
                        </div>
                    </div>
                    <Link
                        href={`/cases/${caseId}/working-documents/${latestAiDraft.id}`}
                        className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition"
                    >
                        <span>Open in Rich Text Editor</span>
                        <span>→</span>
                    </Link>
                </div>
            )}

            {/* Step 1: Draft Petition Selector */}
            <Surface as="section" variant="bordered" className="p-5 rounded-xl space-y-4">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">
                        1. Select Draft Petition Type
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Choose the specific legal application to draft for this case.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {DRAFT_TYPES.map((type) => {
                        const isSelected = selectedDraftTypeId === type.id;
                        return (
                            <button
                                key={type.id}
                                type="button"
                                disabled={isWorking || !isApproved}
                                onClick={() => handleDraftTypeSelect(type.id)}
                                className={`flex flex-col text-left p-4 rounded-xl border transition-all ${
                                    isSelected
                                        ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20 shadow-sm"
                                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <span className="text-2xl">{type.icon}</span>
                                    <span
                                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                            isSelected
                                                ? "bg-indigo-600 text-white"
                                                : "bg-slate-100 text-slate-600"
                                        }`}
                                    >
                                        {type.badge}
                                    </span>
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                                    {type.title}
                                </h3>
                                <p className="text-[11px] font-medium text-indigo-700 mt-0.5">
                                    {type.subtitle}
                                </p>
                                <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                                    {type.description}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </Surface>

            {/* Step 2: Requested Relief Specification */}
            <Surface as="section" variant="bordered" className="p-5 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-semibold text-slate-900">
                            2. Prayer / Requested Relief
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Pre-filled based on your petition type. You can customize the specific relief sought.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            const dt = DRAFT_TYPES.find((t) => t.id === selectedDraftTypeId);
                            if (dt) setRelief(dt.defaultRelief);
                        }}
                        disabled={isWorking}
                        className="text-xs text-indigo-600 hover:underline"
                    >
                        Reset to default prayer
                    </button>
                </div>

                <textarea
                    value={relief}
                    onChange={(e) => setRelief(e.target.value)}
                    disabled={isWorking || !isApproved}
                    rows={4}
                    maxLength={4000}
                    className="w-full rounded-lg border border-slate-300 p-3 text-sm leading-relaxed text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
                    placeholder="Enter the specific prayers / relief sought in this application..."
                />
                <p className="text-[11px] text-slate-400">
                    Characters: {relief.length} / 4000 (minimum 10 characters required)
                </p>
            </Surface>

            {/* Summary Facts & Documents Badge */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3 px-4 text-xs text-slate-600">
                <div className="flex items-center gap-3">
                    <span>✓ <strong>{confirmedFindings.length}</strong> verified summary findings</span>
                    <span>•</span>
                    <span>✓ <strong>{documentOptions.length}</strong> reviewed original documents</span>
                    <span>•</span>
                    <span>✓ Model: <strong>gemini-3.6-flash</strong></span>
                </div>
                <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-indigo-600 font-semibold underline text-xs"
                >
                    {showAdvanced ? "Hide Advanced Settings" : "Advanced Settings"}
                </button>
            </div>

            {/* Advanced Settings (Collapsible) */}
            {showAdvanced && (
                <Surface as="section" variant="bordered" className="p-4 rounded-xl space-y-3 bg-slate-50/50 text-xs">
                    <h3 className="font-semibold text-slate-800">Advanced OKF Packaging Details</h3>
                    <p className="text-slate-500">
                        Bundle: <code>{template?.bundle_id ?? "s528_curated_01"}</code> v{template?.bundle_version ?? "1.0.0"} · Entry: <code>{template?.template_entry_id ?? "quashing-template"}</code>
                    </p>
                    <p className="text-slate-500">
                        Confirmed Findings: {confirmedFindings.length} · Reviewed Documents: {documentOptions.length}
                    </p>
                </Surface>
            )}

            {/* Error Message */}
            {generationError && (
                <Alert tone="danger" title="Draft Generation Issue">
                    {generationError}
                </Alert>
            )}

            {/* Progress / Success Box */}
            {step === "done" && createdDocumentId && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-2xl font-bold">
                            ✓
                        </span>
                        <div>
                            <h2 className="text-lg font-bold text-emerald-950">
                                Draft Generated Successfully!
                            </h2>
                            <p className="text-sm text-emerald-800">
                                Your legal petition has been drafted with verified facts, ground paragraphs, and formal legal formatting.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                        <Link
                            href={`/cases/${caseId}/working-documents/${createdDocumentId}`}
                            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition"
                        >
                            <span>📝 Open in Rich Text Editor</span>
                            <span>→</span>
                        </Link>
                        <Link
                            href={`/cases/${caseId}/drafts`}
                            className="inline-flex min-h-12 items-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >
                            View All Drafts
                        </Link>
                    </div>
                </div>
            )}

            {/* Blocked generation banner if draft exists & summary unchanged */}
            {isGenerationBlocked && latestAiDraft && step !== "done" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-xs text-amber-950 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                        <span className="text-lg">🔒</span>
                        <div className="space-y-1">
                            <p className="font-bold text-amber-950 text-sm">
                                Draft Already Generated for this Case ({latestAiDraft.title})
                            </p>
                            <p className="text-amber-800 leading-relaxed">
                                A petition draft is already generated and saved. To prevent duplicate drafts and conserve credits, the generate button is locked. It will automatically reactivate whenever the case summary is modified or re-run.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                        <Link
                            href={`/cases/${caseId}/drafts`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-800 px-3.5 py-2 font-bold text-white shadow-xs hover:bg-amber-900 transition"
                        >
                            <span>📝 Open Existing Draft in Editor</span>
                            <span>→</span>
                        </Link>
                        <button
                            type="button"
                            onClick={() => setForceUnlockRegenerate(true)}
                            className="text-amber-800 underline hover:text-amber-950 text-xs font-semibold"
                        >
                            Summary unchanged but want to regenerate anyway? (Unlock)
                        </button>
                    </div>
                </div>
            )}

            {/* Generate Action Button & Active Progress */}
            {step !== "done" && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={isWorking || !isApproved || relief.trim().length < 10 || isGenerationBlocked}
                        className="w-full sm:w-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 text-base font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        {isWorking ? (
                            <>
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                <span>Generating Draft…</span>
                            </>
                        ) : isGenerationBlocked ? (
                            <>
                                <span>🔒 Draft Already Generated</span>
                            </>
                        ) : step === "error" ? (
                            <>
                                <span>🔄 Retry Draft Generation</span>
                                <span>→</span>
                            </>
                        ) : (
                            <>
                                <span>⚡ Generate Draft with AI</span>
                                <span>→</span>
                            </>
                        )}
                    </button>

                    {isWorking && (
                        <div className="flex items-center gap-2 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                            <span className="h-2 w-2 rounded-full bg-indigo-600 animate-ping" />
                            <span>{stepMessage}</span>
                        </div>
                    )}
                </div>
            )}
        </WorkspacePage>
    );
}
