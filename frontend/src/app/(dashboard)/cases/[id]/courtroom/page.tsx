"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { courtroomApi } from "@/lib/api/courtroom";
import { SessionTypeSelector } from "@/features/courtroom/components/SessionTypeSelector";
import Link from "next/link";
import { Scale, Users, Calendar } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { WorkspacePage } from "@/components/ui/WorkspacePage";

export default function CourtroomPage() {
    const params = useParams();
    const caseId = params.id as string;

    const { data: sessions, isLoading } = useQuery({
        queryKey: ["courtroom_sessions", caseId],
        queryFn: () => courtroomApi.listSessions(caseId),
    });

    return (
        <WorkspacePage variant="wide">
            <PageHeader title="Courtroom Strategy" description="Practice your arguments with AI before your hearing." />
            <div>
                <SessionTypeSelector caseId={caseId} />

                <div className="mt-12 max-w-4xl mx-auto">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Past Sessions</h2>
                    
                    {isLoading ? (
                        <div className="text-slate-500">Loading sessions...</div>
                    ) : !sessions || sessions.length === 0 ? (
                        <Surface className="p-8 text-center text-slate-500">
                            No practice sessions yet. Select a mode above to start.
                        </Surface>
                    ) : (
                        <div className="space-y-4">
                            {sessions.map((session) => {
                                const isJudge = session.session_type === "judge";
                                const Icon = isJudge ? Scale : Users;
                                
                                return (
                                    <Link
                                        key={session.id}
                                        href={`/cases/${caseId}/courtroom/${session.id}`}
                                        className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-lg ${isJudge ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                <Icon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900">{session.title}</h3>
                                                <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(session.created_at).toLocaleDateString()}
                                                    </span>
                                                    <span>{session.turn_count} turns</span>
                                                    <span className={`capitalize ${session.status === 'active' ? 'text-green-600' : ''}`}>
                                                        {session.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-sm font-medium text-slate-600">
                                            View Session →
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </WorkspacePage>
    );
}
