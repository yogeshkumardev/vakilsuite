import Link from "next/link";
import { FileSearch, ArrowLeft } from "lucide-react";
export default function NotFound() {
    return <main className="flex min-h-[75vh] items-center justify-center bg-slate-50 p-6"><section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <FileSearch aria-hidden className="mb-6 h-10 w-10 text-indigo-600" /><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Page unavailable · 404</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Let’s find your work</h1><p className="mt-3 text-sm leading-6 text-slate-600">This link may have changed or the page may no longer exist. Open your cases to continue.</p>
        <Link href="/cases" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"><ArrowLeft aria-hidden className="h-4 w-4" />Back to cases</Link>
    </section></main>;
}
