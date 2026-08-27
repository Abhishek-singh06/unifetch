"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Filter, Calendar, ArrowRight, ExternalLink, CheckCircle } from "lucide-react";
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
  delivered_at: string | null;
  created_at: string;
};

export default function CarryPackagePage() {
  const router = useRouter();

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

    setSuccessMessage("🎉 Package claimed! Redirecting to OTP verification page...");
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

  const availableTransitions = useTransition(filteredRequests, {
    keys: (item) => item.id,
    from: { opacity: 0, transform: "translate3d(0, 15px, 0)" },
    enter: { opacity: 1, transform: "translate3d(0, 0, 0)" },
    leave: { opacity: 0, transform: "translate3d(0, -10px, 0)", height: 0, margin: 0, padding: 0 },
    trail: 35,
    config: { tension: 300, friction: 22 },
  });

  if (loading) {
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
            Loading gate pickups...
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
            <span className="text-xs font-bold uppercase tracking-widest text-[#2563eb]">Carrier Marketplace</span>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-white leading-none">
              Carry & Earn Campus Credits
            </h1>
            <p className="mt-2 text-xs text-[#cbd5e1] font-semibold">
              Select student parcels waiting at campus gates and drop them at hostel lobbies.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <StatPill label="Active Runs" value={activeDeliveriesCount} />
            <StatPill label="Delivered" value={completedDeliveriesCount} />
          </div>
        </div>

        {errorMessage && <Alert tone="error">{errorMessage}</Alert>}
        {successMessage && <Alert tone="success">{successMessage}</Alert>}

        {/* Split desktop workspace */}
        <div className="grid gap-8 lg:grid-cols-[1.6fr_0.9fr] items-start">
          
          {/* Left Column: list of available packages */}
          <div className="space-y-6">
            <div className="border-b border-[rgba(255,255,255,0.08)] pb-3 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-white flex items-center gap-2.5">
                <span>Available Packages</span>
                <span className="rounded-full bg-white/5 text-[#cbd5e1] text-xs font-bold px-2.5 py-0.5 border border-[rgba(255,255,255,0.08)]">
                  {filteredRequests.length}
                </span>
              </h2>
            </div>

            {/* Filter controls */}
            <div className="flex flex-col gap-3 sm:flex-row items-stretch">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Search by hostel block, gate or item description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="field pl-10.5"
                />
              </div>

              <div className="relative shrink-0">
                <Filter className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted pointer-events-none" />
                <select
                  value={filterGate}
                  onChange={(e) => setFilterGate(e.target.value)}
                  className="field pl-10.5 pr-8 appearance-none bg-[#0a0f18]"
                >
                  <option value="all">All Gates</option>
                  <option value="main">Main Gate</option>
                  <option value="north">North Turnstile</option>
                  <option value="post">Post Office Gate</option>
                </select>
              </div>
            </div>

            {/* Request Card Feed */}
            {filteredRequests.length === 0 ? (
              <EmptyState
                icon={<Search className="h-10 w-10 text-primary" />}
                title="No pending pickups found"
                description="Try modifying your keywords or search filters."
              />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {availableTransitions((style, request) => (
                  <animated.div style={style}>
                    <div className="rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-5 bg-[#080d16]/30 hover:border-[#2563eb]/45 flex flex-col justify-between min-h-[290px] transition-all duration-200">
                      <div>
                        <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] pb-3">
                          <span className="flex items-center gap-1.5 text-[9px] font-extrabold text-[#22c55e] uppercase tracking-widest bg-[#22c55e]/10 border border-[#22c55e]/20 px-2.5 py-0.5 rounded-full">
                            <span className="live-dot h-1.5 w-1.5 bg-[#22c55e]" />
                            Open
                          </span>
                          <span className="text-[10px] font-bold text-[#2563eb] uppercase tracking-wider bg-[#2563eb]/10 border border-[#2563eb]/20 px-2.5 py-0.5 rounded-full drop-shadow-[0_0_10px_rgba(37,99,235,0.15)]">
                            🪙 +35 Credits
                          </span>
                        </div>

                        <h3 className="mt-3.5 font-display text-base font-bold text-white line-clamp-2 leading-tight">
                          {request.package_description}
                        </h3>

                        {/* Location Box */}
                        <div className="mt-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#05070b]/60 p-3.5 text-xs space-y-1.5 text-[#cbd5e1] font-semibold">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-[#2563eb]/15 text-[9px] font-bold text-[#2563eb] border border-[#2563eb]/25">A</span>
                            <span className="truncate text-white">Pickup: {request.pickup_location}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-[#2563eb]/15 text-[9px] font-bold text-[#2563eb] border border-[#2563eb]/25">B</span>
                            <span className="truncate text-white">Dorm: {request.delivery_location}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="text-[9px] text-[#cbd5e1] font-bold flex items-center gap-2 uppercase tracking-wider mb-3">
                          <Calendar className="h-3.5 w-3.5 text-[#2563eb]" />
                          Needed: {new Date(request.pickup_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>

                        <Button
                          type="button"
                          onClick={() => handleClaim(request.id)}
                          disabled={claimingId === request.id}
                          className="w-full flex items-center justify-center gap-1.5 uppercase tracking-wider text-xs font-bold py-3 shadow-glow"
                        >
                          <span>Claim & Fetch</span>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </animated.div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Claimed package runs */}
          <aside className="space-y-6 lg:sticky lg:top-[85px]">
            <div className="border-b border-[rgba(255,255,255,0.08)] pb-3">
              <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
                <span>My Claimed Runs</span>
              </h2>
            </div>

            {myDeliveries.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-[rgba(255,255,255,0.08)] p-8 text-center text-xs font-bold text-[#cbd5e1] uppercase tracking-widest bg-white/2 select-none">
                No active delivery runs claimed
              </div>
            ) : (
              <div className="space-y-4">
                {myDeliveries.map((delivery) => {
                  const isMatched = delivery.status === "matched";
                  const isDelivered = delivery.status === "delivered";

                  return (
                    <div
                      key={delivery.id}
                      className="rounded-3xl border border-[rgba(255,255,255,0.08)] p-5 bg-[#080d16]/30 hover:border-[#2563eb]/20 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] pb-3">
                        <StatusBadge status={isDelivered ? "delivered" : "matched"} />
                        <span className="text-[9px] text-[#cbd5e1] font-bold uppercase tracking-widest">
                          {new Date(delivery.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <h3 className="mt-3 font-display text-sm font-bold text-white truncate">
                        {delivery.package_description}
                      </h3>

                      <div className="mt-2.5 text-[11px] text-[#cbd5e1] font-semibold space-y-1">
                        <p>From: {delivery.pickup_location}</p>
                        <p>To: {delivery.delivery_location}</p>
                      </div>

                      {/* Claimed Action link */}
                      {isMatched && (
                        <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.06)]">
                          <Link
                            href={`/deliver/${delivery.id}`}
                            className="neo-btn-primary w-full py-2.5 text-xs uppercase tracking-widest font-extrabold gap-1.5 shadow-glow"
                          >
                            <span>Verify OTP</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      )}

                      {isDelivered && (
                        <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.06)] text-center">
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#22c55e] uppercase tracking-wider bg-[#22c55e]/6 border border-[#22c55e]/20 px-3 py-1 rounded-full">
                            <CheckCircle className="h-4 w-4" />
                            Completed (+35 Credits)
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </aside>

        </div>
      </div>
    </SidebarShell>
  );
}