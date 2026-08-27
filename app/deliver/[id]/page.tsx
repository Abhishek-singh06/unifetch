"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, MapPin, Package, Shield, CheckCircle } from "lucide-react";
import { useSpring, animated } from "@react-spring/web";
import { supabase } from "@/lib/supabase/client";
import { SidebarShell } from "../../components/SidebarShell";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { PageLoader } from "../../components/ui/Spinner";

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
  const [shakeTrigger, setShakeTrigger] = useState(0);

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
      setShakeTrigger((prev) => prev + 1);
      setIsDelivering(false);
      return;
    }

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

  // React Spring incorrect OTP shake animation
  const shakeSpring = useSpring({
    reset: true,
    from: { x: 0 },
    to: async (next) => {
      if (shakeTrigger > 0) {
        await next({ x: -10 });
        await next({ x: 10 });
        await next({ x: -8 });
        await next({ x: 8 });
        await next({ x: -4 });
        await next({ x: 4 });
        await next({ x: 0 });
      }
    },
    config: { duration: 60 }
  });

  // Success Card zoom spring
  const successSpring = useSpring({
    from: { transform: "scale(0.9)", opacity: 0 },
    to: { transform: "scale(1)", opacity: 1 },
    config: { tension: 350, friction: 22 },
  });

  if (isLoading) {
    return (
      <PageLoader label="Loading delivery mission..." />
    );
  }

  if (!request) {
    return (
      <main className="min-h-screen bg-[#05070b] px-6 py-16 text-white grid-bg">
        <div className="mx-auto max-w-2xl text-center space-y-6">
          <Alert tone="error" className="mt-6">{errorMessage || "Package request not found."}</Alert>
          <Link href="/carry" className="neo-btn-secondary px-6 py-3 border-[rgba(255,255,255,0.08)] bg-transparent hover:bg-white/5 uppercase tracking-wider text-xs font-bold">
            Back to Carrier Hub
          </Link>
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
            <span className="text-xs font-bold uppercase tracking-widest text-[#2563eb]">Active Errand</span>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-white leading-none">
              Verify Delivery Run
            </h1>
            <p className="mt-2 text-xs text-[#cbd5e1] font-semibold">
              Enter the OTP provided by the package requester to confirm handoff.
            </p>
          </div>

          <span className="rounded-xl bg-[#2563eb]/10 border border-[#2563eb]/20 px-4.5 py-2.5 text-xs font-bold text-primary flex items-center gap-1.5 shadow-glow shrink-0">
            Reward: 🪙 +35 Credits
          </span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] items-start">
          {/* Left panel: Info receipt and checklist */}
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-6 sm:p-8 bg-[#080d16]/30">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2563eb]/10 border border-[#2563eb]/20 text-[#2563eb]">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#2563eb] block leading-none">Package Receipt</span>
                  <h3 className="font-display text-lg font-bold text-white mt-1.5 leading-tight">
                    {request.package_description}
                  </h3>
                </div>
              </div>

              {/* Package Route Specifications */}
              <div className="mt-6 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#05070b]/60 p-5 space-y-4 text-xs font-semibold text-[#cbd5e1]">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="h-4.5 w-4.5 text-[#2563eb] shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-muted text-[10px] uppercase font-bold">From (Gate Pickup)</span>
                      <span className="text-white font-extrabold block mt-1">{request.pickup_location}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <MapPin className="h-4.5 w-4.5 text-[#2563eb] shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-muted text-[10px] uppercase font-bold">To (Hostel Destination)</span>
                      <span className="text-white font-extrabold block mt-1">{request.delivery_location}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress checklist */}
              <div className="mt-6 border-t border-[rgba(255,255,255,0.06)] pt-6">
                <p className="text-xs font-bold uppercase tracking-wider text-[#2563eb] mb-4.5">Fulfillment Steps</p>
                <div className="space-y-4 text-xs text-[#cbd5e1] font-semibold">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 shrink-0 flex items-center justify-center rounded-full bg-[#22c55e]/15 border border-[#22c55e]/25 text-[#22c55e]">
                      <CheckCircle className="h-3 w-3" />
                    </div>
                    <span>Go to the security parcel counter / gate pickup point.</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 shrink-0 flex items-center justify-center rounded-full bg-[#22c55e]/15 border border-[#22c55e]/25 text-[#22c55e]">
                      <CheckCircle className="h-3 w-3" />
                    </div>
                    <span>Collect the package matching description.</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 shrink-0 flex items-center justify-center rounded-full bg-[#22c55e]/15 border border-[#22c55e]/25 text-[#22c55e]">
                      <CheckCircle className="h-3 w-3" />
                    </div>
                    <span>Walk to the hostel lobby and hand it over to requester.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right panel: Secure OTP Entry vault card */}
          <div>
            {request.status === "delivered" ? (
              <animated.div style={successSpring}>
                <div className="rounded-[2.5rem] border border-[#22c55e]/25 p-8 text-center bg-[#080d16]/30 shadow-glow">
                  <CheckCircle2 className="h-16 w-16 text-[#22c55e] mx-auto mb-4 animate-bounce" />
                  <h3 className="font-display text-2xl font-bold text-[#22c55e]">
                    Handoff Verified!
                  </h3>
                  <p className="mt-2.5 text-xs text-[#cbd5e1] font-semibold leading-relaxed">
                    The delivery has been validated via OTP. Credits have been credited to your campus wallet.
                  </p>
                  <Link
                    href="/carry"
                    className="mt-6 inline-flex neo-btn-primary px-7 py-3.5 text-xs uppercase tracking-widest font-extrabold shadow-glow"
                  >
                    Return to Carry Board
                  </Link>
                </div>
              </animated.div>
            ) : (
              <animated.div style={shakeSpring}>
                <div className="rounded-[2.5rem] border border-[#2563eb]/25 p-6 sm:p-8 bg-gradient-to-b from-[#080d16] to-[#05070b]/60 shadow-glow relative overflow-hidden">
                  <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-[#2563eb]/8 blur-2xl pointer-events-none" />
                  <h3 className="font-display text-lg font-bold text-white flex items-center gap-2.5 border-b border-[rgba(255,255,255,0.08)] pb-4">
                    <Shield className="h-5 w-5 text-[#2563eb]" />
                    <span>Handoff Verification</span>
                  </h3>
                  <p className="mt-3.5 text-xs text-[#cbd5e1] font-semibold leading-relaxed">
                    Ask the requester for the 6-digit confirmation key displayed on their active orders page.
                  </p>

                  <div className="mt-6">
                    <label htmlFor="otpInput" className="field-label text-center mb-4 text-[10px] font-bold tracking-wider">
                      Enter Verification Key
                    </label>

                    {/* Keypad digit boxes */}
                    <div className="relative flex justify-center gap-2.5 mt-2 h-14">
                      {Array.from({ length: 6 }).map((_, idx) => {
                        const char = otp[idx] || "";
                        const isFocused = otp.length === idx;
                        return (
                          <div
                            key={idx}
                            className={`w-10 h-14 rounded-xl border flex items-center justify-center font-display text-xl font-black transition-all duration-150 ${
                              char
                                ? "border-[#2563eb] bg-[#2563eb]/10 text-white shadow-glow"
                                : isFocused
                                ? "border-[#2563eb] bg-[#05070b] shadow-[0_0_12px_rgba(37,99,235,0.25)]"
                                : "border-[rgba(255,255,255,0.08)] bg-white/5 text-[#cbd5e1]"
                            }`}
                          >
                            {char || "•"}
                          </div>
                        );
                      })}
                      <input
                        id="otpInput"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-text"
                        placeholder="------"
                        autoComplete="off"
                      />
                    </div>

                    {errorMessage && <Alert tone="error" className="mt-6">{errorMessage}</Alert>}
                    {message && <Alert tone="success" className="mt-6">{message}</Alert>}

                    <Button
                      type="button"
                      onClick={handleDelivery}
                      disabled={isDelivering || otp.length !== 6}
                      className="mt-6 w-full flex items-center justify-center gap-1.5 uppercase tracking-wider text-xs font-bold py-3.5 shadow-glow"
                    >
                      <span>{isDelivering ? "Verifying OTP..." : "Verify & Complete Dropoff"}</span>
                    </Button>
                  </div>
                </div>
              </animated.div>
            )}
          </div>
        </div>

      </div>
    </SidebarShell>
  );
}