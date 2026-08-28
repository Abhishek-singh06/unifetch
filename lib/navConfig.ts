/**
 * Shared navigation configuration for UniFetch.
 * Imported by both SidebarShell.tsx (authenticated layout) and app/page.tsx (Home top nav)
 * to ensure consistent routing, link labels, icons, and section theme colors across the app.
 */

import type { ComponentType } from "react";
import {
  Package,
  ShoppingCart,
  PlusSquare,
  Coins,
  LayoutGrid,
  PlusCircle,
  ListTodo,
  MessageSquare,
  CreditCard,
  ShieldCheck,
} from "lucide-react";

export type NavItem = {
  path: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Section theme color (used for active/hover icon tinting) */
  sectionColor: string;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

// Section color tokens — matches globals.css design system
export const SECTION_COLORS = {
  primary: "#2563eb", // blue-600 — Within College
  emerald: "#10b981", // emerald-500 — Outside Campus
  danger: "#ef4444", // red-500 — Admin Panel
} as const;

export const withinCollegeItems: NavItem[] = [
  {
    path: "/requests",
    label: "My Requests",
    icon: Package,
    sectionColor: SECTION_COLORS.primary,
  },
  {
    path: "/carry",
    label: "Carry Packages",
    icon: ShoppingCart,
    sectionColor: SECTION_COLORS.primary,
  },
  {
    path: "/request",
    label: "Post Request",
    icon: PlusSquare,
    sectionColor: SECTION_COLORS.primary,
  },
  {
    path: "/credits",
    label: "Buy Credits",
    icon: Coins,
    sectionColor: SECTION_COLORS.primary,
  },
];

export const outsideCampusItems: NavItem[] = [
  {
    path: "/outside/browse",
    label: "Browse Feed",
    icon: LayoutGrid,
    sectionColor: SECTION_COLORS.emerald,
  },
  {
    path: "/outside/create",
    label: "Create Request",
    icon: PlusCircle,
    sectionColor: SECTION_COLORS.emerald,
  },
  {
    path: "/outside/tasks",
    label: "My Tasks",
    icon: ListTodo,
    sectionColor: SECTION_COLORS.emerald,
  },
  {
    path: "/outside/messages",
    label: "Messages",
    icon: MessageSquare,
    sectionColor: SECTION_COLORS.emerald,
  },
  {
    path: "/outside/payments",
    label: "Payments",
    icon: CreditCard,
    sectionColor: SECTION_COLORS.emerald,
  },
];

export const adminItems: NavItem[] = [
  {
    path: "/admin",
    label: "Student ID Approvals",
    icon: ShieldCheck,
    sectionColor: SECTION_COLORS.danger,
  },
  {
    path: "/admin/credits",
    label: "Credit Approvals",
    icon: Coins,
    sectionColor: SECTION_COLORS.danger,
  },
];

export const navSections: NavSection[] = [
  { title: "Within College", items: withinCollegeItems },
  { title: "Outside Campus", items: outsideCampusItems },
  { title: "Admin Panel", items: adminItems },
];
