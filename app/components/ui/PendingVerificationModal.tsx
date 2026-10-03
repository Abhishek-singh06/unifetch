"use client";

import Link from "next/link";
import { X, Clock, ArrowRight, ShieldCheck } from "lucide-react";

interface PendingVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  status?: string;
  actionName?: string;
}

export default function PendingVerificationModal({
  isOpen,
  onClose,
  status = "submitted",
  actionName,
}: PendingVerificationModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pending-verification-title"
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
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[#fbbf24] shadow-glow">
            <Clock className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-[#f59e0b]/10 text-[#fbbf24] border border-[#f59e0b]/20">
              <ShieldCheck className="h-3 w-3" />
              {status === "submitted" || status === "id_submitted" ? "ID Submitted" : "Pending Review"}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3
          id="pending-verification-title"
          className="font-display text-2xl font-bold text-white tracking-tight leading-snug"
        >
          Verification in Progress
        </h3>

        {/* Action specific context */}
        {actionName && (
          <p className="mt-2 text-xs font-bold text-[#f59e0b] uppercase tracking-wider">
            Restricted action: {actionName}
          </p>
        )}

        {/* Description */}
        <p className="mt-3 text-sm text-[#cbd5e1] leading-relaxed">
          Your student ID has been submitted and is undergoing verification. You have full access to explore the marketplace, browse trips, and prepare requests. Real delivery obligations and transactions activate once your student ID is verified.
        </p>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/verification"
            onClick={onClose}
            className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-primary text-white font-bold text-xs uppercase tracking-wider shadow-glow hover:bg-primary-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <span>View Verification Status</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto py-3 px-4 rounded-xl border border-[rgba(255,255,255,0.1)] text-[#cbd5e1] hover:text-white hover:bg-white/5 font-semibold text-xs transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
