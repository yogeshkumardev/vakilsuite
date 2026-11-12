"use client";

import { CourtroomSession } from "@/lib/api/courtroom";
import { AlertTriangle, Lightbulb } from "lucide-react";

export function WeakPointsSummary({ session }: { session: CourtroomSession }) {
    if (!session.weak_points_identified || session.weak_points_identified.length === 0) {
        return null;
    }

    return (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm mt-6">
            <div className="p-5 border-b border-slate-200 bg-red-50 flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <h2 className="text-xl font-bold text-slate-900">Session Analysis: Weak Points</h2>
            </div>
            <div className="p-6 space-y-6">
                <p className="text-sm text-slate-600">
                    The AI has analyzed your argument session and identified the following vulnerabilities in your case strategy:
                </p>
                <div className="space-y-4">
                    {session.weak_points_identified.map((wp, i) => (
                        <div key={i} className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                            <h3 className="font-bold text-slate-900 flex items-start gap-2">
                                <span className="bg-red-100 text-red-700 w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                                    {i + 1}
                                </span>
                                {wp.point}
                            </h3>
                            <div className="mt-3 flex items-start gap-2 text-sm text-slate-700 bg-amber-50 p-3 rounded-md border border-amber-100">
                                <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0" />
                                <div>
                                    <span className="font-semibold text-amber-900">Suggestion: </span>
                                    {wp.suggestion}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
