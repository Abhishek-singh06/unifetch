/**
 * Reusable NavItem — shared between SidebarShell (desktop sidebar + mobile drawer)
 * and Home page top nav.
 *
 * Provides:
 *  - Active indicator (animated left bar + tinted background)
 *  - Hover micro-interaction (translate + icon scale + color shift)
 *  - Press feedback (active:scale)
 *  - Accessibility (aria-current, aria-label, focus-visible ring)
 *  - prefers-reduced-motion respect (via global CSS + no forced animations)
 */

import type { CSSProperties } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { NavItem as NavItemType } from "@/lib/navConfig";

type NavItemProps = {
  item: NavItemType;
  isActive?: boolean;
  /** Whether to render as icon-only (mobile compact) */
  iconOnly?: boolean;
  className?: string;
  onClick?: () => void;
};

const NavItem = ({ item, isActive = false, iconOnly = false, className, onClick }: NavItemProps) => {
  const IconComp = item.icon;
  const sectionColor = item.sectionColor;

  return (
    <Link
      href={item.path}
      aria-current={isActive ? "page" : undefined}
      aria-label={item.label}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]",
        // Base state
        "text-muted hover:text-white hover:bg-white/5",
        // Active state
        isActive
          ? "bg-[var(--color-primary-tint)] text-white"
          : "hover:bg-white/5",
        // Icon-only compact variant
        iconOnly && "justify-center",
        className,
      )}
      style={{
        ...(isActive && {
          "--nav-section-color": sectionColor,
        } as CSSProperties),
      }}
    >
      {/* Active left indicator bar */}
      <span
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full transition-all duration-200",
          isActive
            ? "opacity-100 w-1"
            : "w-0 opacity-0 group-hover:w-[3px] group-hover:opacity-40",
        )}
        style={{
          backgroundColor: sectionColor,
          ...(isActive ? { boxShadow: `0 0 8px ${sectionColor}` } : {}),
        }}
      />

      {/* Icon */}
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center transition-all duration-200",
          "text-muted group-hover:text-white",
          isActive && "text-white",
        )}
        style={isActive ? { color: sectionColor } : {}}
      >
        <IconComp className="h-4.5 w-4.5" />
      </span>

      {/* Label */}
      <span
        className={cn(
          "transition-all duration-200",
          iconOnly ? "sr-only" : "leading-tight",
        )}
      >
        {item.label}
      </span>
    </Link>
  );
};

export default NavItem;
