import { cn } from "@/lib/utils";

// The UniFetch mark: a parcel cube rendered as a clean line glyph. Kept as an
// inline SVG so it inherits currentColor and scales crisply at any size.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" />
      <path d="m4.5 7.7 7.5 4.2 7.5-4.2M12 12v9" />
    </svg>
  );
}

export function Logo({
  className,
  showTagline = false,
}: {
  className?: string;
  showTagline?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-[var(--shadow-primary)]">
        <LogoMark className="h-5 w-5" />
      </span>
      <span className="leading-none">
        <span className="block font-display text-lg font-bold tracking-tight text-[#0c241b]">
          UniFetch
        </span>
        {showTagline && (
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#527768]">
            Campus Peer Network
          </span>
        )}
      </span>
    </span>
  );
}
