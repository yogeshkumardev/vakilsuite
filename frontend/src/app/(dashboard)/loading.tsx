export default function DashboardLoading() {
    return (
        <div className="p-6 space-y-6 animate-pulse">
            <div className="h-8 bg-slate-100 rounded-lg w-48" />
            <div className="grid grid-cols-3 gap-4">
                <div className="h-24 bg-slate-100 rounded-lg" />
                <div className="h-24 bg-slate-100 rounded-lg" />
                <div className="h-24 bg-slate-100 rounded-lg" />
            </div>
            <div className="h-48 bg-slate-100 rounded-lg" />
        </div>
    );
}
