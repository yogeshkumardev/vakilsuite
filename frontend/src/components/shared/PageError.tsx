"use client";
import Link from "next/link";
import { FileWarning, RotateCcw, ArrowLeft, ShieldCheck } from "lucide-react";

export function PageError({ retry, title = "Let’s get your workspace back", description = "This page couldn’t finish loading. Try again, or return to your cases and reopen it.", backHref = "/cases", backLabel = "Back to cases", digest }: {
    retry: () => void; title?: string; description?: string; backHref?: string; backLabel?: string; digest?: string;
}) {
    const reference = digest && /^[a-zA-Z0-9_-]{1,64}$/.test(digest) ? digest : null;
    return <section className="flex min-h-[65vh] items-center justify-center bg-slate-50 px-4 py-10" aria-labelledby="page-error-title">
        <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="p-6 sm:p-10">
                <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700"><FileWarning aria-hidden className="h-7 w-7" /></span>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">VakilSuite workspace</p>
                <h1 id="page-error-title" className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
                <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                    <button onClick={retry} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"><RotateCcw aria-hidden className="h-4 w-4" />Try again</button>
                    <Link href={backHref} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-indigo-600"><ArrowLeft aria-hidden className="h-4 w-4" />{backLabel}</Link>
                </div>
                {reference && <p className="mt-5 text-xs text-slate-500">Support reference: {reference}</p>}
            </div>
            <div className="flex gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 text-sm leading-6 text-slate-600 sm:px-10"><ShieldCheck aria-hidden className="mt-1 h-5 w-5 shrink-0" /><p>Reopening this page does not start another AI request. Changes that hadn’t saved may need to be entered again.</p></div>
        </div>
    </section>;
}
