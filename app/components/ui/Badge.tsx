import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "info" | "danger" | "neutral";

const tones: Record<Tone, string> = {
  success: "badge-success",
  warning: "badge-warning",
  info: "badge-info",
  danger: "badge-danger",
  neutral: "badge-neutral",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return <span className={cn("badge", tones[tone], className)}>{children}</span>;
}
