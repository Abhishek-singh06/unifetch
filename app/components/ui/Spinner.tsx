import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} />;
}

// Full-page centered loading state — consistent across all routes.
export function PageLoader({
  label = "Loading…",
}: {
  label?: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center">
        <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-[var(--shadow-primary)]">
          <Loader2 className="h-5 w-5 animate-spin" />
        </span>
        <p className="mt-4 text-xs font-semibold tracking-wide text-muted">
          {label}
        </p>
      </div>
    </main>
  );
}
