"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut,
  Menu,
  X,
  Coins,
  ShieldCheck,
} from "lucide-react";
import { useTransition, animated } from "@react-spring/web";
import { supabase } from "@/lib/supabase/client";
import { LogoMark } from "./ui/Logo";
import NavItem from "./NavItem";
import {
  withinCollegeItems,
  outsideCampusItems,
  adminItems,
  SECTION_COLORS,
} from "@/lib/navConfig";

interface SidebarShellProps {
  children: React.ReactNode;
}

export function SidebarShell({ children }: SidebarShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [studentName, setStudentName] = useState("Student");
  const [studentCredits, setStudentCredits] = useState(100);
  const [userRole, setUserRole] = useState("student");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, credits, role")
        .eq("id", user.id)
        .single();

      if (profile) {
        setStudentName(profile.full_name || "Student");
        setStudentCredits(profile.credits || 0);
        setUserRole(profile.role || "student");
      }
    }

    loadProfile();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  // Close mobile menu on route change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setMobileMenuOpen(false);
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [pathname]);

  // Mobile menu drawer animation using React Spring
  const mobileMenuTransition = useTransition(mobileMenuOpen, {
    from: { opacity: 0, height: 0, transform: "translate3d(0, -8px, 0)" },
    enter: { opacity: 1, height: "auto", transform: "translate3d(0, 0, 0)" },
    leave: { opacity: 0, height: 0, transform: "translate3d(0, -8px, 0)" },
    config: { tension: 300, friction: 23 },
  });

  const renderNavSection = (
    title: string,
    items: typeof withinCollegeItems,
    titleColor: string,
    sectionBorderColor: string
  ) => (
    <div className={sectionBorderColor}>
      <span className={`px-3 text-[8px] font-extrabold uppercase tracking-widest block mb-2 ${titleColor}`}>
        {title}
      </span>
      <nav className="space-y-1">
        {items.map((item) => (
          <NavItem
            key={item.path}
            item={item}
            isActive={pathname === item.path}
          />
        ))}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#05070b] text-[#ffffff] grid-bg flex flex-col md:flex-row relative overflow-x-hidden">

      {/* 1. Desktop Sidebar */}
      <aside className="hidden md:flex md:w-[280px] shrink-0 flex-col justify-between border-r border-[rgba(255,255,255,0.08)] bg-[#080d16] p-6 z-30 overflow-y-auto">
        <div className="space-y-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white border border-primary/20 shadow-primary transition-transform duration-200 group-hover:scale-105">
              <LogoMark className="h-5.5 w-5.5" />
            </div>
            <div>
              <span className="font-display text-xl font-bold tracking-tight text-white block">UniFetch</span>
              <span className="block text-[8px] font-extrabold uppercase tracking-widest text-primary mt-1">Campus Logistics</span>
            </div>
          </Link>

          {/* Credits Wallet Pill — polished with micro-interaction */}
          <Link href="/credits" aria-label="Go to credits wallet">
            <div
              className="rounded-2xl border border-[#2563eb]/20 bg-[#2563eb]/6 p-4.5 flex items-center justify-between shadow-glow cursor-pointer transition-all duration-250 hover:border-[#2563eb]/30 hover:bg-[#2563eb]/8 group"
              title="Wallet balance — click to manage credits"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 group-hover:bg-primary/30 transition-colors duration-250">
                  <Coins className="h-5.5 w-5.5 text-primary transition-transform duration-250 group-hover:scale-110 group-hover:rotate-3" />
                </div>
                <div>
                  <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#cbd5e1] block">Wallet Balance</span>
                  <span className="font-display font-bold text-sm text-white mt-0.5 transition-colors duration-250 group-hover:text-white group-hover:drop-shadow-[0_0_6px_#2563eb]">
                    {studentCredits} Credits
                  </span>
                </div>
              </div>
              <span
                className="text-[#2563eb] opacity-30 group-hover:opacity-60 group-hover:translate-x-0.5 transition-all duration-250"
                aria-hidden="true"
              >
                →
              </span>
            </div>
          </Link>

          {/* Nav Items */}
          <div className="space-y-6">
            {renderNavSection(
              "Within College",
              withinCollegeItems,
              `text-[${SECTION_COLORS.primary}]/70`,
              "border-t border-[rgba(255,255,255,0.04)]"
            )}
            {renderNavSection(
              "Outside Campus",
              outsideCampusItems,
              `text-[${SECTION_COLORS.emerald}]/70`,
              ""
            )}

            {userRole === "admin" && (
              <div className="pt-2 border-t border-[rgba(255,255,255,0.04)]">
                <span className={`px-3 text-[8px] font-extrabold uppercase tracking-widest text-[${SECTION_COLORS.danger}]/70 block mb-2`}>
                  Admin Panel
                </span>
                <nav className="space-y-1">
                  {adminItems.map((item) => (
                    <NavItem
                      key={item.path}
                      item={item}
                      isActive={pathname === item.path}
                    />
                  ))}
                </nav>
              </div>
            )}

            <div className="pt-2 border-t border-[rgba(255,255,255,0.04)]">
              <Link
                href="/verification"
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                  pathname === "/verification"
                    ? "bg-[var(--color-primary-tint)] text-white"
                    : "text-muted hover:text-white hover:bg-white/5"
                }`}
              >
                <ShieldCheck className="h-5 w-5 text-primary transition-transform duration-250 group-hover:scale-110" />
                <span>Verification</span>
                {pathname === "/verification" && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full"
                    style={{
                      backgroundColor: SECTION_COLORS.primary,
                      boxShadow: `0 0 8px ${SECTION_COLORS.primary}`,
                    }}
                  />
                )}
              </Link>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="border-t border-[rgba(255,255,255,0.08)] pt-4 flex items-center justify-between gap-3 overflow-hidden">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 font-display font-bold text-xs text-primary border border-[rgba(255,255,255,0.08)] transition-transform duration-250 group-hover:scale-105">
              {studentName.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-[#cbd5e1]">Active User</p>
              <p className="text-xs font-bold text-white truncate max-w-[140px]">{studentName}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="h-8.5 w-8.5 rounded-xl bg-white/5 border border-[rgba(255,255,255,0.08)] hover:bg-[#ef4444]/10 hover:border-[#ef4444]/30 active:scale-[0.95] group transition-all flex items-center justify-center shrink-0"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="h-4.5 w-4.5 text-[#cbd5e1] group-hover:text-[#ef4444] transition-colors" />
          </button>
        </div>
      </aside>

      {/* 2. Mobile Header */}
      <header className="flex md:hidden items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.08)] bg-[#080d16] sticky top-0 z-40 transition-all duration-250">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white border border-primary/10">
            <LogoMark className="h-4.5 w-4.5" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-white">UniFetch</span>
        </Link>

        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1.5 bg-[#2563eb]/10 border border-[#2563eb]/20 px-3.5 py-1.5 rounded-xl text-[10px] font-bold text-primary transition-colors duration-250 hover:bg-[#2563eb]/15"
            title="Wallet balance"
          >
            <span>🪙 {studentCredits}</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            type="button"
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-white/5 border border-[rgba(255,255,255,0.08)] text-white hover:bg-white/10 active:scale-[0.95] transition-all duration-200"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuTransition((style, isOpen) =>
        isOpen ? (
          <animated.nav
            style={style}
            className="flex md:hidden flex-col bg-[#080d16]/95 backdrop-blur-md border-b border-[rgba(255,255,255,0.08)] px-6 py-4 space-y-4 z-40 sticky top-[69px] shadow-glow overflow-y-auto max-h-[calc(100vh-70px)]"
          >
            {/* Within College */}
            <div>
              <span className="text-[8px] font-extrabold uppercase tracking-widest text-primary/70 block mb-2 px-2">Within College</span>
              <div className="space-y-1">
                {withinCollegeItems.map((item) => (
                  <NavItem
                    key={item.path}
                    item={item}
                    isActive={pathname === item.path}
                    onClick={() => setMobileMenuOpen(false)}
                  />
                ))}
              </div>
            </div>

            {/* Outside Campus */}
            <div>
              <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#10b981]/70 block mb-2 px-2">Outside Campus</span>
              <div className="space-y-1">
                {outsideCampusItems.map((item) => (
                  <NavItem
                    key={item.path}
                    item={item}
                    isActive={pathname === item.path}
                    onClick={() => setMobileMenuOpen(false)}
                  />
                ))}
              </div>
            </div>

            {/* Admin Panel */}
            {userRole === "admin" && (
              <div className="pt-2 border-t border-[rgba(255,255,255,0.04)]">
                <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#ef4444] block mb-2 px-2">Admin Panel</span>
                <div className="space-y-1">
                  {adminItems.map((item) => (
                    <NavItem
                      key={item.path}
                      item={item}
                      isActive={pathname === item.path}
                      onClick={() => setMobileMenuOpen(false)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Verification + Logout */}
            <div className="pt-2 border-t border-[rgba(255,255,255,0.04)] space-y-1">
              <Link
                href="/verification"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  pathname === "/verification"
                    ? "bg-[var(--color-primary-tint)] text-white"
                    : "text-[#cbd5e1] hover:bg-white/5 hover:text-white"
                }`}
              >
                <ShieldCheck className="h-5 w-5 text-primary" />
                <span>Verification</span>
              </Link>

              <button
                type="button"
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-[#ef4444] hover:bg-[#ef4444]/10 w-full text-left transition-colors active:scale-[0.98]"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </animated.nav>
        ) : null
      )}

      {/* 3. Main Workspace Container */}
      <div className="flex-1 min-w-0 flex flex-col">
        {children}
      </div>
    </div>
  );
}
