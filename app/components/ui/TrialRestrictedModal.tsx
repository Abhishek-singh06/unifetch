"use client";

import { useRouter } from "next/navigation";
import { X, Lock, Sparkles, ArrowRight } from "lucide-react";
import { disableDemoMode } from "@/lib/demoSession";

interface TrialRestrictedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  actionName?: string;
}

export default function TrialRestrictedModal({
  isOpen,
  onClose,
  title = "Create your UniFetch account to continue.",
  description = "You're exploring UniFetch in Trial Mode. To create requests, accept deliveries, make payments, or interact with campus peers, create your verified account.",
  actionName,
}: TrialRestrictedModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  function handleCreateAccount() {
    disableDemoMode();
    onClose();
    router.push("/signup");
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="trial-restricted-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md rounded-[2rem] border border-[rgba(255,255,255,0.12)] bg-[#080d16] p-6 sm:p-8 shadow-2xl text-left">
        {/* Close button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Close modal"
          className="absolute top-5 right-5 p-2 rounded-xl text-[#cbd5e1] hover:text-white hover:bg-white/5 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon & Badge */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563eb]/10 border border-[#2563eb]/20 text-[#60a5fa] shadow-glow">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-[#2563eb]/10 text-[#60a5fa] border border-[#2563eb]/20">
              <Sparkles className="h-3 w-3" />
              Trial Mode Restricted
            </span>
          </div>
        </div>

        {/* Title */}
        <h3
          id="trial-restricted-title"
          className="font-display text-2xl font-bold text-white tracking-tight leading-snug"
        >
          {title}
        </h3>

        {/* Action specific context */}
        {actionName && (
          <p className="mt-2 text-xs font-bold text-[#2563eb] uppercase tracking-wider">
            Restricted action: {actionName}
          </p>
        )}

        {/* Description */}
        <p className="mt-3 text-sm text-[#cbd5e1] leading-relaxed">
          {description}
        </p>

        {/* Features preview */}
        <div className="mt-5 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#05070b]/60 p-4 space-y-2 text-xs text-[#cbd5e1]">
          <p className="font-semibold text-white">Full account benefits:</p>
          <ul className="space-y-1.5 text-xs text-[#94a3b8]">
            <li className="flex items-center gap-2">
              <span className="text-[#22c55e]">✓</span> Real peer-to-peer campus deliveries
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#22c55e]">✓</span> Direct student UPI payments with no platform cuts
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#22c55e]">✓</span> Secure OTP delivery verification
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#22c55e]">✓</span> Direct chat negotiation and campus broadcasts
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={handleCreateAccount}
            className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-primary text-white font-bold text-xs uppercase tracking-wider shadow-glow hover:bg-primary-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <span>Create Account</span>
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto py-3 px-4 rounded-xl border border-[rgba(255,255,255,0.1)] text-[#cbd5e1] hover:text-white hover:bg-white/5 font-semibold text-xs transition-colors"
          >
            Continue Exploring
          </button>
        </div>
      </div>
    </div>
  );
}
