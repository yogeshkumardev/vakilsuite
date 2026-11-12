"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { causeListingsApi } from "@/lib/api/cause_listings";
import { jobsApi } from "@/lib/api/jobs";
import {
    Search,
    Calendar as CalendarIcon,
    RefreshCw,
    Loader2,
    Clock,
} from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/shared/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { WorkspacePage } from "@/components/ui/WorkspacePage";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function todayISO() {
    return new Date().toISOString().split("T")[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Scrape status banner
// ─────────────────────────────────────────────────────────────────────────────

type ScrapePhase = "idle" | "queued" | "processing" | "done" | "failed";

interface ScrapeBannerProps {
    phase: ScrapePhase;
    message?: string;
    error?: string | null;
}

function ScrapeBanner({ phase, message, error }: ScrapeBannerProps) {
    if (phase === "idle") return null;

    if (phase === "queued" || phase === "processing") {
        return (
            <Alert tone="info" title={phase === "queued" ? "Cause list queued" : "Fetching from AHC"}>
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-600" />
                Downloading the PDF and parsing about 26,000 case entries. Usually takes 40-60 seconds.
            </Alert>
        );
    }

    if (phase === "done") {
        return (
            <Alert tone="success" title="Cause list updated">
                {message || "Cause list updated successfully."}
            </Alert>
        );
    }

    // failed
    return (
        <Alert tone="danger" title="Cause list could not be updated">
            {error || "Scrape failed. Please try again."}
        </Alert>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function CauseListPage() {
    const queryClient = useQueryClient();

    // ── Filter state ──────────────────────────────────────────────────────────
    const [date, setDate]                 = useState(todayISO());
    const [courtNumber, setCourtNumber]   = useState("");
    const [search, setSearch]             = useState("");
    const [activeSearch, setActiveSearch] = useState("");
    const [activeCourt, setActiveCourt]   = useState("");

    // ── Scrape job state ──────────────────────────────────────────────────────
    const [scrapeJobId, setScrapeJobId]   = useState<string | null>(null);
    const [scrapePhase, setScrapePhase]   = useState<ScrapePhase>("idle");
    const [scrapeMsg, setScrapeMsg]       = useState("");
    const [scrapeError, setScrapeError]   = useState<string | null>(null);

    // ── Listings query ────────────────────────────────────────────────────────
    const { data: listings, isLoading: listingsLoading } = useQuery({
        queryKey: ["cause_listings", date, activeCourt, activeSearch],
        queryFn: () =>
            causeListingsApi
                .getListings(date, activeCourt || undefined, activeSearch || undefined)
                .then((r) => r.listings),
    });

    // ── Job status polling ────────────────────────────────────────────────────
    const { data: jobStatus } = useQuery({
        queryKey: ["scrape_job", scrapeJobId],
        queryFn: () => jobsApi.getStatus(scrapeJobId!),
        enabled: !!scrapeJobId && (scrapePhase === "queued" || scrapePhase === "processing"),
        refetchInterval: 3000,
    });

    // React to job status changes
    useEffect(() => {
        if (!jobStatus) return;

        if (jobStatus.status === "processing") {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setScrapePhase("processing");
        } else if (jobStatus.status === "completed") {
             
            setScrapePhase("done");
             
            setScrapeJobId(null);
            const stats = jobStatus.result as Record<string, number> | null;
            if (stats) {
                const matched = stats.matched ?? 0;
                const total   = stats.total ?? 0;
                if (total === 0) {
                     
                    setScrapeMsg("No listings published for this date yet.");
                } else if (matched === 0) {
                     
                    setScrapeMsg(`Fetched ${total} listings — none matched your active cases.`);
                } else {
                     
                    setScrapeMsg(
                        `Fetched ${total} listings — ${matched} case${matched !== 1 ? "s" : ""} matched!`
                    );
                }
            } else {
                 
                setScrapeMsg("Cause list updated.");
            }
            // Refresh the table
            queryClient.invalidateQueries({ queryKey: ["cause_listings", date] });
        } else if (jobStatus.status === "failed") {
             
            setScrapePhase("failed");
             
            setScrapeError(jobStatus.error || "Scrape failed.");
             
            setScrapeJobId(null);
        }
    }, [jobStatus, queryClient, date]);

    // ── Trigger scrape mutation ───────────────────────────────────────────────
    const scrapeMut = useMutation({
        mutationFn: () => causeListingsApi.triggerScrape(date),
        onSuccess: (data) => {
            setScrapeJobId(data.job_id);
            setScrapePhase("queued");
            setScrapeError(null);
            setScrapeMsg("");
        },
        onError: (err: Error) => {
            setScrapePhase("failed");
            setScrapeError(err.message || "Failed to queue scrape.");
        },
    });

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setActiveSearch(search);
        setActiveCourt(courtNumber);
    };

    const handleGetCauseList = () => {
        setScrapePhase("idle");
        setScrapeError(null);
        setScrapeMsg("");
        scrapeMut.mutate();
    };

    const handleDateChange = (newDate: string) => {
        setDate(newDate);
        setScrapePhase("idle");
        setScrapeJobId(null);
    };

    const isScrapePending =
        scrapeMut.isPending || scrapePhase === "queued" || scrapePhase === "processing";

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <WorkspacePage>
            <PageHeader
                title="Cause List"
                description="Allahabad High Court daily court listings"
                metadata={
                    <span className="flex items-center gap-1 text-xs font-normal text-slate-400">
                    <Clock className="h-3 w-3" />
                    Fetching downloads about 32 MB and takes about 40 seconds
                    </span>
                }
                actions={
                    <Button
                        onClick={handleGetCauseList}
                        loading={isScrapePending}
                        leftIcon={<RefreshCw className="h-4 w-4" />}
                    >
                        {isScrapePending ? "Fetching" : "Get Cause List"}
                    </Button>
                }
            />

            <Surface className="mb-5 p-3">
                <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
                    <div className="relative w-full sm:w-[180px]">
                        <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            type="date"
                            value={date}
                            onChange={(e) => handleDateChange(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    <div className="w-full sm:w-[130px]">
                        <Input
                            type="text"
                            placeholder="Court No."
                            value={courtNumber}
                            onChange={(e) => setCourtNumber(e.target.value)}
                        />
                    </div>

                    <div className="relative min-w-[200px] flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="Search case number, title or advocate…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    <Button type="submit" variant="secondary">
                        Search
                    </Button>
                </form>
            </Surface>

            <div className="space-y-4">

                {/* Scrape status banner */}
                <ScrapeBanner
                    phase={scrapePhase}
                    message={scrapeMsg}
                    error={scrapeError}
                />

                {/* Listings table */}
                {listingsLoading ? (
                    <div className="flex h-40 items-center justify-center gap-2 text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm">Loading listings…</span>
                    </div>
                ) : listings && listings.length > 0 ? (
                    <Surface className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-4 py-3">Court</th>
                                    <th className="px-4 py-3">S.No.</th>
                                    <th className="px-4 py-3">Case Number</th>
                                    <th className="px-4 py-3">Parties</th>
                                    <th className="px-4 py-3">Advocate</th>
                                    <th className="px-4 py-3">Remarks</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {listings.map((listing) => (
                                    <tr
                                        key={listing.id}
                                        className={`hover:bg-slate-50 ${
                                            listing.matched_case_id ? "bg-amber-50/60" : ""
                                        }`}
                                    >
                                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">
                                            {listing.court_number}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">
                                            {listing.serial_number}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="font-medium text-slate-900">
                                                {listing.case_number}
                                            </span>
                                            {listing.matched_case_id && (
                                                <Badge tone="warning" className="ml-2">
                                                    Your Case
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div
                                                className="max-w-xs truncate text-slate-700"
                                                title={listing.case_title ?? ""}
                                            >
                                                {listing.case_title}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">
                                            {listing.advocate_name}
                                        </td>
                                        <td className="px-4 py-3">
                                            {listing.remarks && (
                                                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                                                    {listing.remarks}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Surface>
                ) : (
                    <EmptyState
                        title="No listings found"
                        description={
                            scrapePhase === "idle"
                                ? `Click "Get Cause List" to fetch listings for ${date} from AHC.`
                                : scrapePhase === "done"
                                ? "No listings were found for this date."
                                : "Waiting for scrape to complete…"
                        }
                    />
                )}
            </div>
        </WorkspacePage>
    );
}
