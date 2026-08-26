"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Logo } from "../components/ui/Logo";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Alert } from "../components/ui/Alert";
import { EmptyState } from "../components/ui/EmptyState";
import { StatPill } from "../components/ui/StatPill";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Field } from "../components/ui/Field";

type PackageRequest = {
  id: string;
  package_description: string;
  pickup_location: string;
  delivery_location: string;
  pickup_time: string;
  status: string;
  carrier_id: string | null;
  delivered_at: string | null;
  created_at: string;
};

export default function CarryPackagePage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"available" | "my_deliveries">("available");
  const [availableRequests, setAvailableRequests] = useState<PackageRequest[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<PackageRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGate, setFilterGate] = useState("all");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setErrorMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // NOTE: pickup_otp is intentionally not selectable — it lives in a
      // private table and is never exposed to carriers.
      const { data: available, error: availableError } = await supabase
        .from("package_requests")
        .select(
          "id, package_description, pickup_location, delivery_location, pickup_time, status, carrier_id, delivered_at, created_at"
        )
        .eq("status", "pending")
        .neq("requester_id", user.id)
        .order("pickup_time", { ascending: true });

      if (cancelled) return;

      if (availableError) {
        console.error("Error loading available requests:", availableError);
        setErrorMessage(availableError.message);
      } else {
        setAvailableRequests(available || []);
      }

      const { data: deliveries, error: deliveriesError } = await supabase
        .from("package_requests")
        .select(
          "id, package_description, pickup_location, delivery_location, pickup_time, status, carrier_id, delivered_at, created_at"
        )
        .eq("carrier_id", user.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (deliveriesError) {
        console.error("Error loading my deliveries:", deliveriesError);
      } else {
        setMyDeliveries(deliveries || []);
      }

      setLoading(false);
    }

    loadData();

    const channel = supabase
      .channel("carry-packages-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "package_requests",
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [router]);

  async function handleClaim(requestId: string) {
    setErrorMessage("");
    setSuccessMessage("");
    setClaimingId(requestId);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    // Atomic RPC: if another carrier claimed first, this reports FALSE instead
    // of silently succeeding with zero rows updated.
    const { data: claimed, error } = await supabase.rpc("claim_package_request", {
      p_request_id: requestId,
    });

    if (error) {
      setErrorMessage("Could not claim package: " + error.message);
      setClaimingId("");
      return;
    }

    if (!claimed) {
      setErrorMessage("Someone else just claimed this package. Pick another one!");
      setClaimingId("");
      return;
    }

    setSuccessMessage("🎉 Package claimed! Head over to complete the OTP delivery.");
    setTimeout(() => {
      router.push(`/deliver/${requestId}`);
    }, 1000);
  }

  const filteredRequests = availableRequests.filter((req) => {
    const matchesSearch =
      req.package_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.delivery_location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.pickup_location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesGate =
      filterGate === "all" ||
      req.pickup_location.toLowerCase().includes(filterGate.toLowerCase());

    return matchesSearch && matchesGate;
  });

  const activeDeliveriesCount = myDeliveries.filter((d) => d.status === "matched").length;
  const completedDeliveriesCount = myDeliveries.filter((d) => d.status === "delivered").length;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-[var(--shadow-primary)]">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
          </span>
          <p className="mt-4 text-xs font-semibold tracking-wide text-muted">Loading gate pickups...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-8 sm:py-12 selection:bg-accent/20">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          backHref="/"
          backLabel="Back to UniFetch"
          actions={
            <>
              <Link href="/requests" className="btn-ghost px-3 py-1.5 text-xs">
                My Requests
              </Link>
              <Link href="/request" className="btn-primary px-4 py-1.5 text-xs">
                + Request Package
              </Link>
            </>
          }
        />

        <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="eyebrow">Carrier Command Center</span>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-primary-hover sm:text-4xl">
              Carry on Your Way & Earn 🪙
            </h1>
            <p className="mt-1 text-sm text-muted">
              Grab packages waiting at the gate and drop them at dorms with zero detour.
            </p>
          </div>

          <div className="flex gap-3">
            <StatPill label="Active Tasks" value={activeDeliveriesCount} />
            <StatPill label="Completed" value={completedDeliveriesCount} />
          </div>
        </div>

        <Alert tone="error" className="mt-6">{errorMessage}</Alert>
        <Alert tone="success" className="mt-6">{successMessage}</Alert>

        <div className="mt-8 flex rounded-2xl border border-border bg-surface-soft/60 p-1.5 shadow-[var(--shadow-sm)]">
          <button
            type="button"
            onClick={() => setActiveTab("available")}
            className={`flex-1 rounded-xl py-3 text-xs font-bold transition ${
              activeTab === "available"
                ? "bg-surface text-primary shadow-sm"
                : "text-muted hover:text-primary-hover"
            }`}
          >
            Available at Gates ({availableRequests.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("my_deliveries")}
            className={`flex-1 rounded-xl py-3 text-xs font-bold transition ${
              activeTab === "my_deliveries"
                ? "bg-surface text-primary shadow-sm"
                : "text-muted hover:text-primary-hover"
            }`}
          >
            My Deliveries ({myDeliveries.length})
          </button>
        </div>

        {activeTab === "available" && (
          <div className="mt-6 space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Field
                type="text"
                placeholder="Search by hostel, item, or gate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />

              <select
                value={filterGate}
                onChange={(e) => setFilterGate(e.target.value)}
                className="field w-full sm:w-auto"
              >
                <option value="all">All Gates</option>
                <option value="main">Main Gate</option>
                <option value="north">North Turnstile</option>
                <option value="post">Post Office Gate</option>
              </select>
            </div>

            {filteredRequests.length === 0 && (
              <EmptyState
                icon={<span className="text-4xl">✨</span>}
                title="No pending pickups right now"
                description="All packages at the gates have been claimed. Check back in a few minutes or subscribe to updates."
              />
            )}

            <div className="grid gap-5 md:grid-cols-2">
              {filteredRequests.map((request) => (
                <Card key={request.id} className="p-6 hover:shadow-[var(--shadow-lift)] hover:border-border-strong flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <Badge tone="success" className="bg-accent-tint border-accent/30 text-accent-strong">
                        📦 AVAILABLE NOW
                      </Badge>
                      <Badge tone="warning" className="bg-amber-tint border-amber/30 text-amber">
                        🪙 +35 Credits
                      </Badge>
                    </div>

                    <h3 className="mt-4 font-display text-lg font-bold text-primary-hover">
                      {request.package_description}
                    </h3>

                    <div className="mt-4 rounded-2xl border border-border bg-surface-soft p-4 text-xs space-y-2 text-muted">
                      <div className="flex items-center gap-2">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">A</span>
                        <span className="truncate"><strong>From:</strong> {request.pickup_location}</span>
                      </div>
                      <div className="ml-2 h-2.5 w-0.5 bg-border" />
                      <div className="flex items-center gap-2">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">B</span>
                        <span className="truncate"><strong>To:</strong> {request.delivery_location}</span>
                      </div>
                    </div>

                    <p className="mt-3 text-[11px] text-muted">
                      Needed by:{' '}
                      <strong>{new Date(request.pickup_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong>{' '}
                      ({new Date(request.pickup_time).toLocaleDateString()})
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border">
                    <Button
                      type="button"
                      onClick={() => handleClaim(request.id)}
                      disabled={claimingId === request.id}
                      size="lg"
                      className="w-full"
                    >
                      {claimingId === request.id ? "Claiming Delivery..." : "Claim & Deliver Package →"}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === "my_deliveries" && (
          <div className="mt-6 space-y-5">
            {myDeliveries.length === 0 && (
              <EmptyState
                icon={<span className="text-4xl">🚴</span>}
                title="You have no claimed deliveries yet"
                description={'Switch to the "Available at Gates" tab to claim your first delivery run!'}
              />
            )}

            {myDeliveries.map((delivery) => {
              const isMatched = delivery.status === "matched";
              const isDelivered = delivery.status === "delivered";

              return (
                <Card key={delivery.id} className="p-6 transition sm:p-7">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={isDelivered ? "delivered" : "matched"} />
                        <span className="text-xs text-muted">
                          Claimed {new Date(delivery.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <h3 className="mt-2 font-display text-xl font-bold text-primary-hover">
                        {delivery.package_description}
                      </h3>

                      <p className="mt-1 text-xs text-muted">
                        <strong>Dropoff:</strong> {delivery.delivery_location} (from {delivery.pickup_location})
                      </p>
                    </div>

                    <div>
                      {isMatched && (
                        <Link
                          href={`/deliver/${delivery.id}`}
                          className="btn-primary px-6 py-3 text-xs"
                        >
                          Enter Requester OTP 🔑 →
                        </Link>
                      )}

                      {isDelivered && (
                        <Badge tone="success" className="bg-success-tint border-success/30 text-success px-4 py-2 text-xs">
                          Completed +35 🪙
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}