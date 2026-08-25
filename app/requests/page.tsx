"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

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

      // NOTE: the OTP is intentionally NOT stored on package_requests (that
      // table is browsable by all users). It's fetched per-request through a
      // requester-only security-definer RPC.
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

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f8f7f2] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-3 border-[#d8e8de] border-t-[#0f4c3a]" />
          <p className="mt-3 text-xs font-semibold text-[#577568]">Loading your orders...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f7f2] px-5 py-8 text-[#0c1c15] sm:px-8 sm:py-12 selection:bg-[#10b981]/20">
      <div className="mx-auto max-w-5xl">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold text-[#0f4c3a] hover:text-[#093326]"
          >
            <span>← Back to UniFetch</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/carry"
              className="rounded-full border border-[#d6e3db] bg-white px-4 py-2 text-xs font-bold text-[#0f4c3a] shadow-xs hover:bg-[#edeae0] transition"
            >
              Carry Packages 🚴
            </Link>

            <Link
              href="/request"
              className="rounded-full bg-[#0f4c3a] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#0f4c3a]/20 hover:bg-[#0a382a] transition"
            >
              + New Request
            </Link>
          </div>
        </div>

        {/* Dashboard Title & Stats Bar */}
        <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#0f4c3a]">
              Student Dashboard
            </span>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-[#081e15] sm:text-4xl">
              My Package Requests
            </h1>
            <p className="mt-1 text-sm text-[#5c7a6e]">
              Real-time tracker for packages waiting at the gate.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="rounded-2xl border border-[#e2dcd0] bg-white px-4 py-2.5 shadow-xs">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#6b857a]">
                Active Orders
              </span>
              <span className="font-display text-xl font-bold text-[#0f4c3a]">
                {activeCount}
              </span>
            </div>

            <div className="rounded-2xl border border-[#e2dcd0] bg-white px-4 py-2.5 shadow-xs">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#6b857a]">
                Delivered
              </span>
              <span className="font-display text-xl font-bold text-[#0c241b]">
                {deliveredCount}
              </span>
            </div>
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-[#fecaca] bg-[#fff5f5] p-4 text-xs font-semibold text-[#991b1b]">
            {errorMessage}
          </div>
        )}

        {/* Empty State */}
        {!errorMessage && requests.length === 0 && (
          <div className="mt-10 rounded-3xl border border-[#e2dcd0] bg-white p-12 text-center shadow-lg shadow-[#0c241b]/5">
            <div className="text-5xl">📦</div>
            <h2 className="mt-4 font-display text-2xl font-bold text-[#0c241b]">
              No active package requests
            </h2>
            <p className="mt-2 text-sm text-[#617e72]">
              Have a parcel waiting at the gate? Create your first request in seconds.
            </p>
            <Link
              href="/request"
              className="mt-6 inline-flex items-center rounded-xl bg-[#0f4c3a] px-6 py-3.5 text-xs font-bold text-white shadow-md shadow-[#0f4c3a]/20 hover:bg-[#0a382a] transition"
            >
              Post a Gate Pickup →
            </Link>
          </div>
        )}

        {/* Request Cards List */}
        <div className="mt-8 space-y-6">
          {requests.map((request) => {
            const isMatched = request.status === "matched";
            const isDelivered = request.status === "delivered";
            const isPending = request.status === "pending";

            return (
              <article
                key={request.id}
                className="rounded-3xl border border-[#e2dcd0] bg-white p-6 shadow-md shadow-[#0c241b]/5 transition sm:p-7"
              >
                {/* Top Row: Description and Badge */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ecfdf5] text-2xl border border-[#bbf7d0]">
                      📦
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-bold text-[#0c241b]">
                        {request.package_description}
                      </h2>
                      <p className="mt-1 text-xs text-[#5c7a6e]">
                        <strong>Route:</strong> {request.pickup_location} ➔{" "}
                        {request.delivery_location}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 self-start sm:self-center rounded-full px-3.5 py-1.5 text-xs font-bold tracking-wide ${
                      isDelivered
                        ? "bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]"
                        : isMatched
                        ? "bg-[#eff6ff] text-[#1e40af] border border-[#bfdbfe] animate-pulse"
                        : "bg-[#fffbeb] text-[#92400e] border border-[#fef3c7]"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    <span>
                      {isDelivered
                        ? "DELIVERED"
                        : isMatched
                        ? "CARRIER EN ROUTE"
                        : "WAITING FOR CARRIER"}
                    </span>
                  </span>
                </div>

                {/* Progress Step Bar */}
                <div className="mt-6 border-t border-[#f0ebd9] pt-6">
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-bold">
                    <div
                      className={`p-2 rounded-xl border ${
                        isPending || isMatched || isDelivered
                          ? "bg-[#ecfdf5] text-[#0f4c3a] border-[#bbf7d0]"
                          : "bg-[#fbfaf6] text-[#9bb2a5] border-[#e8e4da]"
                      }`}
                    >
                      1. Request Published ✓
                    </div>
                    <div
                      className={`p-2 rounded-xl border ${
                        isMatched || isDelivered
                          ? "bg-[#ecfdf5] text-[#0f4c3a] border-[#bbf7d0]"
                          : "bg-[#fbfaf6] text-[#9bb2a5] border-[#e8e4da]"
                      }`}
                    >
                      2. Carrier Claimed {isMatched ? "🚴" : isDelivered ? "✓" : ""}
                    </div>
                    <div
                      className={`p-2 rounded-xl border ${
                        isDelivered
                          ? "bg-[#ecfdf5] text-[#0f4c3a] border-[#bbf7d0]"
                          : "bg-[#fbfaf6] text-[#9bb2a5] border-[#e8e4da]"
                      }`}
                    >
                      3. OTP Verified Handoff {isDelivered ? "✓" : ""}
                    </div>
                  </div>
                </div>

                {/* Status Callouts */}
                {isMatched && (
                  <div className="mt-6 rounded-2xl border border-[#bfdbfe] bg-[#f0f7ff] p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-bold text-[#1e40af] text-sm">
                          🚴 A student is bringing your parcel!
                        </p>
                        <p className="mt-1 text-xs text-[#3b5998]">
                          Share this OTP with them only when you physically receive the package:
                        </p>
                      </div>

                      {otps[request.id] && (
                        <div className="flex items-center gap-2 self-start sm:self-center">
                          <span className="rounded-xl border-2 border-dashed border-[#1e40af]/40 bg-white px-4 py-2 font-mono text-2xl font-black tracking-[0.25em] text-[#1e40af] shadow-xs">
                            {otps[request.id]}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyOtp(request.id, otps[request.id])}
                            className="rounded-xl bg-white border border-[#bfdbfe] px-3 py-2.5 text-xs font-bold text-[#1e40af] hover:bg-[#e0efff] transition"
                          >
                            {copiedOtpId === request.id ? "✓ Copied" : "Copy"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {isDelivered && (
                  <div className="mt-6 flex items-center justify-between rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] p-4 text-xs font-semibold text-[#065f46]">
                    <div>
                      <span>✓ Package handoff completed successfully</span>
                      {request.delivered_at && (
                        <span className="block mt-0.5 text-[11px] text-[#4d826e]">
                          Delivered on {new Date(request.delivered_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <span className="rounded-full bg-white border border-[#86efac] px-3 py-1 text-[10px] font-bold">
                      OTP VERIFIED 🛡️
                    </span>
                  </div>
                )}

                {isPending && (
                  <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[#fef3c7] bg-[#fffdf7] p-4 text-xs text-[#92400e]">
                    <div>
                      <span className="font-bold">⏳ Waiting for a peer near the gate</span>
                      {otps[request.id] && (
                        <span className="block mt-1 text-[11px] text-[#a16207]">
                          Your confidential OTP: <strong className="font-mono tracking-widest">{otps[request.id]}</strong>
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCancelRequest(request.id)}
                      disabled={cancelingId === request.id}
                      className="self-start sm:self-center rounded-xl bg-white border border-[#fde68a] px-3.5 py-2 text-xs font-bold text-[#b45309] hover:bg-[#fffbeb] transition"
                    >
                      {cancelingId === request.id ? "Canceling..." : "Cancel Request"}
                    </button>
                  </div>
                )}

                {/* Footer Time */}
                <div className="mt-4 flex justify-between text-[11px] text-[#7d998c]">
                  <span>Needed by: {new Date(request.pickup_time).toLocaleString()}</span>
                  <span>Requested: {new Date(request.created_at).toLocaleDateString()}</span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}