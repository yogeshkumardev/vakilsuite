import Link from "next/link";

export default function DashboardNotFound() {
    return (
        <div className="flex h-full items-center justify-center p-10">
            <div className="max-w-md text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                    <span className="text-2xl">🔍</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">Page not found</h2>
                <p className="text-sm text-slate-500 mb-6">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>
                <Link
                    href="/"
                    className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                    Back to Dashboard
                </Link>
            </div>
        </div>
    );
}
