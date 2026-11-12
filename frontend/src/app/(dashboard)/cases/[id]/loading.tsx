export default function CaseDetailLoading() {
    return (
        <div className="space-y-4 animate-pulse p-6">
            <div className="h-4 bg-slate-100 rounded w-48 mb-2" />
            <div className="h-8 bg-slate-100 rounded-lg w-96" />
            <div className="h-6 bg-slate-100 rounded w-24 mt-2" />
            <div className="flex gap-2 mt-6 border-b border-slate-200 pb-3">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-8 bg-slate-100 rounded-lg w-28" />
                ))}
            </div>
            <div className="grid grid-cols-3 gap-5 mt-6">
                <div className="col-span-2 h-64 bg-slate-100 rounded-lg" />
                <div className="h-64 bg-slate-100 rounded-lg" />
            </div>
        </div>
    );
}
