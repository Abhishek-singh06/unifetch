"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

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
    <main className="min-h-screen bg-[#f8f7f2] px-5 py-8 text-[#0c1c15] sm:px-8 sm:py-12 selection:bg-[#10b981]/20">
      <div className="mx-auto max-w-4xl">
        {/* Header navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold text-[#0f4c3a] hover:text-[#093326]"
          >
            <span>← Back to UniFetch</span>
          </Link>

          <Link
            href="/requests"
            className="rounded-full border border-[#d6e3db] bg-white px-4 py-2 text-xs font-bold text-[#0f4c3a] shadow-xs transition hover:bg-[#edeae0]"
          >
            View Active Requests
          </Link>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Left Form Card */}
          <div className="rounded-3xl border border-[#e2dcd0] bg-white p-6 shadow-xl shadow-[#0c241b]/5 sm:p-9">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ecfdf5] text-sm">
                📦
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-[#0f4c3a]">
                New Delivery Request
              </span>
            </div>

            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-[#081e15]">
              Get your parcel from the gate
            </h1>

            <p className="mt-2 text-sm text-[#5c7a6e]">
              A verified student walking near the gate will bring it to your hostel lobby.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              {/* Category Picker */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4d6b5e] mb-2.5">
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
                          ? "border-[#0f4c3a] bg-[#ecfdf5] text-[#0f4c3a] shadow-xs ring-2 ring-[#10b981]/20"
                          : "border-[#e5e0d3] bg-[#fdfdfb] text-[#557365] hover:border-[#cbd7cf]"
                      }`}
                    >
                      <span className="text-base">{cat.icon}</span>
                      <span className="truncate">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Package Description */}
              <div>
                <label
                  htmlFor="packageDescription"
                  className="block text-xs font-bold uppercase tracking-wider text-[#4d6b5e] mb-2"
                >
                  2. Brief Item Description
                </label>
                <input
                  id="packageDescription"
                  name="packageDescription"
                  type="text"
                  required
                  value={packageDescription}
                  onChange={(e) => setPackageDescription(e.target.value)}
                  placeholder={packageCategories.find((c) => c.id === category)?.placeholder}
                  className="w-full rounded-2xl border border-[#d8d2c4] bg-[#fbfaf6] px-4 py-3.5 text-sm font-medium outline-none transition placeholder:text-[#9bb2a5] focus:border-[#0f4c3a] focus:bg-white focus:ring-4 focus:ring-[#10b981]/15"
                />
              </div>

              {/* Gate Pickup Location */}
              <div>
                <label
                  htmlFor="pickupLocation"
                  className="block text-xs font-bold uppercase tracking-wider text-[#4d6b5e] mb-2"
                >
                  3. Pickup Gate / Counter
                </label>
                <select
                  id="pickupLocation"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  className="w-full rounded-2xl border border-[#d8d2c4] bg-[#fbfaf6] px-4 py-3.5 text-sm font-medium outline-none transition focus:border-[#0f4c3a] focus:bg-white focus:ring-4 focus:ring-[#10b981]/15"
                >
                  {gateLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Delivery Dropoff Location */}
              <div>
                <label
                  htmlFor="deliveryLocation"
                  className="block text-xs font-bold uppercase tracking-wider text-[#4d6b5e] mb-2"
                >
                  4. Your Hostel / Building
                </label>
                <div className="grid gap-3 sm:grid-cols-[1.3fr_0.7fr]">
                  <select
                    id="deliveryLocation"
                    value={deliveryLocation}
                    onChange={(e) => setDeliveryLocation(e.target.value)}
                    className="w-full rounded-2xl border border-[#d8d2c4] bg-[#fbfaf6] px-4 py-3.5 text-sm font-medium outline-none transition focus:border-[#0f4c3a] focus:bg-white focus:ring-4 focus:ring-[#10b981]/15"
                  >
                    {hostelLocations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="Room No. (e.g. 302)"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full rounded-2xl border border-[#d8d2c4] bg-[#fbfaf6] px-4 py-3.5 text-sm font-medium outline-none transition placeholder:text-[#9bb2a5] focus:border-[#0f4c3a] focus:bg-white focus:ring-4 focus:ring-[#10b981]/15"
                  />
                </div>
              </div>

              {/* Pickup Time */}
              <div>
                <label
                  htmlFor="pickupTime"
                  className="block text-xs font-bold uppercase tracking-wider text-[#4d6b5e] mb-2"
                >
                  5. Needed By (Time)
                </label>
                <input
                  id="pickupTime"
                  name="pickupTime"
                  ref={pickupTimeRef}
                  type="datetime-local"
                  onChange={(e) => setPickupTime(e.target.value)}
                  className="w-full rounded-2xl border border-[#d8d2c4] bg-[#fbfaf6] px-4 py-3.5 text-sm font-medium outline-none transition focus:border-[#0f4c3a] focus:bg-white focus:ring-4 focus:ring-[#10b981]/15"
                />
              </div>

              {/* Error and Success notifications */}
              {errorMessage && (
                <div className="rounded-2xl border border-[#fecaca] bg-[#fff5f5] p-4 text-xs font-semibold text-[#991b1b]">
                  {errorMessage}
                </div>
              )}

              {message && (
                <div className="rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] p-4 text-xs font-semibold text-[#065f46]">
                  {message}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-2xl bg-[#0f4c3a] py-4 text-sm font-bold text-white shadow-xl shadow-[#0f4c3a]/20 transition hover:bg-[#093326] hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Publishing Request..." : "Post Delivery Request 🚀"}
              </button>
            </form>
          </div>

          {/* Right Security & Preview Sidebar */}
          <div className="space-y-6">
            {/* Live Guarantee Box */}
            <div className="rounded-3xl border border-[#d6ecdf] bg-[#f4fbf7] p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛡️</span>
                <h3 className="font-display font-bold text-[#0f4c3a]">
                  OTP Handshake Guarantee
                </h3>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[#446b5a]">
                When your order is created, UniFetch generates a private 6-digit confirmation code.
              </p>
              <div className="mt-4 rounded-2xl border border-[#bbf7d0] bg-white p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#698c7d]">
                  Sample Confirmation Code
                </p>
                <p className="mt-1 font-mono text-2xl font-black tracking-[0.3em] text-[#0f4c3a]">
                  8 4 9 1 2 0
                </p>
                <p className="mt-1 text-[11px] text-[#557868]">
                  Only share this after receiving your parcel.
                </p>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="rounded-3xl border border-[#e2dcd0] bg-white p-6 shadow-sm">
              <h4 className="font-display font-bold text-[#0c241b]">
                Campus Delivery Tips
              </h4>
              <ul className="mt-4 space-y-3 text-xs text-[#527163]">
                <li className="flex items-start gap-2">
                  <span className="text-[#10b981] font-bold">✓</span>
                  <span>Tell your courier driver to drop your parcel at the security desk if they arrive early.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#10b981] font-bold">✓</span>
                  <span>Carriers are rewarded with credits right after OTP confirmation.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#10b981] font-bold">✓</span>
                  <span>You can cancel anytime while your request is still waiting for a carrier.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}