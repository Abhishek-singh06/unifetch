"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  created_at: string;
};

export default function DeliverPackagePage() {
  const params = useParams();
  const router = useRouter();

  const id = params.id as string;

  const [request, setRequest] = useState<PackageRequest | null>(null);
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDelivering, setIsDelivering] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadRequest() {
      setErrorMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("package_requests")
        .select(
          "id, package_description, pickup_location, delivery_location, pickup_time, status, carrier_id, otp_verified, created_at"
        )
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error loading request:", error);
        setErrorMessage("Could not load this package request.");
        setIsLoading(false);
        return;
      }

      if (data.carrier_id !== user.id) {
        setErrorMessage("You are not assigned to carry this package.");
        setIsLoading(false);
        return;
      }

      setRequest(data);
      setIsLoading(false);
    }

    loadRequest();
  }, [id, router]);

  async function handleDelivery() {
    setErrorMessage("");
    setMessage("");

    if (!request) return;

    if (otp.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit confirmation OTP.");
      return;
    }

    setIsDelivering(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrorMessage("Please sign in again.");
      setIsDelivering(false);
      return;
    }

    let isOtpValid = false;

    // Single source of truth: the security-definer RPC validates the OTP
    // against the private request_otps table AND marks the delivery + pays
    // credits atomically. No client-side fallback — that would let carriers
    // brute-force codes with direct queries.
    const { data: otpResult, error: otpError } = await supabase.rpc(
      "verify_package_otp",
      {
        p_request_id: request.id,
        p_otp: otp,
      }
    );

    if (!otpError && typeof otpResult === "boolean") {
      isOtpValid = otpResult;
    }

    if (!isOtpValid) {
      setErrorMessage("❌ Incorrect OTP. Please ask the requester for the 6-digit code on their screen.");
      setIsDelivering(false);
      return;
    }

    // (status/credits were updated atomically inside verify_package_otp)

    setMessage("🎉 Delivery successfully confirmed! Credits have been credited to your account.");

    setRequest({
      ...request,
      status: "delivered",
      otp_verified: true,
    });

    setIsDelivering(false);

    setTimeout(() => {
      router.push("/carry");
      router.refresh();
    }, 2000);
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f8f7f2] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-3 border-[#d8e8de] border-t-[#0f4c3a]" />
          <p className="mt-3 text-xs font-semibold text-[#577568]">Loading delivery mission...</p>
        </div>
      </main>
    );
  }

  if (!request) {
    return (
      <main className="min-h-screen bg-[#f8f7f2] px-5 py-12 text-[#0c1c15]">
        <div className="mx-auto max-w-2xl">
          <Link href="/carry" className="text-xs font-bold text-[#0f4c3a]">
            ← Back to Carrier Hub
          </Link>
          <div className="mt-6 rounded-2xl border border-[#fecaca] bg-[#fff5f5] p-5 text-xs text-[#991b1b]">
            {errorMessage || "Package request not found."}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f7f2] px-5 py-8 text-[#0c1c15] sm:px-8 sm:py-12 selection:bg-[#10b981]/20">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <Link
            href="/carry"
            className="flex items-center gap-1.5 text-xs font-bold text-[#0f4c3a] hover:text-[#093326]"
          >
            <span>← Back to Carrier Hub</span>
          </Link>

          <span className="rounded-full bg-[#fffbeb] border border-[#fde68a] px-3 py-1 text-xs font-bold text-[#b45309]">
            Reward: 🪙 +35 Credits
          </span>
        </div>

        <div className="mt-8 rounded-3xl border border-[#e2dcd0] bg-white p-6 shadow-xl shadow-[#0c241b]/5 sm:p-9">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚴</span>
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#0f4c3a]">
                Active Carrier Mission
              </span>
              <h1 className="text-2xl font-display font-extrabold text-[#081e15]">
                Complete Package Handshake
              </h1>
            </div>
          </div>

          {/* Package Info Card */}
          <div className="mt-6 rounded-2xl border border-[#ebe4d6] bg-[#fbfaf6] p-5 space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#69887b]">
                Item Description
              </p>
              <h2 className="mt-1 font-display text-lg font-bold text-[#0c241b]">
                {request.package_description}
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-xs border-t border-[#ede7da] pt-4">
              <div>
                <span className="block text-[#69887b] font-bold">1. Pickup Gate</span>
                <span className="text-[#0c241b] font-medium">{request.pickup_location}</span>
              </div>
              <div>
                <span className="block text-[#69887b] font-bold">2. Dropoff Hostel</span>
                <span className="text-[#0c241b] font-medium">{request.delivery_location}</span>
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="mt-6 rounded-2xl bg-[#f4fbf7] border border-[#d6ecdf] p-4 text-xs text-[#0f4c3a]">
            <p className="font-bold">Carrier Checklist:</p>
            <ul className="mt-2 space-y-1 text-[#3b6755]">
              <li>✓ Picked up item from security desk</li>
              <li>✓ Arrived at destination hostel lobby</li>
              <li>✓ Requester inspects parcel and gives 6-digit OTP</li>
            </ul>
          </div>

          {/* Delivered State vs OTP Input */}
          {request.status === "delivered" ? (
            <div className="mt-8 rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] p-6 text-center">
              <span className="text-4xl">🎉</span>
              <h3 className="mt-2 font-display text-xl font-bold text-[#065f46]">
                Delivery Complete!
              </h3>
              <p className="mt-1 text-xs text-[#2c7a5c]">
                The handoff has been verified with the OTP. +35 credits added to your balance.
              </p>
              <Link
                href="/carry"
                className="mt-5 inline-block rounded-xl bg-[#0f4c3a] px-6 py-2.5 text-xs font-bold text-white shadow-md"
              >
                Return to Deliveries
              </Link>
            </div>
          ) : (
            <div className="mt-8">
              <label
                htmlFor="otpInput"
                className="block text-xs font-bold uppercase tracking-wider text-[#47685a] mb-2"
              >
                Enter Requester&apos;s 6-Digit OTP
              </label>

              <p className="text-xs text-[#628073] mb-4">
                Ask the student for their verification code to finalize the delivery.
              </p>

              <input
                id="otpInput"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="• • • • • •"
                className="w-full rounded-2xl border-2 border-[#d8d2c4] bg-[#fbfaf6] px-4 py-4 text-center font-mono text-3xl font-extrabold tracking-[0.4em] text-[#0f4c3a] outline-none transition placeholder:text-[#cbdad1] focus:border-[#0f4c3a] focus:bg-white focus:ring-4 focus:ring-[#10b981]/15"
              />

              {errorMessage && (
                <div className="mt-4 rounded-2xl border border-[#fecaca] bg-[#fff5f5] p-4 text-xs font-semibold text-[#991b1b]">
                  {errorMessage}
                </div>
              )}

              {message && (
                <div className="mt-4 rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] p-4 text-xs font-semibold text-[#065f46]">
                  {message}
                </div>
              )}

              <button
                type="button"
                onClick={handleDelivery}
                disabled={isDelivering || otp.length !== 6}
                className="mt-6 w-full rounded-2xl bg-[#0f4c3a] py-4 text-sm font-bold text-white shadow-xl shadow-[#0f4c3a]/20 transition hover:bg-[#093326] hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDelivering ? "Verifying OTP with Supabase..." : "Verify & Complete Delivery 🛡️"}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}