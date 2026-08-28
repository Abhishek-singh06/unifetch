"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LogOut, 
  Compass, 
  ShieldCheck, 
  Menu, 
  X, 
  Coins, 
  PlusCircle, 
  Inbox,
  MessageSquare
} from "lucide-react";
import { useTransition, animated } from "@react-spring/web";
import { supabase } from "@/lib/supabase/client";
import { LogoMark } from "./ui/Logo";

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

  const withinCollegeItems = [
    { label: "My Requests", path: "/requests", icon: Inbox },
    { label: "Carry Packages", path: "/carry", icon: Compass },
    { label: "Post Request", path: "/request", icon: PlusCircle },
    { label: "Buy Credits", path: "/credits", icon: Coins },
  ];

  const outsideCampusItems = [
    { label: "Browse Feed", path: "/outside/browse", icon: Compass },
    { label: "Create Request", path: "/outside/create", icon: PlusCircle },
    { label: "My Tasks", path: "/outside/tasks", icon: Inbox },
    { label: "Messages", path: "/outside/messages", icon: MessageSquare },
    { label: "Payments", path: "/outside/payments", icon: Coins },
  ];

  const adminItems = [
    { label: "Student ID Approvals", path: "/admin", icon: ShieldCheck },
    { label: "Credit Approvals", path: "/admin/credits", icon: Coins },
  ];

  // Mobile menu drawer animation using React Spring
  const mobileMenuTransition = useTransition(mobileMenuOpen, {
    from: { opacity: 0, height: 0, transform: "translate3d(0, -12px, 0)" },
    enter: { opacity: 1, height: "auto", transform: "translate3d(0, 0, 0)" },
    leave: { opacity: 0, height: 0, transform: "translate3d(0, -12px, 0)" },
    config: { tension: 300, friction: 23 },
  });

  return (
    <div className="min-h-screen bg-[#05070b] text-[#ffffff] grid-bg flex flex-col md:flex-row relative overflow-x-hidden">
      
      {/* 1. Desktop Sidebar */}
      <aside className="hidden md:flex md:w-[280px] shrink-0 flex-col justify-between border-r border-[rgba(255,255,255,0.08)] bg-[#080d16] p-6 z-30 overflow-y-auto">
        <div className="space-y-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white border border-primary/20 shadow-primary">
              <LogoMark className="h-5.5 w-5.5" />
            </div>
            <div>
              <span className="font-display text-xl font-bold tracking-tight text-white block">UniFetch</span>
              <span className="block text-[8px] font-extrabold uppercase tracking-widest text-primary mt-1">Campus Logistics</span>
            </div>
          </Link>

          {/* Credits Wallet Pill */}
          <div className="rounded-2xl border border-[#2563eb]/20 bg-[#2563eb]/6 p-4.5 flex items-center justify-between shadow-glow">
            <div className="flex items-center gap-3">
              <Coins className="h-5 w-5 text-primary" />
              <div>
                <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#cbd5e1] block">Wallet Balance</span>
                <span className="font-display font-bold text-sm text-white mt-0.5">{studentCredits} Credits</span>
              </div>
            </div>
          </div>

          {/* Nav Items */}
          <div className="space-y-6">
            <div>
              <span className="px-3 text-[8px] font-extrabold uppercase tracking-widest text-primary/70 block mb-2">Within College</span>
              <nav className="space-y-1">
                {withinCollegeItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all ${
                        isActive
                          ? "bg-primary text-white border border-primary/20 shadow-primary"
                          : "text-[#cbd5e1] hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-primary"}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div>
              <span className="px-3 text-[8px] font-extrabold uppercase tracking-widest text-[#10b981]/70 block mb-2">Outside Campus</span>
              <nav className="space-y-1">
                {outsideCampusItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all ${
                        isActive
                          ? "bg-[#10b981] text-white border border-[#10b981]/20 shadow-md shadow-[#10b981]/20"
                          : "text-[#cbd5e1] hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-[#10b981]"}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
            
            {userRole === "admin" && (
              <div className="pt-2 border-t border-[rgba(255,255,255,0.04)]">
                <span className="px-3 text-[8px] font-extrabold uppercase tracking-widest text-[#ef4444] block mb-2">Admin Panel</span>
                <nav className="space-y-1">
                  {adminItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        href={item.path}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all ${
                          isActive
                            ? "bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 shadow-glow"
                            : "text-[#cbd5e1] hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${isActive ? "text-[#ef4444]" : "text-[#ef4444]/70"}`} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            )}

            <div className="pt-2 border-t border-[rgba(255,255,255,0.04)]">
              <Link
                href="/verification"
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all ${
                  pathname === "/verification" ? "bg-white/10 text-white" : "text-[#cbd5e1] hover:bg-white/5 hover:text-white"
                }`}
              >
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>Verification</span>
              </Link>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="border-t border-[rgba(255,255,255,0.08)] pt-4 flex items-center justify-between gap-3 overflow-hidden">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 font-display font-bold text-xs text-primary border border-[rgba(255,255,255,0.08)]">
              {studentName.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-[#cbd5e1]">Active User</p>
              <p className="text-xs font-bold text-white truncate max-w-[120px]">{studentName}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="h-8.5 w-8.5 rounded-xl bg-white/5 border border-[rgba(255,255,255,0.08)] hover:bg-[#ef4444]/10 hover:border-[#ef4444]/30 group transition-all flex items-center justify-center shrink-0"
            title="Sign out"
          >
            <LogOut className="h-4.5 w-4.5 text-[#cbd5e1] group-hover:text-[#ef4444] transition-colors" />
          </button>
        </div>
      </aside>

      {/* 2. Mobile Header */}
      <header className="flex md:hidden items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.08)] bg-[#080d16] sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white border border-primary/10">
            <LogoMark className="h-4.5 w-4.5" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-white">UniFetch</span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#2563eb]/10 border border-[#2563eb]/20 px-3.5 py-1.5 rounded-xl text-[10px] font-bold text-primary">
            <span>🪙 {studentCredits}</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            type="button"
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-white/5 border border-[rgba(255,255,255,0.08)] text-white"
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
            <div>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-primary/70 block mb-2 px-2">Within College</span>
              <div className="space-y-1">
                {withinCollegeItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                        isActive
                          ? "bg-primary text-white"
                          : "text-[#cbd5e1] hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon className={`h-4.5 w-4.5 ${isActive ? "text-white" : "text-primary"}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#10b981]/70 block mb-2 px-2">Outside Campus</span>
              <div className="space-y-1">
                {outsideCampusItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                        isActive
                          ? "bg-[#10b981] text-white"
                          : "text-[#cbd5e1] hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon className={`h-4.5 w-4.5 ${isActive ? "text-white" : "text-[#10b981]"}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {userRole === "admin" && (
              <div className="pt-2 border-t border-[rgba(255,255,255,0.04)]">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#ef4444] block mb-2 px-2">Admin Panel</span>
                <div className="space-y-1">
                  {adminItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        href={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                          isActive
                            ? "bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 shadow-glow"
                            : "text-[#cbd5e1] hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <Icon className={`h-4.5 w-4.5 ${isActive ? "text-[#ef4444]" : "text-[#ef4444]/70"}`} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-[rgba(255,255,255,0.04)] space-y-1">
              <Link
                href="/verification"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  pathname === "/verification" ? "bg-white/10 text-white" : "text-[#cbd5e1] hover:bg-white/5 hover:text-white"
                }`}
              >
                <ShieldCheck className="h-4.5 w-4.5 text-primary" />
                <span>Verification</span>
              </Link>

              <button
                type="button"
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-[#ef4444] hover:bg-[#ef4444]/10 w-full text-left transition-colors"
              >
                <LogOut className="h-4.5 w-4.5" />
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
