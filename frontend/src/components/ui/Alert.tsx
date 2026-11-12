import { AlertCircle, AlertTriangle, CheckCircle2, Info, type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

type AlertTone = "info" | "success" | "warning" | "danger";

const CONFIG: Record<AlertTone, { classes: string; icon: LucideIcon }> = {
    info: { classes: "border-blue-200 bg-blue-50 text-blue-800", icon: Info },
    success: { classes: "border-emerald-200 bg-emerald-50 text-emerald-800", icon: CheckCircle2 },
    warning: { classes: "border-amber-200 bg-amber-50 text-amber-900", icon: AlertTriangle },
    danger: { classes: "border-red-200 bg-red-50 text-red-800", icon: AlertCircle },
};

interface AlertProps {
    tone?: AlertTone;
    title?: ReactNode;
    children: ReactNode;
    actions?: ReactNode;
    className?: string;
}

export function Alert({ tone = "info", title, children, actions, className = "" }: AlertProps) {
    const { classes, icon: Icon } = CONFIG[tone];
    return (
        <div className={`flex items-start gap-3 rounded-lg border p-4 ${classes} ${className}`} role={tone === "danger" ? "alert" : "status"}>
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
                {title ? <p className="text-sm font-semibold">{title}</p> : null}
                <div className={`${title ? "mt-1" : ""} text-sm leading-5`}>{children}</div>
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
    );
}
