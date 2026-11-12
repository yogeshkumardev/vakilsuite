"use client";

import { useEffect, useRef, useState } from "react";
import { documentsApi, JobStatusResponse } from "@/lib/api/documents";

type TerminalStatus = "completed" | "failed";

interface UseJobPollerOptions {
    jobId: string | null;
    intervalMs?: number;
    timeoutMs?: number;
    onComplete?: (result: JobStatusResponse["result"]) => void;
    onFailed?: (error: string | null) => void;
}

interface JobPollerState {
    status: JobStatusResponse["status"] | null;
    result: JobStatusResponse["result"];
    error: string | null;
    isPolling: boolean;
}

const TERMINAL: TerminalStatus[] = ["completed", "failed"];

export function useJobPoller({
    jobId,
    intervalMs = 2000,
    timeoutMs = 150_000,
    onComplete,
    onFailed,
}: UseJobPollerOptions): JobPollerState {
    const [state, setState] = useState<JobPollerState>({
        status: null,
        result: null,
        error: null,
        isPolling: false,
    });

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const onCompleteRef = useRef(onComplete);
    const onFailedRef = useRef(onFailed);

    useEffect(() => {
        onCompleteRef.current = onComplete;
        onFailedRef.current = onFailed;
    });

    useEffect(() => {
        if (!jobId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setState({
                status: null,
                result: null,
                error: null,
                isPolling: false,
            });
            return;
        }

        let cancelled = false;
        const startedAt = Date.now();

        const poll = async () => {
            if (Date.now() - startedAt > timeoutMs) {
                const message = "Processing timed out. Check Celery worker and retry.";
                if (intervalRef.current) clearInterval(intervalRef.current);
                setState({
                    status: "failed",
                    result: null,
                    error: message,
                    isPolling: false,
                });
                onFailedRef.current?.(message);
                return;
            }

            try {
                const res = await documentsApi.getJobStatus(jobId);
                if (cancelled) return;

                const { status, result, error } = res;
                const isTerminal = TERMINAL.includes(status as TerminalStatus);

                setState({ status, result, error, isPolling: !isTerminal });

                if (status === "completed") {
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    onCompleteRef.current?.(result);
                } else if (status === "failed") {
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    onFailedRef.current?.(error);
                }
            } catch {
                if (cancelled) return;
                if (intervalRef.current) clearInterval(intervalRef.current);
                setState((prev) => ({ ...prev, isPolling: false }));
            }
        };

        // First poll after a tick — avoids setState-in-effect lint error
        const timeout = setTimeout(() => {
            setState({
                status: "pending",
                result: null,
                error: null,
                isPolling: true,
            });
            poll();
            intervalRef.current = setInterval(poll, intervalMs);
        }, 0);

        return () => {
            cancelled = true;
            clearTimeout(timeout);
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [jobId, intervalMs, timeoutMs]);

    return state;
}
