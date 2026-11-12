"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Scale, Users } from "lucide-react";
import { courtroomApi, SessionType } from "@/lib/api/courtroom";

export function SessionTypeSelector({ caseId }: { caseId: string }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleCreate = async (type: SessionType) => {
        try {
            setIsLoading(true);
            const res = await courtroomApi.createSession(caseId, { session_type: type });
            router.push(`/cases/${caseId}/courtroom/${res.id}`);
        } catch (error) {
            console.error(error);
            setIsLoading(false);
            alert("Failed to create session");
        }
    };

    return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 max-w-4xl mx-auto mt-10">
            <button
                onClick={() => handleCreate("opposing_counsel")}
                disabled={isLoading}
                className="flex flex-col items-center justify-center p-8 text-center bg-white border border-slate-200 rounded-lg hover:border-blue-500 hover:ring-1 hover:ring-blue-500 transition-all disabled:opacity-50"
            >
                <div className="w-16 h-16 mb-4 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                    <Users className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Practice with Opposing Counsel</h3>
                <p className="text-sm text-slate-500">
                    The AI will act as adversarial counsel, finding every possible flaw in your arguments based on the case facts.
                </p>
            </button>

            <button
                onClick={() => handleCreate("judge")}
                disabled={isLoading}
                className="flex flex-col items-center justify-center p-8 text-center bg-white border border-slate-200 rounded-lg hover:border-purple-500 hover:ring-1 hover:ring-purple-500 transition-all disabled:opacity-50"
            >
                <div className="w-16 h-16 mb-4 bg-purple-50 rounded-full flex items-center justify-center text-purple-600">
                    <Scale className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Practice with Judge</h3>
                <p className="text-sm text-slate-500">
                    The AI will act as a strict High Court Judge, probing maintainability, limitation periods, and merits.
                </p>
            </button>
        </div>
    );
}
