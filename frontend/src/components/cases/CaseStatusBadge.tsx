import { CaseStatus, CaseStage, CASE_STAGE_LABELS } from "@/types/api";
import { Badge, type BadgeTone } from "@/components/ui/Badge";

interface CaseStatusBadgeProps {
  status: CaseStatus;
  stage?: CaseStage;
}

const STATUS_TONES: Record<CaseStatus, BadgeTone> = {
  active: "success",
  disposed: "neutral",
  archived: "neutral",
};

const STAGE_TONES: Record<CaseStage, BadgeTone> = {
  filing: "info",
  admission: "info",
  notice: "accent",
  counter_affidavit: "warning",
  rejoinder: "warning",
  arguments: "danger",
  judgment: "accent",
  disposed: "neutral",
  transferred: "success",
};

export function CaseStatusBadge({ status, stage }: CaseStatusBadgeProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Badge tone={STATUS_TONES[status]} className="capitalize">
        {status}
      </Badge>
      {stage && (
        <Badge tone={STAGE_TONES[stage]}>
          {CASE_STAGE_LABELS[stage]}
        </Badge>
      )}
    </div>
  );
}
