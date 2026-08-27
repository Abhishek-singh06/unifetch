import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "error" | "success" | "info";

const tones: Record<Tone, string> = {
  error: "border-[rgba(239,68,68,0.2)] bg-[var(--color-danger-tint)] text-[var(--color-danger)]",
  success: "border-[rgba(34,197,94,0.2)] bg-[var(--color-success-tint)] text-[var(--color-success)]",
  info: "border-[rgba(37,99,235,0.2)] bg-[var(--color-primary-tint)] text-[var(--color-primary)]",
};

export function Alert({
  tone = "info",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="alert"
      className={cn("rounded-2xl border p-4 text-xs font-semibold", tones[tone], className)}
    >
      {children}
    </div>
  );
}
