export default function CauseListLoading() {
    return (
        <div className="flex h-full flex-col">
            <div className="border-b border-slate-200 bg-white px-6 py-4 animate-pulse">
                <div className="h-8 bg-slate-100 rounded-lg w-40 mb-2" />
                <div className="h-4 bg-slate-100 rounded-lg w-64" />
                <div className="mt-6 flex gap-4">
                    <div className="h-10 bg-slate-100 rounded-lg w-48" />
                    <div className="h-10 bg-slate-100 rounded-lg w-32" />
                    <div className="h-10 bg-slate-100 rounded-lg flex-1" />
                    <div className="h-10 bg-slate-100 rounded-lg w-24" />
                </div>
            </div>
            <div className="flex-1 p-6 animate-pulse">
                <div className="h-64 bg-slate-100 rounded-lg" />
            </div>
        </div>
    );
}
