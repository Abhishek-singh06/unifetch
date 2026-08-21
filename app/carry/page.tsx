"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

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

    if (deliveriesError) {
      console.error("Error loading my deliveries:", deliveriesError);
    } else {
      setMyDeliveries(deliveries || []);
    }

    setLoading(false);
  }

  useEffect(() => {
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
      supabase.removeChannel(channel);
    };
  }, []);

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

    const { error } = await supabase
      .from("package_requests")
      .update({
        carrier_id: user.id,
        status: "matched",
      })
      .eq("id", requestId)
      .eq("status", "pending");

    if (error) {
      setErrorMessage("Could not claim package: " + error.message);
      setClaimingId("");
    } else {
      setSuccessMessage("🎉 Package claimed! Head over to complete the OTP delivery.");
      setTimeout(() => {
        router.push(`/deliver/${requestId}`);
      }, 1000);
    }
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
      <main className="min-h-screen bg-[#f8f7f2] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-3 border-[#d8e8de] border-t-[#0f4c3a]" />
          <p className="mt-3 text-xs font-semibold text-[#577568]">Loading gate pickups...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f7f2] px-5 py-8 text-[#0c1c15] sm:px-8 sm:py-12 selection:bg-[#10b981]/20">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold text-[#0f4c3a] hover:text-[#093326]"
          >
            <span>← Back to UniFetch</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/requests"
              className="rounded-full border border-[#d6e3db] bg-white px-4 py-2 text-xs font-bold text-[#0f4c3a] shadow-xs hover:bg-[#edeae0] transition"
            >
              My Requests
            </Link>

            <Link
              href="/request"
              className="rounded-full bg-[#0f4c3a] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#0f4c3a]/20 hover:bg-[#0a382a] transition"
            >
              + Request Package
            </Link>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#0f4c3a]">
              Carrier Command Center
            </span>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-[#081e15] sm:text-4xl">
              Carry on Your Way & Earn 🪙
            </h1>
            <p className="mt-1 text-sm text-[#5c7a6e]">
              Grab packages waiting at the gate and drop them at dorms with zero detour.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="rounded-2xl border border-[#e2dcd0] bg-white px-4 py-2.5 shadow-xs">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#6b857a]">
                Active Tasks
              </span>
              <span className="font-display text-xl font-bold text-[#0f4c3a]">
                {activeDeliveriesCount}
              </span>
            </div>

            <div className="rounded-2xl border border-[#e2dcd0] bg-white px-4 py-2.5 shadow-xs">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#6b857a]">
                Completed
              </span>
              <span className="font-display text-xl font-bold text-[#0c241b]">
                {completedDeliveriesCount}
              </span>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-[#fecaca] bg-[#fff5f5] p-4 text-xs font-semibold text-[#991b1b]">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mt-6 rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] p-4 text-xs font-semibold text-[#065f46]">
            {successMessage}
          </div>
        )}

        <div className="mt-8 flex rounded-2xl border border-[#e2dcd0] bg-[#f0ebd9]/60 p-1.5 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab("available")}
            className={`flex-1 rounded-xl py-3 text-xs font-bold transition ${
              activeTab === "available"
                ? "bg-white text-[#0f4c3a] shadow-sm"
                : "text-[#5e776a] hover:text-[#0c241b]"
            }`}
          >
            Available at Gates ({availableRequests.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("my_deliveries")}
            className={`flex-1 rounded-xl py-3 text-xs font-bold transition ${
              activeTab === "my_deliveries"
                ? "bg-white text-[#0f4c3a] shadow-sm"
                : "text-[#5e776a] hover:text-[#0c241b]"
            }`}
          >
            My Deliveries ({myDeliveries.length})
          </button>
        </div>

        {activeTab === "available" && (
          <div className="mt-6 space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                placeholder="Search by hostel, item, or gate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 rounded-2xl border border-[#d8d2c4] bg-white px-4 py-3 text-xs font-medium outline-none transition placeholder:text-[#9bb2a5] focus:border-[#0f4c3a] focus:ring-3 focus:ring-[#10b981]/15"
              />

              <select
                value={filterGate}
                onChange={(e) => setFilterGate(e.target.value)}
                className="rounded-2xl border border-[#d8d2c4] bg-white px-4 py-3 text-xs font-bold text-[#446255] outline-none transition focus:border-[#0f4c3a]"
              >
                <option value="all">All Gates</option>
                <option value="main">Main Gate</option>
                <option value="north">North Turnstile</option>
                <option value="post">Post Office Gate</option>
              </select>
            </div>

            {filteredRequests.length === 0 && (
              <div className="mt-8 rounded-3xl border border-[#e2dcd0] bg-white p-12 text-center shadow-lg shadow-[#0c241b]/5">
                <div className="text-5xl">✨</div>
                <h3 className="mt-4 font-display text-xl font-bold text-[#0c241b]">
                  No pending pickups right now
                </h3>
                <p className="mt-2 text-xs text-[#5c7a6e]">
                  All packages at the gates have been claimed. Check back in a few minutes or subscribe to updates.
                </p>
              </div>
            )}

            <div className="grid gap-5 md:grid-cols-2">
              {filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-3xl border border-[#e2dcd0] bg-white p-6 shadow-md shadow-[#0c241b]/5 transition hover:shadow-xl hover:border-[#cbd7cf] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="rounded-full bg-[#ecfdf5] border border-[#a7f3d0] px-3 py-1 text-[11px] font-bold text-[#065f46]">
                        📦 AVAILABLE NOW
                      </span>
                      <span className="rounded-full bg-[#fffbeb] border border-[#fde68a] px-3 py-1 text-xs font-bold text-[#b45309]">
                        🪙 +35 Credits
                      </span>
                    </div>

                    <h3 className="mt-4 font-display text-lg font-bold text-[#0c241b]">
                      {request.package_description}
                    </h3>

                    <div className="mt-4 rounded-2xl bg-[#fbfaf6] border border-[#ebe5d8] p-4 text-xs space-y-2 text-[#466355]">
                      <div className="flex items-center gap-2">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#0f4c3a] text-[9px] font-bold text-white">
                          A
                        </span>
                        <span className="truncate">
                          <strong>From:</strong> {request.pickup_location}
                        </span>
                      </div>
                      <div className="ml-2 h-2.5 w-0.5 bg-[#cbdad2]" />
                      <div className="flex items-center gap-2">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#10b981] text-[9px] font-bold text-white">
                          B
                        </span>
                        <span className="truncate">
                          <strong>To:</strong> {request.delivery_location}
                        </span>
                      </div>
                    </div>

                    <p className="mt-3 text-[11px] text-[#789688]">
                      Needed by: <strong>{new Date(request.pickup_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong> ({new Date(request.pickup_time).toLocaleDateString()})
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#f0ebe0]">
                    <button
                      type="button"
                      onClick={() => handleClaim(request.id)}
                      disabled={claimingId === request.id}
                      className="w-full rounded-2xl bg-[#0f4c3a] py-3.5 text-xs font-bold text-white shadow-md shadow-[#0f4c3a]/20 transition hover:bg-[#093326] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                    >
                      {claimingId === request.id
                        ? "Claiming Delivery..."
                        : "Claim & Deliver Package →"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "my_deliveries" && (
          <div className="mt-6 space-y-5">
            {myDeliveries.length === 0 && (
              <div className="mt-8 rounded-3xl border border-[#e2dcd0] bg-white p-12 text-center shadow-lg shadow-[#0c241b]/5">
                <div className="text-5xl">🚴</div>
                <h3 className="mt-4 font-display text-xl font-bold text-[#0c241b]">
                  You have no claimed deliveries yet
                </h3>
                <p className="mt-2 text-xs text-[#5c7a6e]">
                  Switch to the &quot;Available at Gates&quot; tab to claim your first delivery run!
                </p>
              </div>
            )}

            {myDeliveries.map((delivery) => {
              const isMatched = delivery.status === "matched";
              const isDelivered = delivery.status === "delivered";

              return (
                <article
                  key={delivery.id}
                  className="rounded-3xl border border-[#e2dcd0] bg-white p-6 shadow-md shadow-[#0c241b]/5 transition sm:p-7"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                            isDelivered
                              ? "bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]"
                              : "bg-[#eff6ff] text-[#1e40af] border border-[#bfdbfe] animate-pulse"
                          }`}
                        >
                          {isDelivered ? "✓ DELIVERED" : "🚴 IN PROGRESS"}
                        </span>
                        <span className="text-xs text-[#7e998c]">
                          Claimed {new Date(delivery.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <h3 className="mt-2 font-display text-xl font-bold text-[#0c241b]">
                        {delivery.package_description}
                      </h3>

                      <p className="mt-1 text-xs text-[#527163]">
                        <strong>Dropoff:</strong> {delivery.delivery_location} (from {delivery.pickup_location})
                      </p>
                    </div>

                    <div>
                      {isMatched && (
                        <Link
                          href={`/deliver/${delivery.id}`}
                          className="inline-flex items-center rounded-2xl bg-[#0f4c3a] px-6 py-3 text-xs font-bold text-white shadow-md shadow-[#0f4c3a]/20 hover:bg-[#093326] transition"
                        >
                          Enter Requester OTP 🔑 →
                        </Link>
                      )}

                      {isDelivered && (
                        <span className="rounded-2xl bg-[#f0fdf4] border border-[#bbf7d0] px-4 py-2 text-xs font-bold text-[#065f46]">
                          Completed +35 🪙
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}