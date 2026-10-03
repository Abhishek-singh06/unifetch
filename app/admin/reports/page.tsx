"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, CheckCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { SidebarShell } from "../../components/SidebarShell";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Alert } from "../../components/ui/Alert";
import Link from "next/link";

type Report = {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  request_id: string | null;
  reason: string;
  description: string | null;
  status: "OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED";
  created_at: string;
  reporter: { full_name: string; email: string } | null;
  reported_user: { full_name: string; email: string } | null;
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [isAdmin, setIsAdmin] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  async function loadReports() {
    setLoading(true);
    const { data, error } = await supabase
      .from("reports")
      .select(`
        *,
        reporter:reporter_id ( full_name, email ),
        reported_user:reported_user_id ( full_name, email )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading reports:", error);
    } else if (data) {
      // Map foreign relation objects safely to type definitions
      const formattedReports = (data as Report[]).map((r) => ({
        ...r,
        reporter: Array.isArray(r.reporter) ? r.reporter[0] : r.reporter,
        reported_user: Array.isArray(r.reported_user) ? r.reported_user[0] : r.reported_user,
      }));
      setReports(formattedReports);
    }
    setLoading(false);
  }

  useEffect(() => {
    async function checkAdminAndLoad() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile && profile.role === "admin") {
        setIsAdmin(true);
        loadReports();
      } else {
        setLoading(false);
      }
    }

    checkAdminAndLoad();
  }, []);

  async function handleUpdateStatus(reportId: string, newStatus: "REVIEWING" | "RESOLVED" | "DISMISSED") {
    setActionMessage("");
    const { error } = await supabase
      .from("reports")
      .update({ status: newStatus })
      .eq("id", reportId);

    if (error) {
      setActionMessage("❌ Failed to update report status: " + error.message);
    } else {
      setActionMessage("✓ Report status updated successfully.");
      loadReports();
    }
  }

  const filteredReports = filterStatus === "ALL"
    ? reports
    : reports.filter(r => r.status === filterStatus);

  if (loading) {
    return (
      <SidebarShell>
        <div className="p-10 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-[#2563eb] border-t-transparent rounded-full mx-auto mb-4"></div>
          <span className="text-xs text-muted font-bold uppercase tracking-wider">Loading Reports...</span>
        </div>
      </SidebarShell>
    );
  }

  if (!isAdmin) {
    return (
      <SidebarShell>
        <div className="p-10 text-center space-y-4">
          <ShieldAlert className="h-12 w-12 text-[#ef4444] mx-auto animate-pulse" />
          <h3 className="font-display font-bold text-lg text-white">Access Denied</h3>
          <p className="text-xs text-muted font-semibold max-w-sm mx-auto">
            You must be an authorized administrator to view this page.
          </p>
        </div>
      </SidebarShell>
    );
  }

  return (
    <SidebarShell>
      <div className="p-6 sm:p-8 lg:p-10 space-y-8">

        {/* Title Area */}
        <div className="border-b border-[rgba(255,255,255,0.08)] pb-6 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#ef4444]">Security Panel</span>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-white leading-none">
              User Reports
            </h1>
            <p className="mt-2 text-xs text-[#cbd5e1] font-semibold">
              Review and act on student safety, payment abuse, and harassment reports.
            </p>
          </div>
        </div>

        {actionMessage && <Alert tone="success">{actionMessage}</Alert>}

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2.5 border-b border-[rgba(255,255,255,0.06)] pb-4">
          {["ALL", "OPEN", "REVIEWING", "RESOLVED", "DISMISSED"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider border transition-all ${
                filterStatus === status
                  ? "bg-red-500/10 border-red-500/30 text-red-400"
                  : "bg-white/5 border-[rgba(255,255,255,0.08)] text-muted hover:text-white"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Reports Feed */}
        {filteredReports.length === 0 ? (
          <div className="text-center py-12 rounded-[2.5rem] border border-dashed border-[rgba(255,255,255,0.08)] bg-white/1">
            <CheckCircle className="h-10 w-10 text-[#10b981] mx-auto opacity-40 mb-3" />
            <p className="text-xs text-muted font-bold uppercase tracking-wider">No reports found matching this filter</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-6 bg-[#080d16]/30 space-y-4"
              >
                {/* Top status & date header */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={report.status.toLowerCase()} />
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#2563eb]">
                      Reason: {report.reason.replace("_", " ")}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted font-semibold">
                    {new Date(report.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Reporter & Reported Info */}
                <div className="grid gap-4 sm:grid-cols-2 p-4 rounded-2xl bg-white/2 border border-white/5">
                  <div>
                    <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#cbd5e1] block">Reporter</span>
                    <span className="text-xs font-bold text-white block mt-0.5">
                      {report.reporter?.full_name || "Unknown"}
                    </span>
                    <span className="text-[10px] text-muted font-semibold block">
                      {report.reporter?.email}
                    </span>
                  </div>
                  <div className="border-t sm:border-t-0 sm:border-l border-[rgba(255,255,255,0.06)] pt-3 sm:pt-0 sm:pl-4">
                    <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#ef4444] block">Reported User</span>
                    <span className="text-xs font-bold text-white block mt-0.5">
                      {report.reported_user?.full_name || "Unknown"}
                    </span>
                    <span className="text-[10px] text-muted font-semibold block">
                      {report.reported_user?.email}
                    </span>
                  </div>
                </div>

                {/* Description */}
                {report.description && (
                  <div className="space-y-1">
                    <span className="text-[8px] font-extrabold uppercase tracking-widest text-muted block">Details</span>
                    <p className="text-xs text-[#cbd5e1] leading-relaxed font-semibold">
                      {report.description}
                    </p>
                  </div>
                )}

                {/* Footer and moderation controls */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[rgba(255,255,255,0.06)]">
                  {report.request_id ? (
                    <Link
                      href={`/outside/${report.request_id}`}
                      className="text-[10px] font-bold text-[#2563eb] hover:text-[#3b82f6] flex items-center gap-1 uppercase tracking-wider"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>View Related Task</span>
                    </Link>
                  ) : (
                    <span className="text-[9px] text-muted uppercase tracking-wider font-semibold">No Task Attached</span>
                  )}

                  <div className="flex items-center gap-2">
                    {report.status !== "REVIEWING" && (
                      <button
                        onClick={() => handleUpdateStatus(report.id, "REVIEWING")}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[9px] font-extrabold uppercase tracking-wider text-white"
                      >
                        Set Reviewing
                      </button>
                    )}
                    {report.status !== "RESOLVED" && (
                      <button
                        onClick={() => handleUpdateStatus(report.id, "RESOLVED")}
                        className="px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-[9px] font-extrabold uppercase tracking-wider text-green-400"
                      >
                        Mark Resolved
                      </button>
                    )}
                    {report.status !== "DISMISSED" && (
                      <button
                        onClick={() => handleUpdateStatus(report.id, "DISMISSED")}
                        className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-[9px] font-extrabold uppercase tracking-wider text-red-400"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </SidebarShell>
  );
}