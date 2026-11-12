"use client";

import { useQuery } from "@tanstack/react-query";
import { causeListingsApi } from "@/lib/api/cause_listings";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

export function MyMatchesBanner() {
    const { data: matches, isLoading } = useQuery({
        queryKey: ["cause_listings_matches"],
        queryFn: () => causeListingsApi.getMyMatches(),
    });

    if (isLoading) return null;
    if (!matches || matches.length === 0) return null;

    return (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
                <div className="flex-1">
                    <h3 className="text-sm font-bold text-amber-900">
                        Attention: You have {matches.length} case(s) listed today
                    </h3>
                    <div className="mt-2 flex flex-col gap-2">
                        {matches.map((match) => (
                            <div
                                key={match.id}
                                className="flex items-center justify-between rounded bg-amber-100/50 px-3 py-2 text-sm"
                            >
                                <div>
                                    <span className="font-semibold text-amber-900">
                                        Court {match.court_number} (Serial: {match.serial_number})
                                    </span>
                                    <span className="mx-2 text-amber-700">•</span>
                                    <span className="text-amber-800">{match.case_number}</span>
                                </div>
                                <Link
                                    href={`/cases/${match.matched_case_id}`}
                                    className="font-medium text-amber-700 hover:text-amber-900 hover:underline"
                                >
                                    View Case →
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
