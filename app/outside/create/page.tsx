"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, useEffect, Suspense } from "react";
import { DollarSign } from "lucide-react";
import { useSpring, animated } from "@react-spring/web";
import { supabase } from "@/lib/supabase/client";
import { SidebarShell } from "../../components/SidebarShell";
import { Button } from "../../components/ui/Button";
import { Field, Select } from "../../components/ui/Field";
import { Alert } from "../../components/ui/Alert";

const requestTypes = [
  { id: "buy", label: "Buy something", icon: "🛒" },
  { id: "bring", label: "Bring something", icon: "📦" },
  { id: "return", label: "Return something", icon: "🔄" },
  { id: "pickup", label: "Pick up something", icon: "🎒" },
  { id: "drop", label: "Drop something", icon: "📍" },
  { id: "repair", label: "Get repaired", icon: "🛠️" },
  { id: "other", label: "Other Task", icon: "🎁" },
];

const destinationPresets = [
  "Chennai Central",
  "T. Nagar",
  "Velachery",
  "Tambaram",
  "Chennai Airport",
  "Phoenix Marketcity Mall",
  "Custom Location",
];

function CreateOutsideRequestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripId = searchParams ? searchParams.get("trip_id") : null;
  const targetDest = searchParams ? searchParams.get("destination") : null;

  const [requestType, setRequestType] = useState("buy");
  const [destinationPreset, setDestinationPreset] = useState(destinationPresets[0]);
  const [customDestination, setCustomDestination] = useState("");
  const [description, setDescription] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [instructions, setInstructions] = useState("");
  const [suggestedReward, setSuggestedReward] = useState("100");

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    void (async () => {
      if (targetDest) {
        if (destinationPresets.includes(targetDest)) {
          setDestinationPreset(targetDest);
        } else {
          setDestinationPreset("Custom Location");
          setCustomDestination(targetDest);
        }
      }
    })();
  }, [targetDest]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");
    setIsLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setErrorMessage("Please sign in to create a request.");
      setIsLoading(false);
      return;
    }

    const reward = parseInt(suggestedReward, 10);
    if (isNaN(reward) || reward <= 0) {
      setErrorMessage("Please enter a valid reward amount.");
      setIsLoading(false);
      return;
    }

    const finalDestination = destinationPreset === "Custom Location" 
      ? customDestination.trim() 
      : destinationPreset;

    if (!finalDestination) {
      setErrorMessage("Please specify a destination.");
      setIsLoading(false);
      return;
    }

    const dateVal = preferredDate ? new Date(preferredDate) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (isNaN(dateVal.getTime())) {
      setErrorMessage("Please specify a valid date.");
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("outside_requests")
      .insert({
        requester_id: user.id,
        request_type: requestType,
        destination: finalDestination,
        description: description.trim(),
        preferred_date: dateVal.toISOString(),
        instructions: instructions.trim(),
        suggested_reward: reward,
        status: "OPEN",
        payment_status: "Pending",
        trip_id: tripId
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating outside request:", error);
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    setMessage("🎉 Outside request published successfully!");
    setIsLoading(false);

    setTimeout(() => {
      router.push(`/outside/${data.id}`);
      router.refresh();
    }, 1200);
  }

  const formSpring = useSpring({
    from: { opacity: 0, transform: "translate3d(0, 15px, 0)" },
    to: { opacity: 1, transform: "translate3d(0, 0, 0)" },
    config: { tension: 320, friction: 24 },
  });

  return (
    <SidebarShell>
      <div className="p-6 sm:p-8 lg:p-10 space-y-8">
        
        {/* Title area */}
        <div className="border-b border-[rgba(255,255,255,0.08)] pb-6">
          <span className="text-xs font-bold uppercase tracking-widest text-[#10b981]">Outside Campus</span>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-white leading-none">
            Request Outside Carry &amp; Drop
          </h1>
          <p className="mt-2 text-xs text-[#cbd5e1] font-semibold">
            Post tasks for students heading outside the campus. Negotiate reward directly in real money.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] items-start">
          {/* Form */}
          <animated.div style={formSpring}>
            <div className="rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-6 sm:p-8 bg-[#080d16]/40 backdrop-blur-sm">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Request Type */}
                <div>
                  <label className="field-label font-extrabold text-[10px] text-[#cbd5e1] tracking-wider uppercase mb-3">
                    1. Select Request Type
                  </label>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {requestTypes.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setRequestType(t.id)}
                        className={`flex items-center gap-2.5 rounded-2xl p-4 text-left text-xs font-bold transition-all duration-150 border-2 ${
                          requestType === t.id
                            ? "border-[#10b981] bg-[#10b981]/10 text-white shadow-glow-emerald"
                            : "border-[rgba(255,255,255,0.08)] bg-white/5 text-[#cbd5e1] hover:border-[#10b981]/30 hover:text-white"
                        }`}
                      >
                        <span className="text-lg shrink-0">{t.icon}</span>
                        <span className="truncate">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Destination Selector */}
                <div>
                  <label htmlFor="destinationPreset" className="field-label">
                    2. Destination / Target Location
                  </label>
                  <div className="grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
                    <Select
                      id="destinationPreset"
                      value={destinationPreset}
                      onChange={(e) => setDestinationPreset(e.target.value)}
                    >
                      {destinationPresets.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </Select>

                    {destinationPreset === "Custom Location" && (
                      <Field
                        id="customDestination"
                        type="text"
                        placeholder="Enter location name"
                        value={customDestination}
                        onChange={(e) => setCustomDestination(e.target.value)}
                        required
                      />
                    )}
                  </div>
                </div>

                {/* Item / Task Description */}
                <Field
                  id="description"
                  type="text"
                  required
                  label="3. Item or Task Description"
                  placeholder="e.g. Buy a USB-C Cable from Croma in T. Nagar"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />

                {/* Date */}
                <Field
                  id="preferredDate"
                  type="datetime-local"
                  required
                  label="4. Preferred Date &amp; Time"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                />

                {/* Additional Instructions */}
                <div>
                  <label htmlFor="instructions" className="field-label">
                    5. Additional Instructions (Shop details, sizes, colors, model numbers)
                  </label>
                  <textarea
                    id="instructions"
                    rows={3}
                    placeholder="e.g. Croma T. Nagar branch, Model: XYZ. Reference: Black color only."
                    className="w-full rounded-2xl border border-[rgba(255,255,255,0.08)] bg-white/5 p-4 text-xs font-semibold text-white placeholder-[rgba(255,255,255,0.3)] focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] focus:outline-none transition-colors"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                  />
                </div>

                {/* Suggested Reward */}
                <div>
                  <label htmlFor="suggestedReward" className="field-label">
                    6. Suggested Cash Reward (₹ - Negotiable)
                  </label>
                  <div className="relative rounded-2xl shadow-sm max-w-[200px]">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-[#cbd5e1] text-xs font-bold">₹</span>
                    </div>
                    <input
                      type="number"
                      id="suggestedReward"
                      className="block w-full pl-8 pr-4 py-3 border border-[rgba(255,255,255,0.08)] bg-white/5 rounded-2xl text-xs font-bold text-white focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] focus:outline-none"
                      placeholder="100"
                      value={suggestedReward}
                      onChange={(e) => setSuggestedReward(e.target.value)}
                      required
                    />
                  </div>
                  <span className="text-[10px] text-muted block mt-1.5 font-bold uppercase tracking-wider">
                    Note: This is an starting offer. You can negotiate the final price with the carrier in the chat.
                  </span>
                </div>

                {errorMessage && <Alert tone="error">{errorMessage}</Alert>}
                {message && <Alert tone="success">{message}</Alert>}

                <Button
                  type="submit"
                  size="lg"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-1.5 uppercase tracking-wider text-xs font-bold py-3.5 mt-2 bg-[#10b981] hover:bg-[#059669] shadow-glow-emerald text-white border-none"
                >
                  <span>{isLoading ? "Publishing Request..." : "Publish Outside Request"}</span>
                </Button>
              </form>
            </div>
          </animated.div>

          {/* Right Sidebar */}
          <div className="space-y-6 lg:sticky lg:top-[85px]">
            <div className="rounded-[2rem] border border-[#10b981]/25 p-6 bg-gradient-to-b from-[#080d16] to-[#05070b]/60 shadow-glow relative overflow-hidden">
              <div className="absolute top-[20%] right-[-10%] w-[150px] h-[150px] rounded-full bg-[#10b981]/8 blur-2xl pointer-events-none" />
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-[#10b981]" />
                <h3 className="font-display font-bold text-white">
                  Real Money System
                </h3>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[#cbd5e1] font-semibold">
                Unlike Within-Campus orders which use credits, Outside Campus tasks are paid with **real cash/UPI**.
              </p>
              
              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#05070b]/80 p-4 shadow-sm text-xs font-semibold">
                  <p className="text-white font-bold">1. Propose &amp; Agree</p>
                  <p className="mt-1 text-muted text-[10px]">Chat directly inside the app to discuss task parameters and agree on a payment amount.</p>
                </div>
                <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#05070b]/80 p-4 shadow-sm text-xs font-semibold">
                  <p className="text-white font-bold">2. Scan &amp; Pay</p>
                  <p className="mt-1 text-muted text-[10px]">Carriers upload their UPI/QR code so requesters can scan and make real-money transfers directly.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarShell>
  );
}

export default function CreateOutsideRequestPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-[#05070b]">
        <div className="text-center">
          <p className="text-[10px] font-extrabold tracking-widest text-[#cbd5e1] font-display uppercase animate-pulse">Loading form...</p>
        </div>
      </main>
    }>
      <CreateOutsideRequestForm />
    </Suspense>
  );
}
