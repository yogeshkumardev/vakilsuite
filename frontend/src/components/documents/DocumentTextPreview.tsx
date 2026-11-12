"use client";

import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

interface DocumentTextPreviewProps {
    content: string;
    className?: string;
}

interface PreviewPage {
    pageNumber: number | null;
    content: string;
}

const PAGE_BLOCK_PATTERN = /\[\[PAGE\s+(\d+)\s+START\]\]\s*([\s\S]*?)\s*\[\[PAGE\s+\1\s+END\]\]/gi;
const EMPTY_DETECTION_PATTERN = /^\s*[[(](?:no text(?: or math)? detected)[\])]\s*$/gim;
const ORPHAN_PAGE_MARKER_PATTERN = /^\s*\[\[PAGE\s+\d+\s+(?:START|END)\]\]\s*$/gim;

function cleanPageContent(content: string) {
    return content
        .replace(EMPTY_DETECTION_PATTERN, "")
        .replace(ORPHAN_PAGE_MARKER_PATTERN, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

export function splitDocumentPages(content: string): PreviewPage[] {
    const pages: PreviewPage[] = [];
    for (const match of content.matchAll(PAGE_BLOCK_PATTERN)) {
        pages.push({
            pageNumber: Number(match[1]),
            content: cleanPageContent(match[2]),
        });
    }
    if (pages.length > 0) return pages;
    return [{ pageNumber: null, content: cleanPageContent(content) }];
}

export function DocumentTextPreview({ content, className = "" }: DocumentTextPreviewProps) {
    const pages = splitDocumentPages(content);

    return (
        <div className={`space-y-4 ${className}`}>
            {pages.map((page, index) => (
                <section
                    key={page.pageNumber ?? index}
                    className="mx-auto w-full max-w-[8.5in] overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm"
                >
                    {page.pageNumber !== null ? (
                        <div className="border-b border-slate-100 px-6 py-2 text-right text-[10px] font-medium text-slate-400">
                            Page {page.pageNumber}
                        </div>
                    ) : null}
                    <article className="prose prose-slate max-w-none px-6 py-7 [font-family:'Times_New_Roman',Times,serif] prose-headings:font-semibold prose-headings:tracking-normal prose-p:my-3 prose-p:text-[15px] prose-p:leading-7 prose-li:text-[15px] prose-li:leading-7 prose-table:my-4 md:px-10 md:py-9">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw, rehypeSanitize]}
                            components={{
                                table: ({ children }) => (
                                    <div className="overflow-x-auto rounded border border-slate-300">
                                        <table className="m-0 w-full border-collapse text-left text-xs">
                                            {children}
                                        </table>
                                    </div>
                                ),
                                th: ({ children }) => (
                                    <th className="border border-slate-300 bg-slate-100 px-2 py-2 font-semibold text-slate-800">
                                        {children}
                                    </th>
                                ),
                                td: ({ children }) => (
                                    <td className="border border-slate-300 px-2 py-2 align-top text-slate-700">
                                        {children}
                                    </td>
                                ),
                            }}
                        >
                            {page.content || "No readable text was detected on this page."}
                        </ReactMarkdown>
                    </article>
                </section>
            ))}
        </div>
    );
}
