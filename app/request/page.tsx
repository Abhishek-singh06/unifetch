"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ShieldCheck, Info, CheckCircle } from "lucide-react";
import { useSpring, animated } from "@react-spring/web";
import { supabase } from "@/lib/supabase/client";
import { SidebarShell } from "../components/SidebarShell";
import { Button } from "../components/ui/Button";
import { Field, Select } from "../components/ui/Field";
import { Alert } from "../components/ui/Alert";

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

  function getDefaultTime() {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }

  useEffect(() => {
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

  const formCardSpring = useSpring({
    from: { opacity: 0, transform: "translate3d(0, 15px, 0)" },
    to: { opacity: 1, transform: "translate3d(0, 0, 0)" },
    config: { tension: 320, friction: 24 },
  });

  return (
    <SidebarShell>
      <div className="p-6 sm:p-8 lg:p-10 space-y-8">
        
        {/* Title area */}
        <div className="border-b border-[rgba(255,255,255,0.08)] pb-6">
          <span className="text-xs font-bold uppercase tracking-widest text-[#2563eb]">New Delivery Job</span>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-white leading-none">
            Request Gate Pickup
          </h1>
          <p className="mt-2 text-xs text-[#cbd5e1] font-semibold">
            Fill out the details of your package waiting at the campus gate.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] items-start">
          {/* Left Form Card */}
          <animated.div style={formCardSpring}>
            <div className="rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-6 sm:p-8 bg-[#080d16]/40 backdrop-blur-sm">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Category selector */}
                <div>
                  <label className="field-label font-extrabold text-[10px] text-[#cbd5e1] tracking-wider uppercase mb-3">
                    1. Select Package Category
                  </label>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {packageCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`flex items-center gap-2.5 rounded-2xl p-4 text-left text-xs font-bold transition-all duration-150 border-2 ${
                          category === cat.id
                            ? "border-[#2563eb] bg-[#2563eb]/10 text-white shadow-glow"
                            : "border-[rgba(255,255,255,0.08)] bg-white/5 text-[#cbd5e1] hover:border-[#2563eb]/30 hover:text-white"
                        }`}
                      >
                        <span className="text-lg shrink-0">{cat.icon}</span>
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
                  label="2. Item Description"
                  placeholder={packageCategories.find((c) => c.id === category)?.placeholder}
                  value={packageDescription}
                  onChange={(e) => setPackageDescription(e.target.value)}
                />

                {/* Gate Pickup Location */}
                <Select
                  id="pickupLocation"
                  label="3. Pickup Gate"
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
                  <label htmlFor="deliveryLocation" className="field-label">
                    4. Hostel Destination
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
                      placeholder="Room No."
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
                  label="5. Deadline Time"
                  onChange={(e) => setPickupTime(e.target.value)}
                />

                {errorMessage && <Alert tone="error">{errorMessage}</Alert>}
                {message && <Alert tone="success">{message}</Alert>}

                <Button
                  type="submit"
                  size="lg"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-1.5 uppercase tracking-wider text-xs font-bold py-3.5 mt-2 shadow-glow"
                >
                  <span>{isLoading ? "Publishing Job..." : "Publish Delivery Request"}</span>
                </Button>
              </form>
            </div>
          </animated.div>

          {/* Right Information Sidebar */}
          <div className="space-y-6 lg:sticky lg:top-[85px]">
            {/* OTP graphic */}
            <div className="rounded-[2rem] border border-[#2563eb]/25 p-6 bg-gradient-to-b from-[#080d16] to-[#05070b]/60 shadow-glow relative overflow-hidden">
              <div className="absolute top-[20%] right-[-10%] w-[150px] h-[150px] rounded-full bg-[#2563eb]/8 blur-2xl pointer-events-none" />
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h3 className="font-display font-bold text-white">
                  OTP Security Protocol
                </h3>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[#cbd5e1] font-semibold">
                UniFetch generates a private 6-digit verification key for every errand request. Share this key with the carrier only when you inspect the package at your hostel.
              </p>
              
              <div className="mt-5 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#05070b]/80 p-4.5 text-center shadow-sm">
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-[#cbd5e1]">
                  Private Handoff Key
                </p>
                <p className="mt-2 font-mono text-2.5xl font-black tracking-[0.3em] text-[#2563eb] select-none drop-shadow-[0_0_15px_rgba(37,99,235,0.35)]">
                  8 4 9 1 2 0
                </p>
                <p className="mt-1.5 text-[9px] text-[#cbd5e1] font-bold">
                  Release code only after physical handover.
                </p>
              </div>
            </div>

            {/* Quick tips card */}
            <div className="rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-6 bg-[#080d16]/30">
              <h4 className="font-display font-bold text-white flex items-center gap-2 border-b border-[rgba(255,255,255,0.08)] pb-3">
                <Info className="h-4 w-4 text-primary" />
                Errand Posting Guidelines
              </h4>
              <ul className="mt-4 space-y-3.5 text-xs text-[#cbd5e1] font-semibold">
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="h-4.5 w-4.5 text-[#2563eb] shrink-0 mt-0.5" />
                  <span>Enter clear description details so the carrier picks up the correct parcel box.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="h-4.5 w-4.5 text-[#2563eb] shrink-0 mt-0.5" />
                  <span>Credits are held securely in escrow until you release the verification OTP.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </SidebarShell>
  );
}