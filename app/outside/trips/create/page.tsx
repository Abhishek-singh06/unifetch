"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Calendar, ArrowLeft } from "lucide-react";
import { useSpring, animated } from "@react-spring/web";
import { supabase } from "@/lib/supabase/client";
import { SidebarShell } from "../../../components/SidebarShell";
import { Button } from "../../../components/ui/Button";
import { Alert } from "../../../components/ui/Alert";
import Link from "next/link";

const helpOptionTypes = [
  { id: "buy", label: "Buy something" },
  { id: "pick_up", label: "Pick up something" },
  { id: "return", label: "Return something" },
  { id: "drop", label: "Drop something" },
  { id: "repair", label: "Repair/service" },
  { id: "other", label: "Other" },
];

export default function CreateTripAnnouncementPage() {
  const router = useRouter();

  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const [origin, setOrigin] = useState("College");
  const [selectedHelpTypes, setSelectedHelpTypes] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function handleToggleHelpType(id: string) {
    setSelectedHelpTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");
    setIsLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setErrorMessage("Please sign in to announce a trip.");
      setIsLoading(false);
      return;
    }

    if (!destination.trim()) {
      setErrorMessage("Please specify a destination.");
      setIsLoading(false);
      return;
    }

    if (!departureDate) {
      setErrorMessage("Please specify a departure date.");
      setIsLoading(false);
      return;
    }

    const { error } = await supabase
      .from("outside_trips")
      .insert({
        creator_id: user.id,
        origin: origin.trim(),
        destination: destination.trim(),
        departure_date: departureDate,
        departure_time: departureTime.trim() || null,
        return_date: returnDate || null,
        return_time: returnTime.trim() || null,
        help_types: selectedHelpTypes,
        note: note.trim() || null,
        status: "active"
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating trip:", error);
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    setMessage("🎉 Trip announced successfully! Students going out feed updated.");
    setIsLoading(false);

    setTimeout(() => {
      router.push("/outside/browse");
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
        
        {/* Back Link */}
        <div className="flex items-center">
          <Link href="/outside/browse" className="text-xs font-bold text-muted uppercase tracking-widest hover:text-white flex items-center gap-1.5 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Feed
          </Link>
        </div>

        {/* Title area */}
        <div className="border-b border-[rgba(255,255,255,0.08)] pb-6">
          <span className="text-xs font-bold uppercase tracking-widest text-[#10b981]">Outside Campus</span>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-white leading-none">
            Announce a Trip
          </h1>
          <p className="mt-2 text-xs text-[#cbd5e1] font-semibold">
            Let dormmates know you are going outside the campus so they can request carries or buy-runs.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] items-start">
          {/* Form */}
          <animated.div style={formSpring}>
            <div className="rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-6 sm:p-8 bg-[#080d16]/40 backdrop-blur-sm">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Destination */}
                <div>
                  <label htmlFor="destination" className="field-label font-extrabold text-[10px] text-[#cbd5e1] tracking-wider uppercase mb-2 block">
                    1. Destination / City (e.g. Chennai, T. Nagar)
                  </label>
                  <input
                    id="destination"
                    type="text"
                    required
                    placeholder="Enter trip destination"
                    className="field"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                  />
                </div>

                {/* Starting Point & Help Types */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="origin" className="field-label font-extrabold text-[10px] text-[#cbd5e1] tracking-wider uppercase mb-2 block">
                      2. Starting Point
                    </label>
                    <input
                      id="origin"
                      type="text"
                      required
                      placeholder="e.g. College, Campus Gate 1"
                      className="field"
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="departure_date" className="field-label font-extrabold text-[10px] text-[#cbd5e1] tracking-wider uppercase mb-2 block">
                      3. Departure Date
                    </label>
                    <input
                      id="departure_date"
                      type="date"
                      required
                      className="field"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Times */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="departure_time" className="field-label font-extrabold text-[10px] text-[#cbd5e1] tracking-wider uppercase mb-2 block">
                      4. Approx. Departure Time
                    </label>
                    <input
                      id="departure_time"
                      type="text"
                      placeholder="e.g. 10:00 AM"
                      className="field"
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="return_date" className="field-label font-extrabold text-[10px] text-[#cbd5e1] tracking-wider uppercase mb-2 block">
                      5. Return Date (Optional)
                    </label>
                    <input
                      id="return_date"
                      type="date"
                      className="field"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="return_time" className="field-label font-extrabold text-[10px] text-[#cbd5e1] tracking-wider uppercase mb-2 block">
                      6. Return Time (Optional)
                    </label>
                    <input
                      id="return_time"
                      type="text"
                      placeholder="e.g. 6:00 PM"
                      className="field"
                      value={returnTime}
                      onChange={(e) => setReturnTime(e.target.value)}
                    />
                  </div>
                </div>

                {/* Help checkboxes */}
                <div>
                  <label className="field-label font-extrabold text-[10px] text-[#cbd5e1] tracking-wider uppercase mb-3 block">
                    7. What are you willing to help with?
                  </label>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {helpOptionTypes.map((opt) => {
                      const isSelected = selectedHelpTypes.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleToggleHelpType(opt.id)}
                          className={`rounded-2xl border p-4 text-left transition-all duration-150 ${
                            isSelected 
                              ? "border-[#10b981] bg-[#10b981]/10 text-white shadow-glow-emerald" 
                              : "border-[rgba(255,255,255,0.06)] bg-[#05070b]/50 text-muted hover:border-[rgba(255,255,255,0.15)] hover:text-white"
                          }`}
                        >
                          <span className="block text-xs font-bold uppercase tracking-wider">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label htmlFor="note" className="field-label font-extrabold text-[10px] text-[#cbd5e1] tracking-wider uppercase mb-2 block">
                    8. Trip Note / Route Details
                  </label>
                  <textarea
                    id="note"
                    rows={4}
                    placeholder="Describe where exactly you are visiting or what size items you can carry (e.g. 'I am going to T. Nagar by metro. Can carry back small/medium size packages.')"
                    className="field resize-none py-3"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>

                {errorMessage && <Alert tone="error">{errorMessage}</Alert>}
                {message && <Alert tone="success">{message}</Alert>}

                <Button
                  type="submit"
                  size="lg"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-1.5 uppercase tracking-wider text-xs font-bold py-3.5 mt-2 bg-[#10b981] hover:bg-[#059669] shadow-glow-emerald text-white border-none"
                >
                  <span>{isLoading ? "Publishing Announcement..." : "Announce Trip"}</span>
                </Button>
              </form>
            </div>
          </animated.div>

          {/* Right Sidebar */}
          <div className="space-y-6 lg:sticky lg:top-[85px]">
            <div className="rounded-[2rem] border border-[#10b981]/25 p-6 bg-gradient-to-b from-[#080d16] to-[#05070b]/60 shadow-glow relative overflow-hidden">
              <div className="absolute top-[20%] right-[-10%] w-[150px] h-[150px] rounded-full bg-[#10b981]/8 blur-2xl pointer-events-none" />
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#10b981]" />
                <h3 className="font-display font-bold text-white">
                  Why announce?
                </h3>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[#cbd5e1] font-semibold">
                By letting others know you are traveling outside:
              </p>
              
              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#05070b]/80 p-4 shadow-sm text-xs font-semibold">
                  <p className="text-white font-bold">1. Cover travel costs</p>
                  <p className="mt-1 text-muted text-[10px]">Complete small errands for multiple people on your route and get rewarded in real money.</p>
                </div>
                <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#05070b]/80 p-4 shadow-sm text-xs font-semibold">
                  <p className="text-white font-bold">2. Help the community</p>
                  <p className="mt-1 text-muted text-[10px]">Dormmates don&apos;t have to travel hours just to return a package or buy a specific charger.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarShell>
  );
}
