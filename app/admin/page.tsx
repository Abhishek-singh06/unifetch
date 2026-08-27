"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Check, X, Calendar, GraduationCap, Mail, ChevronLeft, ChevronRight, User } from "lucide-react";
import { useTransition, animated } from "@react-spring/web";
import { supabase } from "@/lib/supabase/client";
import { SidebarShell } from "../components/SidebarShell";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { StatPill } from "../components/ui/StatPill";

type Profile = {
  id: string;
  full_name: string;
  college: string;
  email: string | null;
  college_id_url: string | null;
  verification_status: string;
  created_at: string;
};

export default function AdminDashboardPage() {
  const router = useRouter();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [processingId, setProcessingId] = useState("");
  
  // Confirmation state: stores 'approve_ID' or 'reject_ID'
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  // Modal ID Preview State
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewName, setPreviewName] = useState("");

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 6;

  // Trigger reload state
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    async function loadProfiles() {
      setIsLoading(true);
      setErrorMessage("");
      setSuccessMessage("");
      setConfirmAction(null);

      const fromRange = (page - 1) * PAGE_SIZE;
      const toRange = page * PAGE_SIZE - 1;

      // Fetch exact count first for pagination
      const { count, error: countError } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("verification_status", activeTab);

      if (countError) {
        console.error("Error getting profiles count:", countError);
        setErrorMessage(countError.message);
        setIsLoading(false);
        return;
      }

      setTotalCount(count || 0);

      // Fetch active page data
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, college, email, college_id_url, verification_status, created_at")
        .eq("verification_status", activeTab)
        .order("created_at", { ascending: false })
        .range(fromRange, toRange);

      if (error) {
        console.error("Error loading profiles:", error);
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      setProfiles(data || []);
      setIsLoading(false);
    }

    loadProfiles();
  }, [activeTab, page, reloadTrigger]);

  // Reset page number on tab change
  const handleTabChange = (tab: "pending" | "approved" | "rejected") => {
    setActiveTab(tab);
    setPage(1);
  };

  async function verifyUser(id: string) {
    setProcessingId(id);
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("profiles")
      .update({
        verification_status: "approved",
      })
      .eq("id", id);

    if (error) {
      setErrorMessage("Failed to approve student: " + error.message);
      setProcessingId("");
      setConfirmAction(null);
      return;
    }

    setSuccessMessage("Student approved successfully!");
    setConfirmAction(null);
    setProcessingId("");
    
    // Reload profiles to refresh UI
    if (profiles.length === 1 && page > 1) {
      setPage((prev) => prev - 1);
    } else {
      setReloadTrigger((prev) => prev + 1);
    }
  }

  async function rejectUser(id: string) {
    setProcessingId(id);
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("profiles")
      .update({
        verification_status: "rejected",
      })
      .eq("id", id);

    if (error) {
      setErrorMessage("Failed to reject student: " + error.message);
      setProcessingId("");
      setConfirmAction(null);
      return;
    }

    setSuccessMessage("Student rejected successfully!");
    setConfirmAction(null);
    setProcessingId("");
    
    // Reload profiles to refresh UI
    if (profiles.length === 1 && page > 1) {
      setPage((prev) => prev - 1);
    } else {
      setReloadTrigger((prev) => prev + 1);
    }
  }

  async function handleViewCollegeId(profile: Profile) {
    if (!profile.college_id_url) {
      alert("No college ID photo has been uploaded by this student.");
      return;
    }

    setPreviewLoading(true);
    setPreviewName(profile.full_name);
    setPreviewImageUrl(null);

    // Create a 10-minute secure signed URL
    const { data, error } = await supabase.storage
      .from("student-ids")
      .createSignedUrl(profile.college_id_url, 60 * 10);

    setPreviewLoading(false);

    if (error) {
      console.error("Signed URL error:", error);
      alert("Failed to load ID image: " + error.message);
      return;
    }

    setPreviewImageUrl(data.signedUrl);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  // React Spring stagger animation for queue cards
  const queueTransitions = useTransition(profiles, {
    keys: (item) => item.id,
    from: { opacity: 0, transform: "translate3d(0, 15px, 0)" },
    enter: { opacity: 1, transform: "translate3d(0, 0, 0)" },
    leave: { opacity: 0, transform: "translate3d(0, -10px, 0)", height: 0, margin: 0, padding: 0 },
    trail: 45,
    config: { tension: 300, friction: 22 },
  });

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <SidebarShell>
      <div className="p-6 sm:p-8 lg:p-10 space-y-8 relative">
        
        {/* Title area */}
        <div className="border-b border-[rgba(255,255,255,0.08)] pb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#2563eb]">Admin Command Deck</span>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-white leading-none">
              Student Approvals
            </h1>
            <p className="mt-2 text-xs text-[#cbd5e1] font-semibold">
              Approve, reject, or audit student verification records for the platform.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <StatPill label="Total Current Queue" value={totalCount} />
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] font-bold border border-[rgba(255,255,255,0.08)]"
            >
              Logout
            </Button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2.5 p-1 rounded-2xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] w-full max-w-[500px]">
          {(["pending", "approved", "rejected"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              type="button"
              className={`flex-1 text-center py-2.5 rounded-xl text-[10px] uppercase font-bold tracking-wider transition-all duration-200 ${
                activeTab === tab
                  ? "bg-[#2563eb] text-white shadow-glow"
                  : "text-[#cbd5e1] hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {errorMessage && <Alert tone="error">{errorMessage}</Alert>}
        {successMessage && <Alert tone="success">{successMessage}</Alert>}

        {isLoading ? (
          <div className="py-20 text-center">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white shadow-glow animate-bounce mx-auto">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
              </svg>
            </span>
            <p className="mt-4 text-[9px] font-extrabold tracking-widest text-[#cbd5e1] font-display uppercase">
              Retrieving verification lists...
            </p>
          </div>
        ) : profiles.length === 0 ? (
          <EmptyState
            icon={
              activeTab === "pending" ? (
                <Check className="h-10 w-10 text-[#22c55e] animate-pulse" />
              ) : activeTab === "approved" ? (
                <User className="h-10 w-10 text-primary" />
              ) : (
                <X className="h-10 w-10 text-danger" />
              )
            }
            title={
              activeTab === "pending"
                ? "Inbox Zero! No pending verifications"
                : activeTab === "approved"
                ? "No approved students found"
                : "No rejected records found"
            }
            description={`There are currently no users in the ${activeTab} status category.`}
          />
        ) : (
          <div className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              {queueTransitions((style, profile) => {
                const isProcessing = processingId === profile.id;
                const isPending = profile.verification_status === "pending";

                return (
                  <animated.div style={style}>
                    <div className="rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-6 bg-[#080d16]/30 hover:border-[#2563eb]/20 transition-all duration-200 flex flex-col justify-between min-h-[320px]">
                      <div>
                        <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] pb-3">
                          <span className="text-[9px] font-extrabold text-[#cbd5e1] uppercase tracking-wider block font-mono">
                            User ID: {profile.id.substring(0, 8)}...
                          </span>
                          
                          <Badge
                            tone={
                              profile.verification_status === "approved" ? "success" :
                              profile.verification_status === "rejected" ? "danger" : "warning"
                            }
                            className="font-bold text-[8px] uppercase tracking-wider px-2 py-0.5"
                          >
                            {profile.verification_status}
                          </Badge>
                        </div>

                        <h3 className="mt-4 font-display text-xl font-bold text-white leading-none">
                          {profile.full_name}
                        </h3>

                        {/* Profile Info Details */}
                        <div className="mt-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#05070b]/60 p-4 space-y-2.5 text-xs text-[#cbd5e1] font-semibold">
                          <p className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-[#2563eb] shrink-0" />
                            <span className="truncate text-white">{profile.college || "No College Specified"}</span>
                          </p>
                          <p className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-[#2563eb] shrink-0" />
                            <span className="truncate text-[#cbd5e1]" title={profile.email || ""}>
                              {profile.email || "No Email Logged"}
                            </span>
                          </p>
                          <p className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-[#cbd5e1] shrink-0" />
                            <span className="text-muted">Registered: {new Date(profile.created_at).toLocaleDateString()}</span>
                          </p>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="mt-5 pt-3.5 border-t border-[rgba(255,255,255,0.04)]">
                        {confirmAction === `approve_${profile.id}` ? (
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => verifyUser(profile.id)}
                              disabled={isProcessing}
                              className="flex-1 bg-success hover:bg-success/90 uppercase tracking-widest text-[9px] font-bold"
                            >
                              Confirm Approve?
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => setConfirmAction(null)}
                              disabled={isProcessing}
                              className="px-4 border-[rgba(255,255,255,0.08)] uppercase tracking-widest text-[9px] font-bold"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : confirmAction === `reject_${profile.id}` ? (
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="danger"
                              onClick={() => rejectUser(profile.id)}
                              disabled={isProcessing}
                              className="flex-1 uppercase tracking-widest text-[9px] font-bold"
                            >
                              Confirm Reject?
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => setConfirmAction(null)}
                              disabled={isProcessing}
                              className="px-4 border-[rgba(255,255,255,0.08)] uppercase tracking-widest text-[9px] font-bold"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2.5">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => handleViewCollegeId(profile)}
                              className="flex-1 flex items-center justify-center gap-1.5 uppercase tracking-wider text-[10px] font-bold border border-[rgba(255,255,255,0.08)] bg-transparent hover:bg-white/5"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>View ID</span>
                            </Button>

                            {isPending && (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => setConfirmAction(`approve_${profile.id}`)}
                                  className="flex-1 flex items-center justify-center gap-1.5 uppercase tracking-wider text-[10px] font-bold shadow-glow"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  <span>Approve</span>
                                </Button>

                                <Button
                                  type="button"
                                  variant="danger"
                                  size="sm"
                                  onClick={() => setConfirmAction(`reject_${profile.id}`)}
                                  className="px-3 flex items-center justify-center gap-1.5 uppercase tracking-wider text-[10px] font-bold border border-[rgba(255,255,255,0.08)]"
                                  title="Reject student"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}

                            {!isPending && activeTab === "approved" && (
                              <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                onClick={() => setConfirmAction(`reject_${profile.id}`)}
                                className="flex-1 flex items-center justify-center gap-1.5 uppercase tracking-wider text-[10px] font-bold border border-[rgba(255,255,255,0.08)]"
                              >
                                <X className="h-3.5 w-3.5" />
                                <span>Revoke / Reject</span>
                              </Button>
                            )}

                            {!isPending && activeTab === "rejected" && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => setConfirmAction(`approve_${profile.id}`)}
                                className="flex-1 flex items-center justify-center gap-1.5 uppercase tracking-wider text-[10px] font-bold shadow-glow"
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span>Re-approve</span>
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </animated.div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4.5 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                  className="px-3 py-2 border-[rgba(255,255,255,0.08)] disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Page {page} of {totalPages} ({totalCount} total)
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={page === totalPages}
                  className="px-3 py-2 border-[rgba(255,255,255,0.08)] disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Modal ID Viewer Overlay */}
        {(previewLoading || previewImageUrl) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-2xl rounded-3xl border border-[rgba(255,255,255,0.12)] bg-[#080d16] p-6 shadow-2xl flex flex-col max-h-[85vh]">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-4.5 mb-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#2563eb] block">ID Card Document</span>
                  <h3 className="font-display text-lg font-bold text-white mt-1">{previewName}</h3>
                </div>
                <button
                  onClick={() => { setPreviewImageUrl(null); }}
                  className="h-8.5 w-8.5 rounded-xl bg-white/5 border border-[rgba(255,255,255,0.08)] hover:bg-white/10 hover:border-white/20 flex items-center justify-center transition-colors text-white"
                  title="Close Preview"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Image Body */}
              <div className="flex-1 overflow-auto flex items-center justify-center bg-[#05070b]/60 rounded-2xl border border-[rgba(255,255,255,0.04)] p-4 min-h-[300px]">
                {previewLoading ? (
                  <div className="text-center">
                    <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white shadow-glow animate-bounce mx-auto">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
                        <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                      </svg>
                    </span>
                    <p className="mt-3 text-[9px] font-extrabold tracking-widest text-[#cbd5e1] font-display uppercase">Generating secure URL...</p>
                  </div>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={previewImageUrl || ""}
                    alt={`Student ID card for ${previewName}`}
                    className="max-h-[50vh] w-auto object-contain rounded-xl border border-[rgba(255,255,255,0.08)] shadow-glow"
                  />
                )}
              </div>

              {/* Modal Footer */}
              <div className="mt-4 border-t border-[rgba(255,255,255,0.08)] pt-4 flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => { setPreviewImageUrl(null); }}
                  className="px-6 border-[rgba(255,255,255,0.08)] uppercase tracking-wider text-[10px] font-bold"
                >
                  Close Viewer
                </Button>
              </div>

            </div>
          </div>
        )}

      </div>
    </SidebarShell>
  );
}
