"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { courtroomApi } from "@/lib/api/courtroom";
import { CourtroomChat } from "@/features/courtroom/components/CourtroomChat";
import { WeakPointsSummary } from "@/features/courtroom/components/WeakPointsSummary";

export default function CourtroomSessionPage() {
    const params = useParams();
    const router = useRouter();
    const caseId = params.id as string;
    const sessionId = params.session_id as string;
    const queryClient = useQueryClient();

    const { data: session, isLoading } = useQuery({
        queryKey: ["courtroom_session", sessionId],
        queryFn: () => courtroomApi.getSession(sessionId),
    });

    if (isLoading) {
        return <div className="p-10 text-center text-slate-500">Loading session...</div>;
    }

    if (!session) {
        return <div className="p-10 text-center text-red-500">Session not found</div>;
    }

    return (
        <div className="flex h-full flex-col bg-slate-50">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
                <div>
                    <button
                        onClick={() => router.push(`/cases/${caseId}/courtroom`)}
                        className="text-xs font-medium text-slate-500 hover:text-slate-800 mb-1"
                    >
                        ← Back to Courtroom
                    </button>
                    <h1 className="text-xl font-bold text-slate-900">{session.title}</h1>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6 max-w-5xl mx-auto w-full">
                <div className="h-[600px]">
                    <CourtroomChat 
                        session={session} 
                        onSessionEnd={() => {
                            queryClient.invalidateQueries({ queryKey: ["courtroom_session", sessionId] });
                        }} 
                    />
                </div>
                
                {session.status === "completed" && (
                    <WeakPointsSummary session={session} />
                )}
            </div>
        </div>
    );
}
