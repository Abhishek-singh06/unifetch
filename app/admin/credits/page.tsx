"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Check, X, Calendar, Mail, ChevronLeft, ChevronRight, Eye, Info } from "lucide-react";
import { useTransition, animated } from "@react-spring/web";
import { supabase } from "@/lib/supabase/client";
import { SidebarShell } from "../../components/SidebarShell";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatPill } from "../../components/ui/StatPill";

type PurchaseRecord = {
  id: string;
  credits: number;
  amount: number;
  payment_reference: string;
  payment_proof_url: string | null;
  status: "pending" | "completed" | "rejected";
  rejection_reason: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    email: string | null;
  } | null;
};

export default function AdminCreditsDashboardPage() {
  const router = useRouter();

  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "completed" | "rejected">("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [processingId, setProcessingId] = useState("");
  
  // Modal Image Preview State
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
    async function loadPurchases() {
      setIsLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const fromRange = (page - 1) * PAGE_SIZE;
      const toRange = page * PAGE_SIZE - 1;

      // Fetch exact count first for pagination
      const { count, error: countError } = await supabase
        .from("credit_purchases")
        .select("id", { count: "exact", head: true })
        .eq("status", activeTab);

      if (countError) {
        console.error("Error getting purchases count:", countError);
        setErrorMessage(countError.message);
        setIsLoading(false);
        return;
      }

      setTotalCount(count || 0);

      // Fetch active page data joining with student profiles
      const { data, error } = await supabase
        .from("credit_purchases")
        .select(`
          id, credits, amount, payment_reference, payment_proof_url, status, rejection_reason, created_at,
          profiles:user_id ( full_name, email )
        `)
        .eq("status", activeTab)
        .order("created_at", { ascending: false })
        .range(fromRange, toRange);

      if (error) {
        console.error("Error loading purchases:", error);
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      setPurchases((data as unknown as PurchaseRecord[]) || []);
      setIsLoading(false);
    }

    loadPurchases();
  }, [activeTab, page, reloadTrigger]);

  const handleTabChange = (tab: "pending" | "completed" | "rejected") => {
    setActiveTab(tab);
    setPage(1);
  };

  async function handleApprove(id: string) {
    if (!confirm("Are you sure you want to approve this credit purchase? This will instantly add the credits to the student wallet.")) {
      return;
    }
    setProcessingId(id);
    setErrorMessage("");
    setSuccessMessage("");

    const { data: success, error } = await supabase.rpc("approve_credit_purchase", {
      p_purchase_id: id
    });

    if (error) {
      setErrorMessage("Failed to approve transaction: " + error.message);
      setProcessingId("");
      return;
    }

    if (success) {
      setSuccessMessage("Transaction approved successfully! Credits awarded.");
    }
    
    setProcessingId("");
    if (purchases.length === 1 && page > 1) {
      setPage((prev) => prev - 1);
    } else {
      setReloadTrigger((prev) => prev + 1);
    }
  }

  async function handleReject(id: string) {
    const reason = prompt("Enter a reason for rejecting this credit purchase (optional):");
    if (reason === null) return; // Cancelled prompt

    setProcessingId(id);
    setErrorMessage("");
    setSuccessMessage("");

    const { data: success, error } = await supabase.rpc("reject_credit_purchase", {
      p_purchase_id: id,
      p_rejection_reason: reason.trim() || null
    });

    if (error) {
      setErrorMessage("Failed to reject transaction: " + error.message);
      setProcessingId("");
      return;
    }

    if (success) {
      setSuccessMessage("Transaction rejected.");
    }
    
    setProcessingId("");
    if (purchases.length === 1 && page > 1) {
      setPage((prev) => prev - 1);
    } else {
      setReloadTrigger((prev) => prev + 1);
    }
  }

  async function handleViewProof(record: PurchaseRecord) {
    if (!record.payment_proof_url) {
      alert("No payment screenshot proof has been uploaded by the student.");
      return;
    }

    setPreviewLoading(true);
    setPreviewName(record.profiles?.full_name || "Student Receipt");
    setPreviewImageUrl(null);

    // Create a 10-minute secure signed URL
    const { data, error } = await supabase.storage
      .from("payment-proofs")
      .createSignedUrl(record.payment_proof_url, 60 * 10);

    setPreviewLoading(false);

    if (error) {
      console.error("Signed URL error:", error);
      alert("Failed to load screenshot image: " + error.message);
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
  const queueTransitions = useTransition(purchases, {
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
              Credit Purchase Approvals
            </h1>
            <p className="mt-2 text-xs text-[#cbd5e1] font-semibold">
              Manually review and approve UPI transactions submitted by students to award credits.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <StatPill label="Pending Purchases" value={totalCount} />
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
          {(["pending", "completed", "rejected"] as const).map((tab) => (
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
              Retrieving purchase log queue...
            </p>
          </div>
        ) : purchases.length === 0 ? (
          <EmptyState
            icon={
              activeTab === "pending" ? (
                <Check className="h-10 w-10 text-[#22c55e] animate-pulse" />
              ) : activeTab === "completed" ? (
                <Coins className="h-10 w-10 text-primary" />
              ) : (
                <X className="h-10 w-10 text-danger" />
              )
            }
            title={
              activeTab === "pending"
                ? "No pending credit purchases to review"
                : activeTab === "completed"
                ? "No completed records found"
                : "No rejected transactions found"
            }
            description={`There are currently no credit purchase records in the ${activeTab} category.`}
          />
        ) : (
          <div className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              {queueTransitions((style, record) => {
                const isProcessing = processingId === record.id;
                const isPending = record.status === "pending";

                return (
                  <animated.div
                    style={style}
                    className="flex flex-col justify-between rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#080d16]/30 backdrop-blur-sm p-6 space-y-6 shadow-glow relative overflow-hidden"
                  >
                    <div className="space-y-4">
                      {/* Student details header */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h3 className="font-display font-bold text-white text-base leading-snug">
                            {record.profiles?.full_name || "Unknown Student"}
                          </h3>
                          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#cbd5e1]">
                            <Mail className="h-3 w-3 text-primary shrink-0" />
                            <span>{record.profiles?.email || "No Email"}</span>
                          </div>
                        </div>
                        <Badge tone={record.status === "pending" ? "warning" : record.status === "completed" ? "success" : "danger"}>
                          {record.status}
                        </Badge>
                      </div>

                      {/* Package amount pill */}
                      <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-white/2 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Coins className="h-5 w-5 text-primary shrink-0" />
                          <div>
                            <span className="text-[8px] font-bold text-[#cbd5e1] uppercase tracking-wider block">Credit Package</span>
                            <span className="font-display font-black text-sm text-white mt-0.5">{record.credits} Credits</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] font-bold text-[#cbd5e1] uppercase tracking-wider block">Price Paid</span>
                          <span className="font-display font-extrabold text-sm text-[#22c55e] mt-0.5">₹{record.amount}</span>
                        </div>
                      </div>

                      {/* Payment info detail list */}
                      <div className="space-y-2 text-xs font-semibold text-[#cbd5e1]">
                        <div className="flex justify-between items-center bg-[#03060c] p-2.5 rounded-xl border border-white/5">
                          <span>UPI Transaction UTR:</span>
                          <span className="font-mono text-white font-black select-all tracking-wider">{record.payment_reference}</span>
                        </div>
                        
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-muted" />
                            Submitted:
                          </span>
                          <span className="text-white">{new Date(record.created_at).toLocaleString()}</span>
                        </div>

                        {record.rejection_reason && (
                          <div className="text-[10px] text-[#ef4444] bg-[#ef4444]/8 p-2 rounded-xl border border-[#ef4444]/15 mt-2 flex items-start gap-1">
                            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <span>Reason: {record.rejection_reason}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions button footer */}
                    <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                      {record.payment_proof_url && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleViewProof(record)}
                          className="flex-1 flex items-center justify-center gap-1.5 text-[10px] uppercase font-bold tracking-wider"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View Screenshot
                        </Button>
                      )}
                      
                      {isPending && (
                        <>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={isProcessing}
                            onClick={() => handleReject(record.id)}
                            className="flex-1 flex items-center justify-center gap-1 text-[10px] uppercase font-bold tracking-wider hover:bg-danger/10 hover:text-danger hover:border-danger/25"
                          >
                            <X className="h-3.5 w-3.5" />
                            Reject
                          </Button>
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            disabled={isProcessing}
                            onClick={() => handleApprove(record.id)}
                            className="flex-1 flex items-center justify-center gap-1 text-[10px] uppercase font-bold tracking-wider shadow-glow"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Approve
                          </Button>
                        </>
                      )}
                    </div>
                  </animated.div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.08)] pt-6 mt-8">
                <span className="text-[10px] font-bold text-[#cbd5e1] uppercase tracking-wider">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((prev) => prev - 1)}
                    className="p-2 min-w-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage((prev) => prev + 1)}
                    className="p-2 min-w-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Secure modal preview for payment screenshot */}
        {previewImageUrl && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="relative max-w-lg w-full rounded-[2rem] border border-[rgba(255,255,255,0.1)] bg-[#05070b] p-6 shadow-2xl flex flex-col space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h4 className="font-display font-bold text-white text-base truncate">{previewName} - Receipt Proof</h4>
                <button
                  type="button"
                  onClick={() => setPreviewImageUrl(null)}
                  className="text-[#cbd5e1] hover:text-white transition p-1 bg-white/5 rounded-full"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="overflow-hidden rounded-2xl bg-black flex items-center justify-center p-2 border border-white/5">
                <img src={previewImageUrl} alt="Payment Receipt Screenshot" className="max-h-[60vh] object-contain rounded-xl w-full" />
              </div>
              <div className="flex justify-end">
                <Button type="button" variant="secondary" onClick={() => setPreviewImageUrl(null)} size="sm" className="uppercase font-bold tracking-wider text-[10px]">
                  Close Preview
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Loading Spinner during Signed URL fetch */}
        {previewLoading && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="text-center bg-[#05070b] border border-white/10 rounded-3xl p-8 shadow-2xl">
              <svg className="h-8 w-8 animate-spin text-primary mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
              </svg>
              <p className="mt-4 text-[9px] font-extrabold tracking-widest text-[#cbd5e1] font-display uppercase">
                Loading Secure Image Link...
              </p>
            </div>
          </div>
        )}

      </div>
    </SidebarShell>
  );
}
