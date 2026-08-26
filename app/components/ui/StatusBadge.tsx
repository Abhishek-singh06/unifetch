import { cn } from "@/lib/utils";
import { Badge } from "./Badge";

type Status =
  | "pending"
  | "matched"
  | "delivered"
  | "approved"
  | "rejected"
  | "processing";

// Single source of truth for how a delivery / verification status maps to a
// (icon + tone). Used across dashboard, carry, deliver, admin and verification.
const statusMap: Record<
  Status,
  { label: string; tone: "success" | "warning" | "info" | "danger" | "neutral"; pulse?: boolean }
> = {
  pending: { label: "Waiting for carrier", tone: "warning" },
  matched: { label: "Carrier en route", tone: "info", pulse: true },
  delivered: { label: "Delivered", tone: "success" },
  approved: { label: "Verified", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  processing: { label: "Processing", tone: "neutral", pulse: true },
};

export function StatusBadge({ status }: { status: string }) {
  const s = statusMap[status as Status] ?? statusMap.pending;
  return (
    <Badge tone={s.tone} className={cn(s.pulse && "animate-pulse")}>
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full bg-current",
          s.pulse && "live-dot"
        )}
        style={{ background: "currentColor" }}
      />
      {s.label.toUpperCase()}
    </Badge>
  );
}
