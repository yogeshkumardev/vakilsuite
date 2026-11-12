export default function CasesLoading() {
    return (
        <div className="p-6 space-y-4 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="h-8 bg-slate-100 rounded-lg w-32" />
                <div className="h-10 bg-slate-100 rounded-lg w-36" />
            </div>
            <div className="h-10 bg-slate-100 rounded-lg w-full" />
            {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-100 rounded-lg" />
            ))}
        </div>
    );
}
