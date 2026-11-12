"use client";

import "../editor/fonts.css";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Download,
    RefreshCw,
    ScanText,
    Search,
    ExternalLink,
    FilePenLine,
} from "lucide-react";
import { documentsApi, type TypedRevision } from "@/lib/api/documents";
import { documentKeys } from "@/features/documents/hooks/useDocuments";
import { getAccessToken, refreshAccessToken } from "@/lib/api/client";
import { useAuthStore } from "@/store/auth.store";
import { understandingApi, type EvidenceBlock, type EvidencePage } from "./api";

const qualityLabels: Record<string, string> = {
    no_native_text:
        "No readable digital text; OCR or manual transcription required",
    page_extraction_failed: "Page extraction could not be completed",
    page_resource_limit: "Page exceeds current processing limits",
    page_transform_unsupported: "Rotated or cropped page requires reprocessing",
    page_geometry_unsupported: "Unsupported page dimensions",
    out_of_bounds_text: "Text coordinates could not be verified",
    layout_detection_failed: "Layout could not be reconstructed",
    image_content_untranscribed:
        "Embedded image content has not been transcribed",
    annotations_untranscribed: "Annotations or form content need source review",
    native_unicode_unusable: "Some digital text could not be decoded",
    table_grid_unresolved: "Table boundaries could not be resolved",
    ambiguous_field_boundary: "Field boundaries are ambiguous",
    field_value_unresolved: "Field value could not be resolved",
    text_crosses_cell_boundary: "Text crosses a table cell boundary",
    ocr_score_missing: "OCR confidence is unavailable",
    ocr_low_confidence: "Low-confidence OCR text",
    native_ocr_disagreement: "OCR and digital text disagree",
    visibility_uncertain: "Text visibility could not be verified",
    ocr_repair_unavailable: "Local OCR repair is not configured",
    ocr_repair_failed: "Local OCR repair did not complete",
    ocr_repair_deferred: "Additional pages need a separate OCR pass",
};

function Block({
    block,
    onSelect,
    selected,
}: {
    block: EvidenceBlock;
    onSelect: () => void;
    selected: boolean;
}) {
    return (
        <section
            className={`min-w-0 border-b border-gray-200 py-3 ${selected ? "bg-emerald-50" : ""}`}
        >
            <div className="mb-2 flex items-center justify-between gap-2 text-xs text-gray-500">
                <span className="capitalize">{block.kind}</span>
                <button
                    type="button"
                    onClick={onSelect}
                    className="p-1"
                    title="Show source region"
                    aria-label={`Show source ${block.id}`}
                >
                    <ExternalLink size={15} />
                </button>
            </div>
            {block.kind === "table" ? (
                <div className="overflow-x-auto">
                    <table
                        className="w-full border-collapse text-sm"
                        style={{
                            minWidth: Math.min(1200, block.columns * 100),
                        }}
                    >
                        <tbody>
                            {Array.from({ length: block.rows }, (_, row) => (
                                <tr key={row}>
                                    {block.cells
                                        .filter((c) => c.row === row)
                                        .sort((a, b) => a.column - b.column)
                                        .map((cell) => (
                                            <td
                                                key={cell.column}
                                                colSpan={cell.colspan}
                                                rowSpan={cell.rowspan}
                                                className="whitespace-pre-wrap break-words border border-gray-400 p-2 align-top leading-7 [overflow-wrap:anywhere]"
                                            >
                                                {cell.text || (
                                                    <span className="text-gray-400">
                                                        [empty]
                                                    </span>
                                                )}
                                            </td>
                                        ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : block.kind === "field" ? (
                <dl className="text-sm">
                    <dt className="break-words font-semibold leading-7 [overflow-wrap:anywhere]">
                        {block.label}
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap break-words leading-7 [overflow-wrap:anywhere]">
                        {block.value ?? (
                            <span className="text-amber-800">
                                Unresolved value
                            </span>
                        )}
                    </dd>
                </dl>
            ) : (
                <p className="whitespace-pre-wrap break-words text-sm leading-7">
                    {block.text}
                </p>
            )}
        </section>
    );
}

function PageLayout({
    page,
    selected,
    select,
}: {
    page: EvidencePage;
    selected: string | null;
    select: (block: EvidenceBlock) => void;
}) {
    const rows: EvidenceBlock[][] = [];
    const unresolved = page.blocks.filter(
        (block) =>
            block.kind === "unknown" &&
            block.warnings.includes("visibility_uncertain"),
    );
    for (const block of page.blocks) {
        if (unresolved.includes(block)) continue;
        const last = rows.at(-1);
        if (
            last &&
            Math.abs(last[0].bbox[1] - block.bbox[1]) < 8 &&
            last.every(
                (b) =>
                    b.bbox[2] <= block.bbox[0] + 2 ||
                    block.bbox[2] <= b.bbox[0] + 2,
            )
        )
            last.push(block);
        else rows.push([block]);
    }
    return (
        <div
            className="px-4"
            style={{ fontFamily: '"Noto Sans Devanagari", sans-serif' }}
        >
            {!page.blocks.length && (
                <p className="py-4 text-sm text-amber-800">
                    No usable text extracted on this page. The original may
                    still contain information.
                </p>
            )}
            {rows.map((row, index) => (
                <div
                    key={index}
                    className="grid gap-x-4"
                    style={{
                        gridTemplateColumns: `repeat(${Math.min(row.length, 3)}, minmax(0, 1fr))`,
                    }}
                >
                    {row
                        .sort((a, b) => a.bbox[0] - b.bbox[0])
                        .map((block) => (
                            <Block
                                key={block.id}
                                block={block}
                                selected={selected === block.id}
                                onSelect={() => select(block)}
                            />
                        ))}
                </div>
            ))}
            {unresolved.length > 0 && (
                <details className="border-t border-gray-200 py-3 text-sm">
                    <summary className="cursor-pointer text-amber-800">
                        Unresolved source fragments ({unresolved.length})
                    </summary>
                    {unresolved.map((block) => (
                        <Block
                            key={block.id}
                            block={block}
                            selected={selected === block.id}
                            onSelect={() => select(block)}
                        />
                    ))}
                </details>
            )}
        </div>
    );
}

function SourcePage({
    id,
    page,
    block,
    sourceHash,
}: {
    id: string;
    page: EvidencePage;
    block?: EvidenceBlock;
    sourceHash: string;
}) {
    const [image, setImage] = useState<{
        page: number;
        sourceHash: string;
        url: string;
    } | null>(null);
    const [error, setError] = useState("");
    useEffect(() => {
        let disposed = false,
            url = "";
        const controller = new AbortController();
        const generation = useAuthStore.getState().generation;
        async function load() {
            const base = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";
            const request = () =>
                fetch(
                    `${base}/documents/${id}/pages/${page.number}/preview?source_hash=${sourceHash}`,
                    {
                        credentials: "include",
                        signal: controller.signal,
                        headers: getAccessToken()
                            ? { Authorization: `Bearer ${getAccessToken()}` }
                            : {},
                    },
                );
            let response = await request();
            if (response.status === 401) {
                await refreshAccessToken();
                response = await request();
            }
            if (response.status === 409)
                throw new Error(
                    "Source PDF changed. Re-extract evidence before comparing.",
                );
            if (!response.ok) throw new Error("Source preview unavailable");
            const blob = await response.blob();
            if (disposed || generation !== useAuthStore.getState().generation)
                return;
            url = URL.createObjectURL(blob);
            setImage({ page: page.number, sourceHash, url });
            setError("");
        }
        void load().catch((e) => {
            if (!disposed)
                setError(
                    e instanceof Error ? e.message : "Preview unavailable",
                );
        });
        return () => {
            disposed = true;
            controller.abort();
            if (url) URL.revokeObjectURL(url);
        };
    }, [id, page.number, sourceHash]);
    return (
        <div className="p-3">
            {error && (
                <p role="alert" className="text-sm text-red-700">
                    {error}
                </p>
            )}
            {image?.page === page.number && image.sourceHash === sourceHash ? (
                <div className="relative border border-gray-200 bg-white">
                    {/* Source pages are authorized raster evidence, not decorative media. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={image.url}
                        alt={`Source page ${page.number}`}
                        width={page.width}
                        height={page.height}
                        className="h-auto w-full"
                    />
                    {block && (
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute border-2 border-emerald-600 bg-emerald-200/20"
                            style={{
                                left: `${(100 * block.bbox[0]) / page.width}%`,
                                top: `${(100 * block.bbox[1]) / page.height}%`,
                                width: `${(100 * (block.bbox[2] - block.bbox[0])) / page.width}%`,
                                height: `${(100 * (block.bbox[3] - block.bbox[1])) / page.height}%`,
                            }}
                        />
                    )}
                </div>
            ) : (
                !error && (
                    <p role="status" className="text-sm text-gray-500">
                        Loading source...
                    </p>
                )
            )}
        </div>
    );
}

export function InformationView({
    documentId,
    caseId,
    typedRevision,
    onTypedReady,
}: {
    documentId: string;
    caseId: string;
    typedRevision?: TypedRevision | null;
    onTypedReady?: () => void;
}) {
    const qc = useQueryClient();
    const [jobId, setJobId] = useState<string | null>(null);
    const [number, setNumber] = useState(1);
    const [selected, setSelected] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [pane, setPane] = useState("evidence");
    const [downloadError, setDownloadError] = useState("");
    const key = ["understanding", documentId];
    const evidence = useQuery({
        queryKey: key,
        queryFn: () => understandingApi.get(documentId),
        retry: 1,
        refetchInterval: (q) =>
            q.state.data?.processing?.active ? 2000 : false,
    });
    const progress = useQuery({
        queryKey: ["understanding-job", jobId],
        enabled: Boolean(jobId),
        queryFn: () => documentsApi.getJobStatus(jobId!),
        refetchInterval: (q) =>
            q.state.error ||
            ["completed", "failed"].includes(q.state.data?.status ?? "")
                ? false
                : 2000,
    });
    const start = useMutation({
        mutationFn: () => documentsApi.reprocess(documentId, "understanding"),
        onSuccess: (id) => {
            setJobId(id);
            void qc.invalidateQueries({
                queryKey: documentKeys.detail(documentId),
            });
            void qc.invalidateQueries({
                queryKey: documentKeys.progress(documentId),
            });
            void qc.invalidateQueries({
                queryKey: ["understanding", documentId],
            });
        },
    });
    const search = useMutation({
        mutationFn: ({
            revisionId,
            text,
        }: {
            revisionId: string;
            text: string;
        }) => understandingApi.search(documentId, revisionId, text),
    });
    const createTyped = useMutation({
        mutationFn: (revisionId: string) =>
            understandingApi.typedCopy(documentId, revisionId, typedRevision),
        onSuccess: async () => {
            await qc.invalidateQueries({
                queryKey: documentKeys.revision(documentId),
            });
            await qc.invalidateQueries({
                queryKey: documentKeys.detail(documentId),
            });
            onTypedReady?.();
        },
    });
    useEffect(() => {
        if (["completed", "failed"].includes(progress.data?.status ?? "")) {
            void qc.invalidateQueries({
                queryKey: ["understanding", documentId],
            });
            void qc.invalidateQueries({
                queryKey: documentKeys.detail(documentId),
            });
            void qc.invalidateQueries({
                queryKey: documentKeys.progress(documentId),
            });
            void qc.invalidateQueries({ queryKey: documentKeys.list(caseId) });
        }
    }, [progress.data?.status, qc, documentId, caseId]);
    const revision = evidence.data?.revision;
    const page =
        revision?.structure.pages.find((p) => p.number === number) ??
        revision?.structure.pages[0];
    const active = page?.blocks.find((b) => b.id === selected);
    const pending =
        start.isPending ||
        Boolean(evidence.data?.processing?.active) ||
        Boolean(
            jobId &&
            !progress.error &&
            !["completed", "failed"].includes(progress.data?.status ?? ""),
        );
    const matches =
        search.data?.revision_id === revision?.id
            ? search.data?.matches
            : undefined;
    async function downloadSnapshot() {
        setDownloadError("");
        try {
            const data = await understandingApi.snapshot(caseId, [documentId]);
            const url = URL.createObjectURL(
                new Blob([JSON.stringify(data, null, 2)], {
                    type: "application/json",
                }),
            );
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = "evidence-snapshot.json";
            anchor.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (e) {
            setDownloadError(
                e instanceof Error ? e.message : "Snapshot unavailable",
            );
        }
    }
    return (
        <div className="flex h-full min-h-0 flex-col bg-white">
            <div className="flex flex-wrap items-center gap-3 border-b px-4 py-2">
                <span className="mr-auto text-sm font-semibold">
                    Information
                </span>
                {pending && (
                    <span role="status" className="text-xs">
                        Processing...
                    </span>
                )}
                <button
                    type="button"
                    title="Extract local evidence"
                    aria-label="Extract local evidence"
                    disabled={pending}
                    onClick={() => start.mutate()}
                    className="p-2 text-emerald-700 disabled:opacity-40"
                >
                    <ScanText size={18} />
                </button>
                <button
                    type="button"
                    title="Refresh evidence"
                    aria-label="Refresh evidence"
                    onClick={() => {
                        void evidence.refetch();
                        if (progress.error) void progress.refetch();
                    }}
                    className="p-2"
                >
                    <RefreshCw size={17} />
                </button>
                <button
                    type="button"
                    title="Download evidence snapshot"
                    aria-label="Download evidence snapshot"
                    disabled={
                        !revision ||
                        revision.stale ||
                        pending ||
                        !evidence.data?.coverage.can_prepare_evidence_snapshot
                    }
                    onClick={() => void downloadSnapshot()}
                    className="p-2 disabled:opacity-40"
                >
                    <Download size={18} />
                </button>
                <button
                    type="button"
                    title="Create editable typed copy"
                    aria-label="Create editable typed copy"
                    disabled={
                        !revision ||
                        revision.stale ||
                        !evidence.data?.coverage.can_create_typed_copy ||
                        pending ||
                        createTyped.isPending
                    }
                    onClick={() => {
                        if (
                            revision &&
                            confirm(
                                "Create a new editable copy from this evidence? Existing saved revisions are retained.",
                            )
                        )
                            createTyped.mutate(revision.id);
                    }}
                    className="p-2 text-emerald-700 disabled:opacity-40"
                >
                    <FilePenLine size={18} />
                </button>
            </div>
            {(evidence.error ||
                start.error ||
                progress.error ||
                search.error ||
                createTyped.error ||
                progress.data?.status === "failed" ||
                downloadError) && (
                <p
                    role="alert"
                    className="border-b px-4 py-2 text-sm text-red-700"
                >
                    {evidence.error?.message ??
                        start.error?.message ??
                        progress.error?.message ??
                        search.error?.message ??
                        createTyped.error?.message ??
                        progress.data?.error ??
                        downloadError}
                </p>
            )}
            {evidence.data?.processing?.error && (
                <p
                    role="alert"
                    className="border-b px-4 py-2 text-sm text-red-700"
                >
                    {evidence.data.processing.error}
                </p>
            )}
            {evidence.data?.outcome && (
                <p
                    role="status"
                    className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                >
                    {evidence.data.outcome.message}
                </p>
            )}
            {evidence.isLoading ? (
                <p role="status" className="p-4 text-sm">
                    Loading evidence...
                </p>
            ) : !revision ? (
                <p className="p-4 text-sm text-gray-500">
                    No extracted evidence.
                </p>
            ) : (
                <>
                    <div className="flex flex-wrap items-center gap-3 border-b px-4 py-2 text-xs">
                        <select
                            aria-label="Evidence page"
                            value={page?.number}
                            onChange={(e) => {
                                setNumber(Number(e.target.value));
                                setSelected(null);
                            }}
                            className="border border-gray-300 p-1"
                        >
                            {revision.structure.pages.map((p) => (
                                <option key={p.number} value={p.number}>
                                    Page {p.number}
                                </option>
                            ))}
                        </select>
                        <span className="text-amber-800">
                            {revision.stale
                                ? "Stale evidence"
                                : "Machine-extracted / unreviewed"}
                        </span>
                        <span>
                            {evidence.data?.coverage.queryable_pages?.length ??
                                0}
                            /{revision.structure.pages.length} pages with
                            searchable passages
                        </span>
                    </div>
                    {evidence.data?.coverage.pages?.some(
                        (p) =>
                            p.status !== "unreviewed" ||
                            p.warnings.some((w) => qualityLabels[w]),
                    ) && (
                        <details className="max-h-40 shrink-0 overflow-auto border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
                            <summary className="cursor-pointer font-medium">
                                Evidence needs review (
                                {evidence.data.coverage.excluded_lines ?? 0}{" "}
                                text fragments excluded from search)
                            </summary>
                            <ul className="mt-2 space-y-2">
                                {evidence.data.coverage.pages.map((p) => {
                                    const reasons = p.warnings.filter(
                                        (w) => qualityLabels[w],
                                    );
                                    return (
                                        (reasons.length > 0 ||
                                            p.status !== "unreviewed") && (
                                            <li key={p.number}>
                                                Page {p.number}:{" "}
                                                {reasons
                                                    .map(
                                                        (w) => qualityLabels[w],
                                                    )
                                                    .join("; ") ||
                                                    "Incomplete extraction"}
                                            </li>
                                        )
                                    );
                                })}
                            </ul>
                        </details>
                    )}
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (
                                query.trim() &&
                                revision &&
                                !pending &&
                                evidence.data?.coverage.can_query
                            )
                                search.mutate({
                                    revisionId: revision.id,
                                    text: query.trim(),
                                });
                        }}
                        className="flex gap-2 border-b p-3"
                    >
                        <input
                            value={query}
                            maxLength={1000}
                            onChange={(e) => setQuery(e.target.value)}
                            aria-label="Search document evidence"
                            placeholder="Search source text"
                            className="min-w-0 flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
                        />
                        <button
                            type="submit"
                            title="Search evidence"
                            aria-label="Search evidence"
                            disabled={
                                pending ||
                                search.isPending ||
                                !evidence.data?.coverage.can_query
                            }
                            className="p-2 text-emerald-700 disabled:opacity-40"
                        >
                            <Search size={18} />
                        </button>
                    </form>
                    {matches && (
                        <div className="max-h-52 shrink-0 overflow-auto border-b px-4 py-2 text-sm">
                            <p className="mb-2 text-xs text-gray-500">
                                Source matches / not a verified answer
                                {search.data?.truncated
                                    ? " / more matches omitted"
                                    : ""}
                            </p>
                            {!matches.length && (
                                <p>
                                    No reliable matching passage found. This
                                    does not establish that the information is
                                    absent from the original.
                                </p>
                            )}
                            {matches.map((match) => (
                                <button
                                    key={match.id}
                                    type="button"
                                    className="block w-full border-b py-2 text-left"
                                    onClick={() => {
                                        setNumber(match.page);
                                        setSelected(match.block_id);
                                        setPane("source");
                                    }}
                                >
                                    <span className="font-semibold text-emerald-800">
                                        Page {match.page}
                                    </span>
                                    <span className="ml-2 whitespace-pre-wrap break-words">
                                        {match.text}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                    <div
                        role="tablist"
                        aria-label="Evidence view"
                        className="flex border-b lg:hidden"
                    >
                        {["evidence", "source"].map((item) => (
                            <button
                                key={item}
                                role="tab"
                                aria-selected={pane === item}
                                onClick={() => setPane(item)}
                                className={`flex-1 border-b-2 p-2 text-sm capitalize ${pane === item ? "border-emerald-600" : "border-transparent"}`}
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                    {page && (
                        <div className="grid min-h-0 flex-1 lg:grid-cols-2">
                            <div
                                className={`min-w-0 overflow-auto ${pane === "evidence" ? "block" : "hidden lg:block"}`}
                            >
                                <PageLayout
                                    page={page}
                                    selected={selected}
                                    select={(block) => {
                                        setSelected(block.id);
                                        setPane("source");
                                    }}
                                />
                            </div>
                            <div
                                className={`min-w-0 overflow-auto border-l bg-gray-100 ${pane === "source" ? "block" : "hidden lg:block"}`}
                            >
                                <SourcePage
                                    id={documentId}
                                    page={page}
                                    block={active}
                                    sourceHash={revision.structure.source_hash}
                                />
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
