import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "neo-btn-primary",
  secondary: "neo-btn-secondary",
  ghost: "btn-ghost font-bold rounded-xl",
  danger:
    "inline-flex items-center justify-center gap-2 bg-[var(--color-danger-tint)] text-[var(--color-danger)] border border-[var(--color-danger-border)] shadow-[0_3px_0_0_var(--color-danger-border)] hover:bg-[var(--color-danger-tint)]/85 transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[0_0px_0_0_var(--color-danger-border)] font-bold rounded-xl",
};

const sizes: Record<Size, string> = {
  sm: "px-4 py-2 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3.5 text-sm",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
