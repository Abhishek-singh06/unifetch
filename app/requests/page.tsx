"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Logo } from "../components/ui/Logo";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Alert } from "../components/ui/Alert";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
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
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-[var(--shadow-primary)]">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
          </span>
          <p className="mt-4 text-xs font-semibold tracking-wide text-muted">
            Loading your orders...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-8 sm:py-12 selection:bg-accent/20">
      <div className="mx-auto max-w-5xl">
        {/* Top Header */}
        <PageHeader
          backHref="/"
          backLabel="Back to UniFetch"
          actions={
            <div className="flex items-center gap-3">
              <Link href="/carry" className="btn-ghost px-4 py-2 text-xs">
                Carry Packages 🚴
              </Link>
              <Link href="/request" className="btn-primary px-4 py-2 text-xs">
                + New Request
              </Link>
            </div>
          }
        />

        {/* Dashboard Title & Stats Bar */}
        <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="eyebrow">Student Dashboard</span>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-primary-hover sm:text-4xl">
              My Package Requests
            </h1>
            <p className="mt-1 text-sm text-muted">
              Real-time tracker for packages waiting at the gate.
            </p>
          </div>

          <div className="flex gap-3">
            <StatPill label="Active Orders" value={activeCount} />
            <StatPill label="Delivered" value={deliveredCount} />
          </div>
        </div>

        {/* Error message */}
        <Alert tone="error" className="mt-6">{errorMessage}</Alert>

        {/* Empty State */}
        {!errorMessage && requests.length === 0 && (
          <EmptyState
            icon={<span className="text-4xl">📦</span>}
            title="No active package requests"
            description="Have a parcel waiting at the gate? Create your first request in seconds."
            action={
              <Link href="/request" className="btn-primary px-6 py-3.5 text-xs">
                Post a Gate Pickup →
              </Link>
            }
          />
        )}

        {/* Request Cards List */}
        <div className="mt-8 space-y-6">
          {requests.map((request) => {
            const isMatched = request.status === "matched";
            const isDelivered = request.status === "delivered";
            const isPending = request.status === "pending";

            return (
              <Card key={request.id} className="p-6 hover:shadow-[var(--shadow-lift)] hover:border-border-strong sm:p-7">
                {/* Top Row: Description and Badge */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-tint text-2xl border border-accent/30">
                      📦
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-bold text-primary-hover">
                        {request.package_description}
                      </h2>
                      <p className="mt-1 text-xs text-muted">
                        <strong>Route:</strong> {request.pickup_location} ➔{" "}
                        {request.delivery_location}
                      </p>
                    </div>
                  </div>

                  <StatusBadge status={isDelivered ? "delivered" : isMatched ? "matched" : "pending"} />
                </div>

                {/* Progress Step Bar */}
                <div className="mt-6 border-t border-border pt-6">
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-bold">
                    <div
                      className={`p-2 rounded-xl border ${
                        isPending || isMatched || isDelivered
                          ? "bg-primary-tint text-primary border-accent/30"
                          : "bg-surface-soft text-muted border-border"
                      }`}
                    >
                      1. Request Published ✓
                    </div>
                    <div
                      className={`p-2 rounded-xl border ${
                        isMatched || isDelivered
                          ? "bg-primary-tint text-primary border-accent/30"
                          : "bg-surface-soft text-muted border-border"
                      }`}
                    >
                      2. Carrier Claimed {isMatched ? "🚴" : isDelivered ? "✓" : ""}
                    </div>
                    <div
                      className={`p-2 rounded-xl border ${
                        isDelivered
                          ? "bg-primary-tint text-primary border-accent/30"
                          : "bg-surface-soft text-muted border-border"
                      }`}
                    >
                      3. OTP Verified Handoff {isDelivered ? "✓" : ""}
                    </div>
                  </div>
                </div>

                {/* Status Callouts */}
                {isMatched && (
                  <div className="mt-6 rounded-2xl border border-info-border bg-info-tint p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-bold text-info text-sm">
                          🚴 A student is bringing your parcel!
                        </p>
                        <p className="mt-1 text-xs text-[#3b5998]">
                          Share this OTP with them only when you physically receive the package:
                        </p>
                      </div>

                      {otps[request.id] && (
                        <div className="flex items-center gap-2 self-start sm:self-center">
                          <span className="rounded-xl border-2 border-dashed border-info/40 bg-surface px-4 py-2 font-mono text-2xl font-black tracking-[0.25em] text-info shadow-xs">
                            {otps[request.id]}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyOtp(request.id, otps[request.id])}
                            className="rounded-xl btn-secondary px-3 py-2.5 text-xs"
                          >
                            {copiedOtpId === request.id ? "✓ Copied" : "Copy"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {isDelivered && (
                  <div className="mt-6 flex items-center justify-between rounded-2xl border border-accent/30 bg-accent-tint p-4 text-xs font-semibold text-success">
                    <div>
                      <span>✓ Package handoff completed successfully</span>
                      {request.delivered_at && (
                        <span className="block mt-0.5 text-[11px] text-muted">
                          Delivered on {new Date(request.delivered_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <span className="rounded-full bg-surface border border-accent/30 px-3 py-1 text-[10px] font-bold">
                      OTP VERIFIED 🛡️
                    </span>
                  </div>
                )}

                {isPending && (
                  <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-amber/30 bg-amber-tint p-4 text-xs text-amber">
                    <div>
                      <span className="font-bold">⏳ Waiting for a peer near the gate</span>
                      {otps[request.id] && (
                        <span className="block mt-1 text-[11px] text-amber">
                          Your confidential OTP: <strong className="font-mono tracking-widest">{otps[request.id]}</strong>
                        </span>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleCancelRequest(request.id)}
                      disabled={cancelingId === request.id}
                    >
                      {cancelingId === request.id ? "Canceling..." : "Cancel Request"}
                    </Button>
                  </div>
                )}

                {/* Footer Time */}
                <div className="mt-4 flex justify-between text-[11px] text-muted">
                  <span>Needed by: {new Date(request.pickup_time).toLocaleString()}</span>
                  <span>Requested: {new Date(request.created_at).toLocaleDateString()}</span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </main>
  );
}