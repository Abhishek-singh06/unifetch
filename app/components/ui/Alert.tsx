import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "error" | "success" | "info";

const tones: Record<Tone, string> = {
  error: "border-[var(--color-danger-border)] bg-[var(--color-danger-tint)] text-[var(--color-danger)]",
  success: "border-[var(--color-accent)/30] bg-[var(--color-accent-tint)] text-[var(--color-accent-strong)]",
  info: "border-[var(--color-info-border)] bg-[var(--color-info-tint)] text-[var(--color-info)]",
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
