"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Logo } from "../components/ui/Logo";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Field, Select } from "../components/ui/Field";
import { Alert } from "../components/ui/Alert";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { StatPill } from "../components/ui/StatPill";

const packageCategories = [
  { id: "amazon", label: "Amazon / Flipkart", icon: "📦", placeholder: "e.g. Noise Smartwatch box" },
  { id: "food", label: "Swiggy / Zomato", icon: "🍔", placeholder: "e.g. Burger King 2x Meals" },
  { id: "prints", label: "Printouts / Books", icon: "📄", placeholder: "e.g. 40-page Project Thesis" },
  { id: "grocery", label: "Blinkit / Instamart", icon: "🛍️", placeholder: "e.g. Snacks & Energy Drinks" },
  { id: "other", label: "Other Parcel", icon: "🎁", placeholder: "e.g. Fragile package from home" },
];

const gateLocations = [
  "Main Gate • Security Parcel Counter",
  "North Turnstile • Delivery Zone",
  "Campus Post Office Gate",
  "South Gate Entry Point",
];

const hostelLocations = [
  "Hostel 1 (Boys)",
  "Hostel 2 (Boys)",
  "Hostel 3 (Boys)",
  "Hostel 4 (Boys)",
  "Girls Hostel Block A",
  "Girls Hostel Block B",
  "PG / International Hostel",
  "Central Library Ground Floor",
];

export default function RequestPackagePage() {
  const router = useRouter();

  const [category, setCategory] = useState("amazon");
  const [packageDescription, setPackageDescription] = useState("");
  const [pickupLocation, setPickupLocation] = useState(gateLocations[0]);
  const [deliveryLocation, setDeliveryLocation] = useState(hostelLocations[0]);
  const [roomNumber, setRoomNumber] = useState("");
  const [pickupTime, setPickupTime] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const pickupTimeRef = useRef<HTMLInputElement>(null);

  // Default time helper (+1 hour). Only called from handlers/effects, never render.
  function getDefaultTime() {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }

  useEffect(() => {
    // Seed the datetime-local input after mount (DOM sync — no state churn,
    // and Date.now() stays out of render so the component stays pure).
    if (pickupTimeRef.current && !pickupTimeRef.current.value) {
      pickupTimeRef.current.value = getDefaultTime();
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setErrorMessage("");
    setIsLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrorMessage("Please sign in before requesting a package.");
      setIsLoading(false);
      return;
    }

    const timeValue = pickupTime || getDefaultTime();
    const pickupDate = new Date(timeValue);

    if (Number.isNaN(pickupDate.getTime())) {
      setErrorMessage("Please select a valid pickup time.");
      setIsLoading(false);
      return;
    }

    const finalDelivery = roomNumber.trim()
      ? `${deliveryLocation} • Room ${roomNumber.trim()}`
      : deliveryLocation;

    const fullDescription = `[${category.toUpperCase()}] ${packageDescription.trim() || packageCategories.find(c => c.id === category)?.placeholder}`;

    // OTP is generated server-side inside the RPC so it never round-trips
    // through the browser and is stored in a private table.
    const { error } = await supabase.rpc(
      "create_package_request",
      {
        p_package_description: fullDescription,
        p_pickup_location: pickupLocation,
        p_delivery_location: finalDelivery,
        p_pickup_time: pickupDate.toISOString(),
      }
    );

    if (error) {
      console.error("Package request error:", error);
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    setMessage("🎉 Request published! A student heading to the gate will claim it soon.");
    setIsLoading(false);

    setTimeout(() => {
      router.push("/requests");
      router.refresh();
    }, 1200);
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-8 sm:py-12 selection:bg-accent/20">
      <div className="mx-auto max-w-4xl">
        {/* Header navigation */}
        <PageHeader
          backHref="/"
          backLabel="Back to UniFetch"
          actions={
            <Link href="/requests" className="btn-ghost px-3 py-1.5 text-xs">
              View Active Requests
            </Link>
          }
        />

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Left Form Card */}
          <Card className="p-6 sm:p-9">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-tint text-sm">
                📦
              </span>
              <span className="eyebrow">New Delivery Request</span>
            </div>

            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-primary-hover">
              Get your parcel from the gate
            </h1>

            <p className="mt-2 text-sm text-muted">
              A verified student walking near the gate will bring it to your hostel lobby.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              {/* Category Picker */}
              <div>
                <label className="field-label">
                  1. What kind of package is it?
                </label>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {packageCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`flex items-center gap-2 rounded-2xl p-3 text-left text-xs font-bold transition border ${
                        category === cat.id
                          ? "border-primary bg-primary-tint text-primary shadow-xs ring-2 ring-accent/20"
                          : "border-border bg-surface-soft text-muted hover:border-border-strong"
                      }`}
                    >
                      <span className="text-base">{cat.icon}</span>
                      <span className="truncate">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Package Description */}
              <Field
                id="packageDescription"
                name="packageDescription"
                type="text"
                required
                label="2. Brief Item Description"
                placeholder={packageCategories.find((c) => c.id === category)?.placeholder}
                value={packageDescription}
                onChange={(e) => setPackageDescription(e.target.value)}
              />

              {/* Gate Pickup Location */}
              <Select
                id="pickupLocation"
                label="3. Pickup Gate / Counter"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
              >
                {gateLocations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </Select>

              {/* Delivery Dropoff Location */}
              <div>
                <label
                  htmlFor="deliveryLocation"
                  className="field-label"
                >
                  4. Your Hostel / Building
                </label>
                <div className="grid gap-3 sm:grid-cols-[1.3fr_0.7fr]">
                  <Select
                    id="deliveryLocation"
                    value={deliveryLocation}
                    onChange={(e) => setDeliveryLocation(e.target.value)}
                  >
                    {hostelLocations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </Select>

                  <Field
                    id="roomNumber"
                    type="text"
                    placeholder="Room No. (e.g. 302)"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                  />
                </div>
              </div>

              {/* Pickup Time */}
              <Field
                id="pickupTime"
                name="pickupTime"
                ref={pickupTimeRef}
                type="datetime-local"
                label="5. Needed By (Time)"
                onChange={(e) => setPickupTime(e.target.value)}
              />

              {/* Error and Success notifications */}
              <Alert tone="error" className="">{errorMessage}</Alert>
              <Alert tone="success" className="">{message}</Alert>

              {/* Submit Button */}
              <Button type="submit" size="lg" disabled={isLoading} className="w-full">
                {isLoading ? "Publishing Request…" : "Post Delivery Request 🚀"}
              </Button>
            </form>
          </Card>

          {/* Right Security & Preview Sidebar */}
          <div className="space-y-6">
            {/* Live Guarantee Box */}
            <Card className="p-6 panel-mint">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛡️</span>
                <h3 className="font-display font-bold text-primary-hover">
                  OTP Handshake Guarantee
                </h3>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted">
                When your order is created, UniFetch generates a private 6-digit confirmation code.
              </p>
              <div className="mt-4 rounded-2xl border border-accent/30 bg-surface p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                  Sample Confirmation Code
                </p>
                <p className="mt-1 font-mono text-2xl font-black tracking-[0.3em] text-primary-hover">
                  8 4 9 1 2 0
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  Only share this after receiving your parcel.
                </p>
              </div>
            </Card>

            {/* Quick Tips */}
            <Card className="p-6">
              <h4 className="font-display font-bold text-primary-hover">
                Campus Delivery Tips
              </h4>
              <ul className="mt-4 space-y-3 text-xs text-muted">
                <li className="flex items-start gap-2">
                  <span className="text-accent font-bold">✓</span>
                  <span>Tell your courier driver to drop your parcel at the security desk if they arrive early.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent font-bold">✓</span>
                  <span>Carriers are rewarded with credits right after OTP confirmation.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent font-bold">✓</span>
                  <span>You can cancel anytime while your request is still waiting for a carrier.</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}