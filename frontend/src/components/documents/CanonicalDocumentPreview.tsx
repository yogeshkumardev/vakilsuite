"use client";

import {
    CanonicalDocument,
    CanonicalDocumentBlock,
} from "@/lib/api/documents";
import { AlertTriangle } from "lucide-react";

interface CanonicalDocumentPreviewProps {
    document: CanonicalDocument;
    className?: string;
}

function blockPage(block: CanonicalDocumentBlock) {
    return block.source_refs[0]?.page_number ?? 1;
}

function ReviewIndicator({ block }: { block: CanonicalDocumentBlock }) {
    if (!block.review_required) return null;
    const title = block.warnings.length
        ? block.warnings.join("\n")
        : "Low-confidence source content";
    return (
        <span
            title={title}
            className="absolute -left-5 top-1 text-amber-600"
            aria-label={title}
        >
            <AlertTriangle className="h-3.5 w-3.5" />
        </span>
    );
}

function CanonicalBlockView({ block }: { block: CanonicalDocumentBlock }) {
    if ((block.type === "heading" || block.type === "generic") && block.heading) {
        const title = block.semantic_role === "title" || block.level === 1;
        return (
            <div className="relative">
                <ReviewIndicator block={block} />
                {title ? (
                    <h1 className="my-4 text-center text-base font-bold uppercase leading-6 text-slate-950">
                        {block.heading}
                    </h1>
                ) : (
                    <h2 className="mb-2 mt-5 text-sm font-bold leading-6 text-slate-950">
                        {block.heading}
                    </h2>
                )}
            </div>
        );
    }

    if ((block.type === "paragraph" || block.type === "signature") && block.text) {
        return (
            <div className="relative">
                <ReviewIndicator block={block} />
                <p className={`my-3 whitespace-pre-line text-[15px] leading-7 text-slate-950 ${block.type === "signature" ? "text-right" : "text-justify"}`}>
                    {block.text}
                </p>
            </div>
        );
    }

    if (block.type === "key_value" && block.fields.length) {
        return (
            <div className="relative my-4 border-y border-slate-300">
                <ReviewIndicator block={block} />
                {block.fields.map((field, index) => (
                    <div
                        key={`${field.label}-${index}`}
                        className="grid grid-cols-[minmax(8rem,34%)_1fr] border-b border-slate-200 last:border-b-0"
                    >
                        <div className="bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-800">
                            {field.label}
                        </div>
                        <div className="px-3 py-2 text-sm leading-5 text-slate-950">
                            {field.value || " "}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (block.type === "table" && (block.headers.length || block.rows.length)) {
        return (
            <div className="relative my-4 overflow-x-auto">
                <ReviewIndicator block={block} />
                <table className="w-full border-collapse text-left text-xs leading-5 text-slate-950">
                    {block.headers.length ? (
                        <thead>
                            <tr>
                                {block.headers.map((header, index) => (
                                    <th key={`${header}-${index}`} className="border border-slate-400 bg-slate-100 px-2 py-2 font-bold">
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                    ) : null}
                    <tbody>
                        {block.rows.map((row, rowIndex) => (
                            <tr key={`${block.id}-row-${rowIndex}`}>
                                {row.map((cell, cellIndex) => (
                                    <td key={`${block.id}-${rowIndex}-${cellIndex}`} className="border border-slate-300 px-2 py-2 align-top">
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    if (block.type === "list" && block.items.length) {
        const List = block.ordered ? "ol" : "ul";
        return (
            <div className="relative my-3">
                <ReviewIndicator block={block} />
                <List className={`${block.ordered ? "list-decimal" : "list-disc"} space-y-1 pl-7 text-[15px] leading-7 text-slate-950`}>
                    {block.items.map((item, index) => <li key={`${block.id}-${index}`}>{item}</li>)}
                </List>
            </div>
        );
    }

    return null;
}

export function CanonicalDocumentPreview({ document, className = "" }: CanonicalDocumentPreviewProps) {
    const pages = new Map<number, CanonicalDocumentBlock[]>();
    for (const block of document.blocks) {
        const page = blockPage(block);
        pages.set(page, [...(pages.get(page) ?? []), block]);
    }

    return (
        <div className={`space-y-4 ${className}`}>
            {[...pages.entries()].map(([pageNumber, blocks]) => (
                <section
                    key={pageNumber}
                    className="mx-auto min-h-[11in] w-full max-w-[8.5in] border border-slate-200 bg-white shadow-sm [content-visibility:auto]"
                >
                    <div className="border-b border-slate-100 px-6 py-2 text-right text-[10px] font-medium text-slate-400">
                        Page {pageNumber}
                    </div>
                    <article className="px-8 py-8 [font-family:'Times_New_Roman',Times,serif] md:px-12 md:py-10">
                        {blocks.map((block) => <CanonicalBlockView key={block.id} block={block} />)}
                    </article>
                </section>
            ))}
        </div>
    );
}
