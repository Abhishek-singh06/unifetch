import * as React from "react";
import { cn } from "@/lib/utils";

// Consistent empty state with a brand-neutral icon slot (no emoji).
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-3xl border border-border bg-surface p-12 text-center shadow-[var(--shadow-card)]",
        className
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-tint text-primary">
        {icon}
      </div>
      <h3 className="mt-5 font-display text-xl font-bold text-[#0c241b]">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
