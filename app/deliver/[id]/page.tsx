"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { Alert } from "../../components/ui/Alert";
import { PageHeader } from "../../components/ui/PageHeader";
import { Spinner, PageLoader } from "../../components/ui/Spinner";

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
      <PageLoader label="Loading delivery mission..." />
    );
  }

  if (!request) {
    return (
      <main className="min-h-screen bg-background px-5 py-12 text-foreground">
        <div className="mx-auto max-w-2xl">
          <PageHeader backHref="/carry" backLabel="Back to Carrier Hub" />
          <Alert tone="error">{errorMessage || "Package request not found."}</Alert>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-8 sm:py-12 selection:bg-accent/20">
      <div className="mx-auto max-w-2xl">
        <PageHeader
          backHref="/carry"
          backLabel="Back to Carrier Hub"
          actions={
            <span className="rounded-full bg-amber-tint border border-amber/30 px-3 py-1 text-xs font-bold text-amber">
              Reward: 🪙 +35 Credits
            </span>
          }
        />

        <Card className="mt-8 p-6 sm:p-9">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚴</span>
            <div>
              <span className="eyebrow">Active Carrier Mission</span>
              <h1 className="font-display text-2xl font-extrabold text-primary-hover">
                Complete Package Handshake
              </h1>
            </div>
          </div>

          {/* Package Info Card */}
          <div className="mt-6 rounded-2xl border border-border bg-surface-soft p-5 space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                Item Description
              </p>
              <h2 className="mt-1 font-display text-lg font-bold text-primary-hover">
                {request.package_description}
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-xs border-t border-border pt-4">
              <div>
                <span className="block text-muted font-bold">1. Pickup Gate</span>
                <span className="text-primary-hover font-medium">{request.pickup_location}</span>
              </div>
              <div>
                <span className="block text-muted font-bold">2. Dropoff Hostel</span>
                <span className="text-primary-hover font-medium">{request.delivery_location}</span>
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="mt-6 rounded-2xl panel-mint p-4 text-xs text-primary">
            <p className="font-bold">Carrier Checklist:</p>
            <ul className="mt-2 space-y-1 text-muted">
              <li>✓ Picked up item from security desk</li>
              <li>✓ Arrived at destination hostel lobby</li>
              <li>✓ Requester inspects parcel and gives 6-digit OTP</li>
            </ul>
          </div>

          {/* Delivered State vs OTP Input */}
          {request.status === "delivered" ? (
            <div className="mt-8 rounded-2xl border border-accent/30 bg-accent-tint p-6 text-center">
              <span className="text-4xl">🎉</span>
              <h3 className="mt-2 font-display text-xl font-bold text-success">
                Delivery Complete!
              </h3>
              <p className="mt-1 text-xs text-muted">
                The handoff has been verified with the OTP. +35 credits added to your balance.
              </p>
              <Link
                href="/carry"
                className="mt-5 inline-block btn-primary px-6 py-2.5 text-xs"
              >
                Return to Deliveries
              </Link>
            </div>
          ) : (
            <div className="mt-8">
              <Field
                id="otpInput"
                type="text"
                label="Enter Requester&apos;s 6-Digit OTP"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="• • • • • •"
                className="text-center font-mono text-3xl font-extrabold tracking-[0.4em] text-primary-hover"
              />

              <Alert tone="error" className="mt-4">{errorMessage}</Alert>
              <Alert tone="success" className="mt-4">{message}</Alert>

              <Button
                type="button"
                onClick={handleDelivery}
                disabled={isDelivering || otp.length !== 6}
                size="lg"
                className="mt-6 w-full"
              >
                {isDelivering ? "Verifying OTP with Supabase..." : "Verify & Complete Delivery 🛡️"}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}