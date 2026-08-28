"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Copy, Check, Calendar, MapPin, Package, Inbox } from "lucide-react";
import { useTransition, animated } from "@react-spring/web";
import { supabase } from "@/lib/supabase/client";
import { SidebarShell } from "../components/SidebarShell";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { EmptyState } from "../components/ui/EmptyState";
import { StatPill } from "../components/ui/StatPill";
import { StatusBadge } from "../components/ui/StatusBadge";

type PackageRequest = {
  id: string;
  package_description: string;
  pickup_location: string;
  delivery_location: string;
  pickup_time: string;
  status: string;
  carrier_id: string | null;
  otp_verified: boolean;
  delivered_at: string | null;
  created_at: string;
};

export default function RequestsPage() {
  const [requests, setRequests] = useState<PackageRequest[]>([]);
  const [otps, setOtps] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [copiedOtpId, setCopiedOtpId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRequests() {
      setErrorMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) {
          setErrorMessage("Please sign in to view your requests.");
          setIsLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("package_requests")
        .select(
          "id, package_description, pickup_location, delivery_location, pickup_time, status, carrier_id, otp_verified, delivered_at, created_at"
        )
        .eq("requester_id", user.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error("Error loading requests:", error);
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      setRequests(data || []);
      setIsLoading(false);

      if (data) {
        const otpResults = await Promise.all(
          data.map(async (request) => {
            const { data: otp } = await supabase.rpc("get_my_request_otp", {
              p_request_id: request.id,
            });
            return [request.id, otp ?? ""] as const;
          })
        );
        if (!cancelled) {
          setOtps(Object.fromEntries(otpResults));
        }
      }
    }

    loadRequests();

    const channel = supabase
      .channel("user-requests-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "package_requests",
        },
        () => {
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleCancelRequest(requestId: string) {
    if (!confirm("Are you sure you want to cancel this request?")) return;

    setCancelingId(requestId);
    const { error } = await supabase
      .from("package_requests")
      .delete()
      .eq("id", requestId)
      .eq("status", "pending");

    if (error) {
      alert("Could not cancel request: " + error.message);
    } else {
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    }
    setCancelingId(null);
  }

  function handleCopyOtp(requestId: string, otp: string) {
    navigator.clipboard.writeText(otp);
    setCopiedOtpId(requestId);
    setTimeout(() => setCopiedOtpId(null), 2000);
  }

  const activeCount = requests.filter((r) => r.status === "pending" || r.status === "matched").length;
  const deliveredCount = requests.filter((r) => r.status === "delivered").length;

  const cardTransitions = useTransition(requests, {
    keys: (item) => item.id,
    from: { opacity: 0, transform: "translate3d(0, 15px, 0)" },
    enter: { opacity: 1, transform: "translate3d(0, 0, 0)" },
    leave: { opacity: 0, transform: "translate3d(0, -10px, 0)", height: 0, marginBottom: 0, padding: 0 },
    trail: 60,
    config: { tension: 320, friction: 24 },
  });

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05070b]">
        <div className="text-center">
          <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-glow animate-bounce mx-auto">
            <svg className="h-6 w-6 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
          </span>
          <p className="mt-5 text-[10px] font-extrabold tracking-widest text-[#cbd5e1] font-display uppercase">
            Loading your orders...
          </p>
        </div>
      </main>
    );
  }

  return (
    <SidebarShell>
      <div className="p-6 sm:p-8 lg:p-10 space-y-8">
        
        {/* Title area */}
        <div className="border-b border-[rgba(255,255,255,0.08)] pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#2563eb]">Within College</span>
              <span className="text-[9px] bg-[#2563eb]/15 text-primary border border-[#2563eb]/30 px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider">
                Payment Type: UniFetch Credits
              </span>
            </div>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-white leading-none">
              Package Requests Pipeline
            </h1>
            <p className="mt-2 text-xs text-[#cbd5e1] font-semibold">
              Track packages waiting at campus gates or heading to your hostel block in real-time.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <StatPill label="Active" value={activeCount} />
            <StatPill label="Completed" value={deliveredCount} />
          </div>
        </div>

        {errorMessage && <Alert tone="error">{errorMessage}</Alert>}

        {/* Empty state */}
        {!errorMessage && requests.length === 0 && (
          <EmptyState
            icon={<Inbox className="h-10 w-10 text-primary animate-pulse" />}
            title="No active package requests"
            description="Have a parcel waiting at the gate? Create your first request in seconds."
            action={
              <Link href="/request" className="neo-btn-primary px-7 py-3.5 text-xs font-extrabold uppercase tracking-widest shadow-glow">
                Post a Gate Pickup →
              </Link>
            }
          />
        )}

        {/* Requests Feed and Active OTP Grid Split */}
        {requests.length > 0 && (
          <div className="grid gap-8 lg:grid-cols-[1.6fr_0.9fr] items-start">
            
            {/* Left Column: list of requests */}
            <div className="space-y-5">
              {cardTransitions((style, request) => {
                const isMatched = request.status === "matched";
                const isDelivered = request.status === "delivered";
                const isPending = request.status === "pending";

                return (
                  <animated.div style={style}>
                    <div className="rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-6 bg-[#080d16]/30 hover:border-[#2563eb]/30 transition-all duration-200">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[rgba(255,255,255,0.06)] pb-4.5">
                        <div className="flex items-start gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2563eb]/10 border border-[#2563eb]/20 text-[#2563eb]">
                            <Package className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-display text-lg font-bold text-white leading-tight">
                              {request.package_description}
                            </h3>
                            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#cbd5e1] font-semibold">
                              <span className="flex items-center gap-1.5">
                                <MapPin className="h-4 w-4 text-[#2563eb]" />
                                <span>Pickup: {request.pickup_location}</span>
                              </span>
                              <span className="text-[rgba(255,255,255,0.15)] hidden sm:inline">➔</span>
                              <span>Dropoff: {request.delivery_location}</span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 self-start sm:self-center">
                          <StatusBadge status={isDelivered ? "delivered" : isMatched ? "matched" : "pending"} />
                        </div>
                      </div>

                      {/* Timeline status bar */}
                      <div className="mt-5 pt-1">
                        <div className="flex justify-between text-[9px] font-extrabold text-[#cbd5e1] mb-2 uppercase tracking-widest leading-none">
                          <span>Progress status</span>
                          <span>{isDelivered ? "100%" : isMatched ? "66%" : "33%"}</span>
                        </div>
                        <div className="h-2 w-full bg-[#05070b]/60 border border-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#2563eb] rounded-full transition-all duration-300 shadow-glow animate-pulse-slow"
                            style={{ width: isDelivered ? "100%" : isMatched ? "66%" : "33%" }}
                          />
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-[rgba(255,255,255,0.04)] flex flex-wrap items-center justify-between gap-4 text-[10px] text-[#cbd5e1] font-semibold uppercase tracking-wider">
                        <span className="flex items-center gap-2">
                          <Calendar className="h-4.5 w-4.5 text-[#2563eb]" />
                          Needed: {new Date(request.pickup_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        
                        {isPending && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => handleCancelRequest(request.id)}
                            disabled={cancelingId === request.id}
                            className="text-[#ef4444] border border-[rgba(255,255,255,0.08)] bg-transparent hover:border-[#ef4444]/30 hover:text-[#ef4444] hover:bg-[#ef4444]/6 px-4 py-2 text-[10px] font-bold rounded-xl"
                          >
                            {cancelingId === request.id ? "Canceling..." : "Cancel"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </animated.div>
                );
              })}
            </div>

            {/* Right Column: Active OTP Keys */}
            <div className="space-y-5 lg:sticky lg:top-[85px]">
              <div className="rounded-[2.5rem] border border-[#2563eb]/25 p-6 bg-gradient-to-b from-[#080d16] to-[#05070b]/60 shadow-glow relative overflow-hidden">
                <div className="absolute top-[20%] right-[-10%] w-[150px] h-[150px] rounded-full bg-[#2563eb]/8 blur-2xl pointer-events-none" />
                <h3 className="font-display text-lg font-bold text-white flex items-center gap-2 border-b border-[rgba(255,255,255,0.08)] pb-4">
                  <span>🔒 Verification Keys</span>
                </h3>
                <p className="mt-3.5 text-xs text-[#cbd5e1] font-semibold leading-relaxed">
                  Provide these 6-digit verification keys to the student carrier when they hand over your package.
                </p>

                <div className="mt-5 space-y-4">
                  {requests.filter(r => r.status === "pending" || r.status === "matched").map((request) => {
                    const otpVal = otps[request.id];
                    const isMatched = request.status === "matched";
                    return (
                      <div key={request.id} className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#05070b]/60 p-4.5 font-semibold text-xs relative">
                        <p className="text-white truncate max-w-[220px] font-bold">{request.package_description}</p>
                        
                        <div className="mt-4 flex items-center justify-between gap-3">
                          {isMatched ? (
                            <span className="inline-flex items-center gap-1.5 bg-[#2563eb]/10 text-primary border border-[#2563eb]/20 text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                              En Route 🚴
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 bg-[#eab308]/10 text-[#eab308] border border-[#eab308]/20 text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                              Waiting
                            </span>
                          )}

                          {otpVal ? (
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="rounded-xl border border-[#2563eb]/30 bg-[#05070b]/80 px-3 py-1.5 font-mono text-base font-black tracking-widest text-[#2563eb] shadow-sm select-all drop-shadow-[0_0_10px_rgba(37,99,235,0.15)]">
                                {otpVal}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyOtp(request.id, otpVal)}
                                className="h-8.5 w-8.5 rounded-xl bg-white/5 border border-[rgba(255,255,255,0.08)] hover:bg-[#2563eb]/10 hover:border-[#2563eb]/30 flex items-center justify-center transition-colors"
                                title="Copy OTP"
                              >
                                {copiedOtpId === request.id ? (
                                  <Check className="h-4 w-4 text-[#22c55e]" />
                                ) : (
                                  <Copy className="h-4 w-4 text-[#cbd5e1]" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted">Loading OTP...</span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {requests.filter(r => r.status === "pending" || r.status === "matched").length === 0 && (
                    <div className="text-center py-7 text-xs font-bold text-[#cbd5e1] uppercase tracking-widest border border-dashed border-[rgba(255,255,255,0.08)] rounded-2xl bg-white/2 select-none">
                      No active codes
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </SidebarShell>
  );
}