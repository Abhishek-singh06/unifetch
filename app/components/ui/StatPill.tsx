import * as React from "react";
import { cn } from "@/lib/utils";

// Compact stat shown in the header bars (e.g. Active / Completed).
export function StatPill({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface px-4 py-2.5 shadow-[var(--shadow-sm)]",
        className
      )}
    >
      <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
        {label}
      </span>
      <span className="font-display text-xl font-bold text-primary">{value}</span>
    </div>
  );
}
