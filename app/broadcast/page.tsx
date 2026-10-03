"use client";

import { useEffect, useState, useRef } from "react";
import { Megaphone, MapPin, Calendar, Trash2 } from "lucide-react";
import { useTransition, animated } from "@react-spring/web";
import { supabase } from "@/lib/supabase/client";
import { isDemoMode, getDemoUser, getDemoBroadcasts, addDemoBroadcast, cancelDemoBroadcast } from "@/lib/demoSession";
import { SidebarShell } from "../components/SidebarShell";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { EmptyState } from "../components/ui/EmptyState";
import TrialRestrictedModal from "../components/ui/TrialRestrictedModal";
import PendingVerificationModal from "../components/ui/PendingVerificationModal";

type Broadcast = {
  id: string;
  creator_id: string;
  message: string;
  destination: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  category: "going_out" | "need_help" | "general";
  status: "active" | "cancelled";
  created_at: string;
  profiles?: {
    full_name: string;
  };
};

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function BroadcastPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [destination, setDestination] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [category, setCategory] = useState<"going_out" | "need_help" | "general">("general");

  const [activeTab, setActiveTab] = useState<"all" | "going_out" | "need_help" | "general">("all");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);

  function handleTrialContinueSimulate() {
    setShowTrialModal(false);
    const demoUser = getDemoUser();
    addDemoBroadcast({
      creator_id: demoUser.id,
      message: message.trim(),
      destination: destination.trim() || null,
      scheduled_date: scheduledDate || null,
      scheduled_time: scheduledTime || null,
      category,
    });
    setSuccessMsg("🎉 Broadcast posted successfully! (Demo Simulation)");
    setMessage("");
    setDestination("");
    setScheduledDate("");
    setScheduledTime("");
    setCategory("general");
    setShowForm(false);
    loadData();
  }

  const loadDataRef = useRef<() => Promise<void>>(undefined);

  async function loadData() {
    if (isDemoMode()) {
      const demoUser = getDemoUser();
      setCurrentUserId(demoUser.id);
      const demoList = getDemoBroadcasts();
      setBroadcasts(demoList as Broadcast[]);
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }

    const { data, error } = await supabase
      .from("broadcasts")
      .select(`
        *,
        profiles:creator_id ( full_name )
      `)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading broadcasts:", error);
      setErrorMsg("Failed to load broadcasts.");
    } else {
      setBroadcasts((data as Broadcast[]) || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadDataRef.current = loadData;

    if (isDemoMode()) {
      loadData();
      return;
    }

    // Initial load - wrapped in setTimeout to avoid synchronous setState in effect
    const initTimer = setTimeout(() => {
      loadData();
    }, 0);

    const channel = supabase
      .channel("broadcasts-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "broadcasts" },
        () => {
          loadDataRef.current?.();
        }
      )
      .subscribe();

    return () => {
      clearTimeout(initTimer);
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleCreateBroadcast(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      setErrorMsg("Message is required.");
      return;
    }
    if (message.length > 500) {
      setErrorMsg("Message must be 500 characters or less.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    if (isDemoMode()) {
      setSubmitting(false);
      setShowTrialModal(true);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("verification_status")
        .eq("id", user.id)
        .single();

      if (
        profile &&
        profile.verification_status !== "approved" &&
        profile.verification_status !== "verified" &&
        profile.verification_status !== "submitted" &&
        profile.verification_status !== "id_submitted"
      ) {
        setSubmitting(false);
        setShowPendingModal(true);
        return;
      }

      const { error } = await supabase.from("broadcasts").insert({
        creator_id: user.id,
        message: message.trim(),
        destination: destination.trim() || null,
        scheduled_date: scheduledDate || null,
        scheduled_time: scheduledTime || null,
        category,
        status: "active",
      });

      if (error) throw error;

      setSuccessMsg("🎉 Broadcast posted successfully!");
      setMessage("");
      setDestination("");
      setScheduledDate("");
      setScheduledTime("");
      setCategory("general");
      setShowForm(false);
      loadData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to post broadcast.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelBroadcast(id: string) {
    if (!confirm("Are you sure you want to cancel this broadcast?")) return;

    if (isDemoMode()) {
      cancelDemoBroadcast(id);
      loadData();
      return;
    }

    try {
      const { error } = await supabase
        .from("broadcasts")
        .update({ status: "cancelled" })
        .eq("id", id)
        .eq("creator_id", currentUserId);

      if (error) throw error;
      loadData();
    } catch (err) {
      alert("Failed to cancel broadcast: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  }

  const filteredBroadcasts = broadcasts.filter(
    (b) => activeTab === "all" || b.category === activeTab
  );

  // Category details for badge rendering
  const categoryDetails: Record<string, { label: string; badge: string }> = {
    going_out: { label: "Going Out", badge: "text-[#10b981] bg-[#10b981]/10 border-[#10b981]/20" },
    need_help: { label: "Need Help", badge: "text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/20" },
    general: { label: "General", badge: "text-[#2563eb] bg-[#2563eb]/10 border-[#2563eb]/20" }
  };

  // Category options for form
  const categories = [
    { id: "going_out" as const, label: "Going Out", icon: "🚗", colorClass: "border-[#10b981] bg-[#10b981]/10 text-white shadow-glow-emerald" },
    { id: "need_help" as const, label: "Need Help", icon: "🙋", colorClass: "border-[#f59e0b] bg-[#f59e0b]/10 text-white shadow-glow" },
    { id: "general" as const, label: "General", icon: "📢", colorClass: "border-[#2563eb] bg-[#2563eb]/10 text-white shadow-glow" }
  ];

  // Tab filter items
  const tabItems: Array<{ id: "all" | "going_out" | "need_help" | "general"; label: string }> = [
    { id: "all", label: "📢 All Announcements" },
    { id: "going_out", label: "🚗 Going Out" },
    { id: "need_help", label: "🙋 Need Help" },
    { id: "general", label: "💬 General" }
  ];

  const listTransitions = useTransition(filteredBroadcasts, {
    keys: (item) => item.id,
    from: { opacity: 0, transform: "translate3d(0, 15px, 0)" },
    enter: { opacity: 1, transform: "translate3d(0, 0, 0)" },
    leave: { opacity: 0, transform: "translate3d(0, -10px, 0)", height: 0, margin: 0, padding: 0 },
    config: { tension: 300, friction: 22 },
  });

  return (
    <SidebarShell>
      <div className="p-6 sm:p-8 lg:p-10 space-y-8">
        
        {/* Title area */}
        <div className="border-b border-[rgba(255,255,255,0.08)] pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#8b5cf6]">Community Section</span>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-white leading-none">
              Live Broadcasts
            </h1>
            <p className="mt-2 text-xs text-[#cbd5e1] font-semibold">
              Share quick updates, ask for urgent campus help, or announce a trip instantly.
            </p>
          </div>

          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white border-none py-3 px-6 text-xs font-bold uppercase tracking-widest rounded-xl shadow-glow shrink-0"
          >
            {showForm ? "Close Form" : "+ New Broadcast"}
          </Button>
        </div>

        {errorMsg && <Alert tone="error">{errorMsg}</Alert>}
        {successMsg && <Alert tone="success">{successMsg}</Alert>}

        {/* Collapsible Creation Form */}
        {showForm && (
          <div className="rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-6 bg-[#080d16]/40 backdrop-blur-sm max-w-2xl">
            <form onSubmit={handleCreateBroadcast} className="space-y-6">
              
              {/* Category */}
              <div>
                <label className="field-label mb-3 font-extrabold text-[10px] tracking-wider uppercase">
                  Select Category
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`flex flex-col items-center justify-center rounded-xl p-4 text-center text-xs font-bold transition-all duration-150 border-2 ${
                        category === cat.id
                          ? cat.colorClass
                          : "border-[rgba(255,255,255,0.08)] bg-white/5 text-[#cbd5e1] hover:border-white/20"
                      }`}
                    >
                      <span className="text-lg mb-1">{cat.icon}</span>
                      <span className="truncate">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <label htmlFor="broadcast-msg" className="field-label">
                  Your Announcement (Max 500 chars)
                </label>
                <textarea
                  id="broadcast-msg"
                  required
                  rows={4}
                  maxLength={500}
                  placeholder={
                    category === "going_out"
                      ? "e.g. Driving to Chennai Central tomorrow at 10 AM. Let me know if anyone needs a box picked up!"
                      : category === "need_help"
                      ? "e.g. Urgently need a printout from Main Gate. Can anyone bring it to Block D2?"
                      : "e.g. Campus Wi-Fi down in Block F. Anyone else having issues?"
                  }
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-2xl border border-[rgba(255,255,255,0.08)] bg-white/5 p-4 text-xs font-semibold text-white placeholder-muted focus:border-[#8b5cf6] focus:outline-none transition-colors"
                />
                <div className="text-right text-[10px] text-muted">
                  {message.length}/500 chars
                </div>
              </div>

              {/* Extras */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <label htmlFor="dest" className="field-label">Destination (Optional)</label>
                  <input
                    id="dest"
                    type="text"
                    placeholder="e.g. Phoenix Mall"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-white/5 px-4 py-2.5 text-xs text-white placeholder-muted focus:border-[#8b5cf6] focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="date" className="field-label">Date (Optional)</label>
                  <input
                    id="date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-white/5 px-4 py-2.5 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="time" className="field-label">Time (Optional)</label>
                  <input
                    id="time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-white/5 px-4 py-2.5 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-bold uppercase tracking-widest rounded-xl shadow-glow text-xs border-none"
              >
                {submitting ? "Posting..." : "Post Announcement"}
              </Button>
            </form>
          </div>
        )}

        {/* Tab Filters */}
        <div className="flex flex-wrap gap-2 border-b border-[rgba(255,255,255,0.08)] pb-4">
          {tabItems.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4.5 py-2.5 rounded-full text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-white/10 text-white border border-white/20"
                  : "text-muted hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Broadcast Feed */}
        {loading ? (
          <div className="text-center py-12">
            <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-t-transparent border-[#8b5cf6]" />
            <p className="mt-4 text-xs text-muted uppercase tracking-wider font-extrabold">Loading feed...</p>
          </div>
        ) : filteredBroadcasts.length === 0 ? (
          <EmptyState
            icon={<Megaphone className="h-10 w-10 text-[#8b5cf6] animate-pulse" />}
            title="No active broadcasts"
            description="Have a quick update, going out, or need help? Share it first with everyone!"
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {listTransitions((style, item) => {
              const catInfo = categoryDetails[item.category] || { label: "General", badge: "text-[#2563eb] bg-[#2563eb]/10 border-[#2563eb]/20" };

              const isOwner = item.creator_id === currentUserId;

              return (
                <animated.div style={style} key={item.id}>
                  <div className="rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-6 bg-[#080d16]/30 hover:border-white/15 transition-all duration-200 flex flex-col justify-between h-full space-y-4">
                    <div className="space-y-3">
                      {/* Top Header */}
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full border ${catInfo.badge}`}>
                          {catInfo.label}
                        </span>
                        <span className="text-[10px] text-muted font-bold">
                          {timeAgo(item.created_at)}
                        </span>
                      </div>

                      {/* Message Content */}
                      <p className="text-xs font-semibold text-white leading-relaxed whitespace-pre-wrap break-words">
                        {item.message}
                      </p>

                      {/* Details Box */}
                      {(item.destination || item.scheduled_date || item.scheduled_time) && (
                        <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#05070b]/60 p-3 space-y-2 text-[10px] font-bold text-[#cbd5e1]">
                          {item.destination && (
                            <p className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 text-[#8b5cf6]" />
                              <span>📍 Destination: {item.destination}</span>
                            </p>
                          )}
                          {(item.scheduled_date || item.scheduled_time) && (
                            <p className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 text-[#8b5cf6]" />
                              <span>
                                ⏰ Time: {item.scheduled_date ? new Date(item.scheduled_date).toLocaleDateString([], { month: "short", day: "numeric" }) : ""}
                                {item.scheduled_time ? ` @ ${item.scheduled_time}` : ""}
                              </span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-[rgba(255,255,255,0.06)] pt-3.5 flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-[#cbd5e1] uppercase tracking-wider">
                        By {item.profiles?.full_name || "Student"}
                      </span>

                      {isOwner && (
                        <button
                          onClick={() => handleCancelBroadcast(item.id)}
                          className="flex items-center gap-1 text-[10px] font-bold text-[#ef4444] hover:text-[#dc2626] uppercase tracking-wider transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Cancel</span>
                        </button>
                      )}
                    </div>
                  </div>
                </animated.div>
              );
            })}
          </div>
        )}
      </div>

      <TrialRestrictedModal
        isOpen={showTrialModal}
        onClose={handleTrialContinueSimulate}
        actionName="Post Campus Broadcast"
        description="Trial users can browse public campus broadcasts and explore updates, but posting live announcements to campus peers requires a verified student account."
      />

      <PendingVerificationModal
        isOpen={showPendingModal}
        onClose={() => setShowPendingModal(false)}
        actionName="Post Campus Broadcast"
      />
    </SidebarShell>
  );
}
