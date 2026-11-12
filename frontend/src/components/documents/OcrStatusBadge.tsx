import { LegacyDocument as Document } from "@/lib/api/documents";
import { Badge, type BadgeTone } from "@/components/ui/Badge";

type OcrStatus = Document["ocr_status"];

const STATUS_CONFIG: Record<OcrStatus, { label: string; tone: BadgeTone }> = {
    pending: {
        label: "OCR Pending",
        tone: "neutral",
    },
    processing: {
        label: "OCR Running…",
        tone: "info",
    },
    completed: {
        label: "OCR Done",
        tone: "success",
    },
    failed: {
        label: "OCR Failed",
        tone: "danger",
    },
    not_required: {
        label: "OCR Skipped",
        tone: "neutral",
    },
};

interface OcrStatusBadgeProps {
    status: OcrStatus;
}

export function OcrStatusBadge({ status }: OcrStatusBadgeProps) {
    const { label, tone } = STATUS_CONFIG[status];
    return (
        <Badge tone={tone} className={status === "processing" ? "animate-pulse" : ""}>
            {status === "processing" && (
                <span className='mr-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping inline-block' />
            )}
            {label}
        </Badge>
    );
}
