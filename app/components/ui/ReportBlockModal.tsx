"use client";

import { useState } from "react";
import { X, ShieldAlert, Ban, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Alert } from "./Alert";

interface ReportBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUserId: string;
  reportedUserName: string;
  requestId?: string;
}

export default function ReportBlockModal({
  isOpen,
  onClose,
  reportedUserId,
  reportedUserName,
  requestId,
}: ReportBlockModalProps) {
  const [activeTab, setActiveTab] = useState<"report" | "block">("report");
  const [reason, setReason] = useState("suspicious_activity");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  if (!isOpen) return null;

  async function handleReport() {
    setLoading(true);
    setMessage(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage({ tone: "error", text: "You must be logged in to report." });
      setLoading(false);
      return;
    }

    if (user.id === reportedUserId) {
      setMessage({ tone: "error", text: "You cannot report yourself." });
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      reported_user_id: reportedUserId,
      request_id: requestId || null,
      reason,
      description: description.trim() || null,
      status: "OPEN",
    });

    if (error) {
      setMessage({ tone: "error", text: "Failed to submit report: " + error.message });
    } else {
      setMessage({ tone: "success", text: "✓ Report submitted successfully. Admin review is pending." });
      setTimeout(() => {
        onClose();
      }, 2000);
    }
    setLoading(false);
  }

  async function handleBlock() {
    setLoading(true);
    setMessage(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage({ tone: "error", text: "You must be logged in to block." });
      setLoading(false);
      return;
    }

    if (user.id === reportedUserId) {
      setMessage({ tone: "error", text: "You cannot block yourself." });
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("blocks").insert({
      blocker_id: user.id,
      blocked_id: reportedUserId,
    });

    if (error) {
      if (error.code === "23505") {
        setMessage({ tone: "success", text: "✓ You have already blocked this user." });
      } else {
        setMessage({ tone: "error", text: "Failed to block user: " + error.message });
      }
    } else {
      setMessage({ tone: "success", text: "✓ User blocked successfully." });
      setTimeout(() => {
        onClose();
      }, 2000);
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-[2.5rem] border border-[rgba(255,255,255,0.08)] bg-[#080d16] p-6 sm:p-8 space-y-6 relative animate-fade-in shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-5.5 w-5.5 text-red-500 animate-pulse" />
            <h3 className="font-display font-bold text-lg text-white">Trust & Moderation</h3>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* User Card Indicator */}
        <div className="p-4 rounded-2xl bg-white/3 border border-white/5 text-xs text-[#cbd5e1] font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-[#2563eb]" />
          <span>Action regarding: <strong className="text-white">{reportedUserName || "Student"}</strong></span>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[rgba(255,255,255,0.08)] pb-1 gap-4">
          <button
            onClick={() => { setActiveTab("report"); setMessage(null); }}
            className={`pb-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === "report" ? "text-red-400 border-b-2 border-red-400" : "text-muted hover:text-white"
            }`}
          >
            Report User
          </button>
          <button
            onClick={() => { setActiveTab("block"); setMessage(null); }}
            className={`pb-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === "block" ? "text-red-400 border-b-2 border-red-400" : "text-muted hover:text-white"
            }`}
          >
            Block User
          </button>
        </div>

        {/* Body Content */}
        {activeTab === "report" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-[#2563eb] block">Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-white/3 px-4 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-[#2563eb]"
              >
                <option value="payment_issue" className="bg-[#080d16] text-white">Payment Issue</option>
                <option value="harassment" className="bg-[#080d16] text-white">Harassment</option>
                <option value="suspicious_activity" className="bg-[#080d16] text-white">Suspicious Activity</option>
                <option value="prohibited_item" className="bg-[#080d16] text-white">Prohibited Item</option>
                <option value="no_show" className="bg-[#080d16] text-white">No-Show</option>
                <option value="other" className="bg-[#080d16] text-white">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-[#2563eb] block">Description (Optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                placeholder="Describe the situation in detail..."
                className="w-full h-24 rounded-xl border border-[rgba(255,255,255,0.08)] bg-white/3 px-4 py-3 text-xs font-semibold text-white placeholder-muted focus:outline-none focus:border-[#2563eb] resize-none"
              />
            </div>

            {message && <Alert tone={message.tone}>{message.text}</Alert>}

            <button
              onClick={handleReport}
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white text-xs font-extrabold uppercase tracking-widest transition-all shadow-glow"
            >
              {loading ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4.5 rounded-2xl bg-red-500/5 border border-red-500/10 flex items-start gap-3">
              <Ban className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-400 block">Warning</span>
                <p className="text-[10px] text-[#cbd5e1] font-semibold leading-relaxed">
                  Blocking this user will prevent all future matches, chat responses, and notifications between you two. Existing historical logs and completed transactions will remain untouched.
                </p>
              </div>
            </div>

            {message && <Alert tone={message.tone}>{message.text}</Alert>}

            <button
              onClick={handleBlock}
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white text-xs font-extrabold uppercase tracking-widest transition-all shadow-glow"
            >
              {loading ? "Blocking..." : "Block User"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
