import Link from "next/link";
import { ChevronLeft } from "lucide-react";

// Standard top strip for internal (authenticated) pages: back link on the
// left, contextual actions on the right. Keeps every app page consistent.
export function PageHeader({
  backHref = "/",
  backLabel = "Back to UniFetch",
  actions,
}: {
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Link
        href={backHref}
        className="btn-ghost px-2 py-1.5 text-xs"
      >
        <ChevronLeft className="h-4 w-4" />
        {backLabel}
      </Link>
      {actions && <div className="flex items-center gap-2.5">{actions}</div>}
    </div>
  );
}
