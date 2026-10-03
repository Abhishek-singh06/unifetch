"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, XCircle } from "lucide-react";
import { disableDemoMode } from "@/lib/demoSession";

export default function DemoBanner() {
  const router = useRouter();

  function handleExitDemo() {
    disableDemoMode();
    router.push("/");
    router.refresh();
  }

  return (
    <aside
      aria-label="Demo Mode Notice"
      className="w-full bg-gradient-to-r from-[#1d4ed8] via-[#2563eb] to-[#3b82f6] text-white px-4 py-2.5 shadow-lg border-b border-blue-400/30 flex flex-wrap items-center justify-between gap-3 text-xs z-50 sticky top-0 backdrop-blur-md"
    >
      <div className="flex items-center gap-2 font-medium">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-white shrink-0 animate-pulse">
          <Sparkles className="h-3 w-3" />
        </span>
        <span className="font-semibold text-white drop-shadow-sm">
          Demo Mode — You&apos;re exploring UniFetch with sample data.
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        <Link
          href="/signup"
          onClick={handleExitDemo}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1 font-bold text-xs text-[#1d4ed8] shadow-sm hover:bg-slate-100 hover:shadow transition-all active:scale-95 uppercase tracking-wider"
        >
          <span>Create Account</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <button
          type="button"
          onClick={handleExitDemo}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/80 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors"
          title="Exit Demo Mode"
        >
          <XCircle className="h-3.5 w-3.5" />
          <span>Exit Demo</span>
        </button>
      </div>
    </aside>
  );
}
