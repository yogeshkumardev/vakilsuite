"use client";

import { ReactNode } from "react";
import { ArrowRight, Check, TriangleAlert } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { Badge, type BadgeTone } from "@/components/ui/Badge";

export type StepState = "idle" | "running" | "completed" | "failed" | "locked";

interface WorkflowStepCardProps {
    step: number;
    title: string;
    description: string;
    state: StepState;
    lockReason?: string;       // shown when state === "locked"
    errorMessage?: string;     // shown when state === "failed"
    actionLabel?: string;      // primary button label
    rerunLabel?: string;       // shown as small link when completed
    onAction?: () => void;
    onRerun?: () => void;
    children?: ReactNode;      // extra content (e.g. extracted fields preview)
}

const stateStyles: Record<StepState, { card: string; badge: string; badgeLabel: string; dot: string }> = {
    idle:      { card: "bg-white border-slate-200",          badge: "bg-slate-100 text-slate-500",          badgeLabel: "Not started", dot: "bg-slate-300" },
    running:   { card: "bg-blue-50 border-blue-200",         badge: "bg-blue-100 text-blue-700",            badgeLabel: "Running…",    dot: "bg-blue-500 animate-pulse" },
    completed: { card: "bg-emerald-50 border-emerald-200",   badge: "bg-emerald-100 text-emerald-700",      badgeLabel: "Completed",   dot: "bg-emerald-500" },
    failed:    { card: "bg-red-50 border-red-200",           badge: "bg-red-100 text-red-600",              badgeLabel: "Failed",      dot: "bg-red-500" },
    locked:    { card: "bg-slate-50 border-slate-100",       badge: "bg-slate-100 text-slate-400",          badgeLabel: "Locked",      dot: "bg-slate-200" },
};

const stateTones: Record<StepState, BadgeTone> = {
    idle: "neutral",
    running: "info",
    completed: "success",
    failed: "danger",
    locked: "neutral",
};

export function WorkflowStepCard({
    step,
    title,
    description,
    state,
    lockReason,
    errorMessage,
    actionLabel,
    rerunLabel,
    onAction,
    onRerun,
    children,
}: WorkflowStepCardProps) {
    const s = stateStyles[state];
    const isLocked = state === "locked";
    const isRunning = state === "running";

    return (
        <div className={`rounded-lg border p-4 transition-all duration-200 ${s.card}`}>
            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                    {/* Step number circle */}
                    <div className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        state === "completed" ? "bg-emerald-500 text-white" :
                        state === "running"   ? "bg-blue-500 text-white" :
                        state === "failed"    ? "bg-red-500 text-white" :
                        state === "locked"    ? "bg-slate-200 text-slate-400" :
                                               "bg-slate-200 text-slate-600"
                    }`}>
                        {state === "completed" ? <Check className="h-3.5 w-3.5" /> : state === "failed" ? <TriangleAlert className="h-3.5 w-3.5" /> : step}
                    </div>

                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className={`text-sm font-semibold ${isLocked ? "text-slate-400" : "text-slate-800"}`}>
                                {title}
                            </h3>
                            <Badge tone={stateTones[state]}>
                                {s.badgeLabel}
                            </Badge>
                        </div>
                        <p className={`text-xs mt-0.5 ${isLocked ? "text-slate-400" : "text-slate-500"}`}>
                            {isLocked && lockReason ? lockReason : description}
                        </p>
                    </div>
                </div>

                {/* Running spinner */}
                {isRunning && (
                    <div className="flex-shrink-0 mt-1">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                    </div>
                )}
            </div>

            {/* Error message */}
            {state === "failed" && errorMessage && (
                <p className="mt-2 ml-9 text-xs text-red-600 bg-red-100 rounded-lg px-3 py-2">
                    {errorMessage}
                </p>
            )}

            {/* Extra content slot (e.g. field previews) */}
            {children && !isLocked && (
                <div className="mt-3 ml-9">
                    {children}
                </div>
            )}

            {/* Action buttons */}
            {!isLocked && !isRunning && (
                <div className="mt-3 ml-9 flex items-center gap-3">
                    {actionLabel && onAction && state !== "completed" && (
                        <Button
                            onClick={onAction}
                            size="sm"
                            rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                        >
                            {actionLabel}
                        </Button>
                    )}
                    {state === "completed" && rerunLabel && onRerun && (
                        <button
                            type="button"
                            onClick={onRerun}
                            className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors"
                        >
                            {rerunLabel}
                        </button>
                    )}
                    {actionLabel && onAction && state === "completed" && (
                        <Button
                            onClick={onAction}
                            size="sm"
                            variant="secondary"
                            rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                        >
                            {actionLabel}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
