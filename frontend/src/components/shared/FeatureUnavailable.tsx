import Link from "next/link";

export function FeatureUnavailable() {
    return (
        <section className="space-y-3 p-6">
            <h1 className="text-xl font-semibold">Feature not available yet</h1>
            <p className="text-slate-600">This workflow is paused during the rebuild. Cases, document uploads and original files remain available.</p>
            <Link className="text-emerald-700 underline" href="/cases">Back to cases</Link>
        </section>
    );
}
