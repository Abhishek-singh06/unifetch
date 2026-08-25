"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const tickerItems = [
  "⚡ Arjun K. picked up an Amazon box for Priya at Hostel 4",
  "🪙 Sneha earned +35 credits heading to Main Gate",
  "🛡️ 100% verified student handoff completed at Block C",
  "📦 Food parcel delivered to Library Desk 22 in 14 mins",
  "⭐ Campus Trust Rating: 4.92 / 5.0 across 1,420+ deliveries",
];

const mockPreviews = [
  {
    id: "amazon",
    label: "📦 Amazon Package",
    item: "AirPods Pro & Books",
    pickup: "Main Gate • Security Parcel Desk",
    dropoff: "Hostel 3 • Room 214",
    status: "Carrier En Route",
    carrier: "Devansh R.",
    branch: "ECE '26",
    rating: "4.9 ★ (34 runs)",
    eta: "Arriving in 6 mins",
    credits: "+30",
    progress: 75,
  },
  {
    id: "food",
    label: "🍔 Food & Drinks",
    item: "Subway Meal + Cold Coffee",
    pickup: "North Turnstile • Delivery Zone B",
    dropoff: "Girls Hostel Block A • Lobby",
    status: "Picked Up",
    carrier: "Meera S.",
    branch: "CS '25",
    rating: "5.0 ★ (51 runs)",
    eta: "Arriving in 9 mins",
    credits: "+40",
    progress: 50,
  },
  {
    id: "prints",
    label: "📄 Documents / Prints",
    item: "Project Report (Spiral Bound)",
    pickup: "Campus Post Office Gate",
    dropoff: "Science Block • Lab 402",
    status: "Matched with Carrier",
    carrier: "Karan T.",
    branch: "Mech '26",
    rating: "4.8 ★ (19 runs)",
    eta: "Pickup in 4 mins",
    credits: "+25",
    progress: 30,
  },
];

const faqs = [
  {
    q: "How do I know my package won't be stolen or opened?",
    a: "Every UniFetch carrier is verified with a real student ID card. More importantly, deliveries are protected by a tamper-proof 6-digit OTP generated exclusively for you. The carrier only receives credit confirmation after you inspect your parcel and share the OTP.",
  },
  {
    q: "What if I'm walking to the main gate for something else?",
    a: "That's the beauty of UniFetch! Open the Carry tab, see who has a package waiting at your gate, grab it on your way, drop it at their hostel lobby, and pocket credits or cash tips with almost zero detour.",
  },
  {
    q: "What are UniFetch credits used for?",
    a: "Credits allow you to get your own packages fetched for free. 1 standard delivery = ~30 credits. When you carry a parcel for a friend, you earn credits to have someone fetch your parcels next week.",
  },
  {
    q: "Can I use UniFetch for food orders (Swiggy / Zomato)?",
    a: "Yes! Many campus delivery drivers are barred from entering past the main gate turnstile. You can create a quick delivery request for food drop-offs so your meal reaches your hostel hot.",
  },
];

export default function Home() {
  const router = useRouter();

  const [userCredits, setUserCredits] = useState(100);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(true);
  const [selectedPreview, setSelectedPreview] = useState(0);
  const [ordersPerWeek, setOrdersPerWeek] = useState(3);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    async function getUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setIsLoggedIn(false);
          setIsCheckingUser(false);
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("full_name, verification_status, credits")
          .eq("id", user.id)
          .single();

        if (error || !profile) {
          setIsCheckingUser(false);
          return;
        }

        if (profile.verification_status !== "approved") {
          router.replace("/verification");
          return;
        }

        setIsLoggedIn(true);
        setUserCredits(profile.credits || 100);
        setIsCheckingUser(false);
      } catch (err) {
        console.error("Auth check error:", err);
        setIsCheckingUser(false);
      }
    }

    getUser();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    router.refresh();
  }

  if (isCheckingUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f7f2]">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-3 border-[#d8e8de] border-t-[#0f4c3a]" />
          <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-[#5c7a6e]">
            UniFetch Campus Network
          </p>
        </div>
      </main>
    );
  }

  const activeMock = mockPreviews[selectedPreview];
  const stepsSaved = ordersPerWeek * 1800 * 16;
  const hoursSaved = Math.round((ordersPerWeek * 22 * 16) / 60);

  return (
    <main className="min-h-screen bg-[#f8f7f2] text-[#0c1c15] selection:bg-[#10b981]/20 selection:text-[#062c20]">
      {/* Top Banner Ticker */}
      <div className="overflow-hidden border-b border-[#e6e2d6] bg-[#0c241b] py-2 text-xs font-medium text-[#a7d9c4]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10b981] opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10b981]"></span>
            </span>
            <span className="font-semibold text-white">Campus Live:</span>
            <span className="hidden sm:inline text-[#c4e8d8]">
              {tickerItems[0]}
            </span>
            <span className="sm:hidden text-[#c4e8d8]">
              14 gate packages waiting
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-[#86bba4]">
            <span className="hidden md:inline">🔒 Verified Campus Network</span>
            <span>⚡ Avg Handoff: ~18 min</span>
          </div>
        </div>
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-[#e8e4da] bg-[#f8f7f2]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 group"
            aria-label="UniFetch Home"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f4c3a] text-white shadow-md shadow-[#0f4c3a]/20 transition group-hover:scale-105 group-hover:bg-[#0c3a2c]">
              <svg
                aria-hidden="true"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" />
                <path d="m4.5 7.7 7.5 4.2 7.5-4.2M12 12v9" />
              </svg>
            </div>
            <div>
              <span className="font-display text-xl font-bold tracking-tight text-[#0c241b]">
                UniFetch
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#527768]">
                Campus Peer Network
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-[#486358] md:flex">
            <a href="#how-it-works" className="transition hover:text-[#0f4c3a]">
              How It Works
            </a>
            <a href="#calculator" className="transition hover:text-[#0f4c3a]">
              Step Calculator
            </a>
            <a href="#trust" className="transition hover:text-[#0f4c3a]">
              Safety & OTP
            </a>
            <a href="#faqs" className="transition hover:text-[#0f4c3a]">
              FAQs
            </a>

            {isLoggedIn && (
              <>
                <Link
                  href="/requests"
                  className="rounded-lg bg-[#ebf3ee] px-3 py-1.5 text-xs font-bold text-[#0f4c3a] transition hover:bg-[#dceee3]"
                >
                  My Requests
                </Link>
                <Link
                  href="/carry"
                  className="rounded-lg bg-[#0f4c3a]/10 px-3 py-1.5 text-xs font-bold text-[#0f4c3a] transition hover:bg-[#0f4c3a]/15"
                >
                  Carry Packages
                </Link>
              </>
            )}
          </nav>

          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 rounded-full border border-[#d6e3db] bg-white px-3 py-1.5 shadow-sm text-xs font-semibold text-[#0f4c3a]">
                <span>🪙</span>
                <span>{userCredits} Credits</span>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/request"
                  className="rounded-full bg-[#0f4c3a] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#0f4c3a]/20 transition hover:bg-[#0a382a]"
                >
                  + New Request
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full border border-[#d6e3db] bg-white px-3.5 py-2 text-xs font-semibold text-[#486358] transition hover:bg-[#f1eee4]"
                >
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                href="/login"
                className="rounded-full px-4 py-2 text-xs font-bold text-[#0f4c3a] transition hover:bg-[#eceae1]"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-[#0f4c3a] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-[#0f4c3a]/25 transition hover:bg-[#093326]"
              >
                Join Campus →
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-16 md:pb-28">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-[#10b981]/15 to-[#f59e0b]/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
            {/* Left Content */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d8e6de] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0f4c3a] shadow-xs">
                <span className="h-2 w-2 rounded-full bg-[#10b981] animate-pulse" />
                <span>The campus parcel peer-network</span>
              </div>

              <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight text-[#081e15] sm:text-5xl lg:text-6xl leading-[1.08]">
                Stop walking 20 minutes to the gate for small packages.
              </h1>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-[#436154] sm:text-lg">
                Need your Amazon box or Swiggy parcel brought to your hostel?
                Connect with verified peers already heading back from the gate.
                Fast delivery, zero courier hassles, secured with 6-digit OTP.
              </p>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col gap-3.5 sm:flex-row">
                <Link
                  href="/request"
                  className="inline-flex items-center justify-center rounded-xl bg-[#0f4c3a] px-6 py-4 text-sm font-bold text-white shadow-xl shadow-[#0f4c3a]/25 transition hover:bg-[#083024] hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Request a Gate Pickup</span>
                  <span className="ml-2">📦 →</span>
                </Link>

                <Link
                  href="/carry"
                  className="inline-flex items-center justify-center rounded-xl border border-[#d0ded6] bg-white px-6 py-4 text-sm font-bold text-[#0f4c3a] shadow-xs transition hover:border-[#0f4c3a] hover:bg-[#f5fbf7] hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Carry on Your Way (Earn 🪙)</span>
                </Link>
              </div>

              {/* Security Pill Indicators */}
              <div className="mt-8 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs font-semibold text-[#5a786c]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#10b981]">✓</span>
                  <span>100% Verified Student IDs</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#10b981]">✓</span>
                  <span>Tamper-Proof OTP Handshake</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#10b981]">✓</span>
                  <span>Zero Delivery Charges</span>
                </div>
              </div>
            </div>

            {/* Right Live Interactive Simulator Card */}
            <div>
              <div className="rounded-3xl border border-[#e2dcd0] bg-white p-6 shadow-2xl shadow-[#0c241b]/10 sm:p-7">
                <div className="flex items-center justify-between border-b border-[#f0ebe0] pb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-3 w-3 items-center justify-center rounded-full bg-[#10b981]">
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#0f4c3a]">
                      Live Pickup Radar
                    </span>
                  </div>
                  <span className="rounded-full bg-[#ecfdf5] px-3 py-1 text-xs font-bold text-[#0f4c3a]">
                    Verified Peer Matched
                  </span>
                </div>

                {/* Package Type Switcher Tabs */}
                <div className="mt-4 flex gap-2">
                  {mockPreviews.map((p, idx) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPreview(idx)}
                      className={`flex-1 rounded-xl py-2 px-2 text-center text-xs font-bold transition ${
                        selectedPreview === idx
                          ? "bg-[#0f4c3a] text-white shadow-xs"
                          : "bg-[#f5f2e9] text-[#5b7367] hover:bg-[#ede9dc]"
                      }`}
                    >
                      {p.label.split(" ")[0]} {p.label.split(" ")[1]}
                    </button>
                  ))}
                </div>

                {/* Active Simulated Order Details */}
                <div className="mt-6 rounded-2xl border border-[#ebe5d8] bg-[#fbfaf6] p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#7e998e]">
                        Item Description
                      </p>
                      <h4 className="mt-1 font-display text-lg font-bold text-[#0c241b]">
                        {activeMock.item}
                      </h4>
                    </div>
                    <span className="rounded-lg bg-[#fffbeb] border border-[#fde68a] px-2.5 py-1 text-xs font-bold text-[#b45309]">
                      {activeMock.credits} Credits
                    </span>
                  </div>

                  {/* Route Visual */}
                  <div className="mt-4 space-y-2 text-xs text-[#486358]">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0f4c3a] text-[10px] font-bold text-white">
                        A
                      </span>
                      <span>
                        <strong>Pickup:</strong> {activeMock.pickup}
                      </span>
                    </div>
                    <div className="ml-2.5 h-3 w-0.5 bg-[#cbdad2]" />
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#10b981] text-[10px] font-bold text-white">
                        B
                      </span>
                      <span>
                        <strong>Dropoff:</strong> {activeMock.dropoff}
                      </span>
                    </div>
                  </div>

                  {/* Carrier Information */}
                  <div className="mt-5 flex items-center justify-between border-t border-[#ebe4d6] pt-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0f4c3a] font-bold text-white text-sm">
                        {activeMock.carrier.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#0c241b]">
                          {activeMock.carrier} • {activeMock.branch}
                        </p>
                        <p className="text-[11px] text-[#6b857a]">
                          {activeMock.rating}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#0f4c3a]">
                      {activeMock.eta}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] font-semibold text-[#5a766a] mb-1.5">
                      <span>Status: {activeMock.status}</span>
                      <span>{activeMock.progress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#e3ddd0]">
                      <div
                        className="h-full rounded-full bg-[#0f4c3a] transition-all duration-500"
                        style={{ width: `${activeMock.progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-xl bg-[#ecfdf5] px-4 py-2.5 text-xs text-[#0f4c3a]">
                  <span className="font-semibold">🔒 Security code required for handoff</span>
                  <span className="font-mono font-bold tracking-widest bg-white px-2 py-0.5 rounded border border-[#bbf7d0]">
                    *** 592
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Gate Problem: Why Campus Erranding is Broken */}
      <section className="border-t border-[#e8e4da] bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-[#10b981]">
              The Campus Errand Dilemma
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-[#081e15] sm:text-4xl">
              Why walking to the main gate 4 times a week is absurd.
            </h2>
            <p className="mt-4 text-base text-[#567467]">
              E-commerce couriers cannot enter campus gates. Students spend hours
              every semester making the same exhausting round trips.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-2">
            {/* The Old Frustrating Way */}
            <div className="rounded-3xl border border-[#fecaca] bg-[#fff5f5] p-8 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fee2e2] text-lg">
                  ❌
                </span>
                <h3 className="font-display text-xl font-bold text-[#991b1b]">
                  The Old Way (Gate Nightmare)
                </h3>
              </div>

              <ul className="mt-6 space-y-4 text-sm text-[#7f1d1d]">
                <li className="flex items-start gap-3">
                  <span>•</span>
                  <span>
                    <strong>Delivery arrives mid-lecture:</strong> Delivery guy calls 3 times while you are presenting or taking notes.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span>•</span>
                  <span>
                    <strong>20–30 minute round trip:</strong> Walking across campus in scorching heat, rain, or before dinner.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span>•</span>
                  <span>
                    <strong>Parcels piling up at guard desk:</strong> Boxes getting misplaced or buried under dozens of deliveries.
                  </span>
                </li>
              </ul>
            </div>

            {/* The UniFetch Peer Network Way */}
            <div className="rounded-3xl border border-[#a7f3d0] bg-[#f0fdf4] p-8 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d1fae5] text-lg">
                  ✨
                </span>
                <h3 className="font-display text-xl font-bold text-[#065f46]">
                  With UniFetch (Peer Delivery)
                </h3>
              </div>

              <ul className="mt-6 space-y-4 text-sm text-[#065f46]">
                <li className="flex items-start gap-3">
                  <span>•</span>
                  <span>
                    <strong>Zero detours needed:</strong> A student who was already at the gate cafe grabs your parcel on their walk back.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span>•</span>
                  <span>
                    <strong>Delivered to your hostel lobby:</strong> Receive your Amazon parcel or Swiggy meal right where you live.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span>•</span>
                  <span>
                    <strong>Win-win credit economy:</strong> Carriers earn points/credits, requesters save 20 minutes of walking.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Step & Time Calculator */}
      <section id="calculator" className="border-t border-[#e8e4da] bg-[#fbfaf6] py-20">
        <div className="mx-auto max-w-4xl px-5 sm:px-8 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-[#0f4c3a]">
            Interactive Campus Savings Calculator
          </span>
          <h2 className="mt-3 font-display text-3xl font-bold text-[#081e15] sm:text-4xl">
            How much walking will UniFetch save you this semester?
          </h2>

          <div className="mt-10 rounded-3xl border border-[#e2dcd0] bg-white p-8 shadow-lg shadow-[#0c241b]/5">
            <label
              htmlFor="orders"
              className="block text-sm font-bold text-[#324f42]"
            >
              How many parcels / food deliveries do you get per week?
            </label>

            {/* Slider / Preset Buttons */}
            <div className="mt-6 flex justify-center gap-3">
              {[1, 2, 3, 5, 8].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setOrdersPerWeek(num)}
                  className={`h-12 w-14 rounded-2xl text-sm font-bold transition ${
                    ordersPerWeek === num
                      ? "bg-[#0f4c3a] text-white shadow-md shadow-[#0f4c3a]/25 scale-105"
                      : "border border-[#e2dcd0] bg-[#f8f7f2] text-[#486358] hover:bg-[#ede9dc]"
                  }`}
                >
                  {num}/wk
                </button>
              ))}
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-3 border-t border-[#ede7da] pt-8">
              <div className="rounded-2xl bg-[#f5fbf8] p-5 border border-[#d6ecdf]">
                <p className="text-xs font-bold uppercase tracking-wider text-[#43755f]">
                  Steps Avoided
                </p>
                <p className="mt-2 font-display text-3xl font-extrabold text-[#0f4c3a]">
                  ~{stepsSaved.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-[#6a877a]">
                  Every single semester
                </p>
              </div>

              <div className="rounded-2xl bg-[#f5fbf8] p-5 border border-[#d6ecdf]">
                <p className="text-xs font-bold uppercase tracking-wider text-[#43755f]">
                  Study & Free Time Saved
                </p>
                <p className="mt-2 font-display text-3xl font-extrabold text-[#0f4c3a]">
                  ~{hoursSaved} Hours
                </p>
                <p className="mt-1 text-xs text-[#6a877a]">
                  No gate walking in heat/rain
                </p>
              </div>

              <div className="rounded-2xl bg-[#fffbeb] p-5 border border-[#fef3c7]">
                <p className="text-xs font-bold uppercase tracking-wider text-[#b45309]">
                  Carrier Earnings Potential
                </p>
                <p className="mt-2 font-display text-3xl font-extrabold text-[#92400e]">
                  +{ordersPerWeek * 30 * 16} 🪙
                </p>
                <p className="mt-1 text-xs text-[#a16207]">
                  If you carry for friends on walks
                </p>
              </div>
            </div>

            <div className="mt-8">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-xl bg-[#0f4c3a] px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#0f4c3a]/20 transition hover:bg-[#093326]"
              >
                Claim Your 100 Free Starter Credits →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works (3 Steps) */}
      <section id="how-it-works" className="border-t border-[#e8e4da] bg-[#0c241b] py-20 text-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-xl">
            <span className="text-xs font-bold uppercase tracking-widest text-[#10b981]">
              Simple 3-Step Flow
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              How packages move effortlessly across your campus.
            </h2>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <div className="rounded-3xl border border-white/15 bg-white/[0.05] p-7 transition hover:bg-white/[0.08]">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#10b981] font-display text-lg font-bold text-[#0c241b]">
                01
              </span>
              <h3 className="mt-6 font-display text-xl font-bold">
                1. Post in 10 Seconds
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#bad4c8]">
                Type what package is waiting at the gate (Amazon parcel, Swiggy, stationery) and select your hostel block.
              </p>
            </div>

            <div className="rounded-3xl border border-white/15 bg-white/[0.05] p-7 transition hover:bg-white/[0.08]">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#10b981] font-display text-lg font-bold text-[#0c241b]">
                02
              </span>
              <h3 className="mt-6 font-display text-xl font-bold">
                2. A Nearby Student Claims It
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#bad4c8]">
                A verified peer who is already at the main gate claims your delivery and picks it up from the security counter.
              </p>
            </div>

            <div className="rounded-3xl border border-white/15 bg-white/[0.05] p-7 transition hover:bg-white/[0.08]">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#10b981] font-display text-lg font-bold text-[#0c241b]">
                03
              </span>
              <h3 className="mt-6 font-display text-xl font-bold">
                3. OTP Secured Handoff
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#bad4c8]">
                They bring it straight to your hostel lobby. You check your parcel, give them your unique 6-digit OTP, and they receive credits.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Safety & Trust Section */}
      <section id="trust" className="border-t border-[#e8e4da] bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#10b981]">
                Safety First Architecture
              </span>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-[#081e15] sm:text-4xl">
                Built strictly for students. Protected by OTP cryptography.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[#516e62]">
                We know your packages contain expensive electronics, books, and
                personal items. UniFetch was engineered around verifiable campus
                trust.
              </p>

              <div className="mt-8 space-y-5">
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ecfdf5] text-lg text-[#0f4c3a]">
                    🪪
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0c241b]">
                      Strict Student ID Verification
                    </h4>
                    <p className="mt-1 text-xs leading-relaxed text-[#5c7a6e]">
                      Every student must submit a verified college ID card before they can request or carry a single parcel.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ecfdf5] text-lg text-[#0f4c3a]">
                    🔑
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0c241b]">
                      6-Digit OTP Delivery Handshake
                    </h4>
                    <p className="mt-1 text-xs leading-relaxed text-[#5c7a6e]">
                      Carriers cannot fake a delivery. The database will only mark an order complete when your unique OTP is entered.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ecfdf5] text-lg text-[#0f4c3a]">
                    ⭐
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0c241b]">
                      Community Peer Reputation
                    </h4>
                    <p className="mt-1 text-xs leading-relaxed text-[#5c7a6e]">
                      Ratings, completed delivery stats, and student badges keep our network reliable, punctual, and safe.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* OTP Security Visual Graphic */}
            <div className="rounded-3xl border border-[#e2dcd0] bg-[#fbfaf6] p-8 text-center shadow-lg shadow-[#0c241b]/5">
              <span className="text-4xl">🔐</span>
              <h3 className="mt-4 font-display text-xl font-bold text-[#0c241b]">
                How the OTP Handshake Works
              </h3>
              <p className="mt-2 text-xs text-[#5c7a6e]">
                Only release this code when the package is physically in your hands.
              </p>

              <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border-2 border-dashed border-[#0f4c3a]/40 bg-white p-4 shadow-xs">
                <span className="font-mono text-2xl font-extrabold tracking-[0.3em] text-[#0f4c3a]">
                  4 8 2 9 1 0
                </span>
                <span className="rounded-full bg-[#ecfdf5] px-2.5 py-1 text-[11px] font-bold text-[#0f4c3a]">
                  Active OTP
                </span>
              </div>

              <div className="mt-6 rounded-2xl bg-[#ebf5f0] p-4 text-left text-xs text-[#0f4c3a]">
                <p className="font-bold">✓ Carrier enters code on their phone</p>
                <p className="mt-1 text-[#486b5c]">
                  Database verifies cryptographic match instantly ➔ Marks order Delivered ➔ Credits transferred.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs Section */}
      <section id="faqs" className="border-t border-[#e8e4da] bg-[#fbfaf6] py-20">
        <div className="mx-auto max-w-4xl px-5 sm:px-8">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-[#0f4c3a]">
              Got Questions?
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold text-[#081e15]">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="mt-12 space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={faq.q}
                className="overflow-hidden rounded-2xl border border-[#e2dcd0] bg-white transition shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="flex w-full items-center justify-between p-5 text-left text-sm font-bold text-[#0c241b] hover:bg-[#faf8f2]"
                >
                  <span>{faq.q}</span>
                  <span className="text-base text-[#0f4c3a]">
                    {openFaq === idx ? "−" : "+"}
                  </span>
                </button>

                {openFaq === idx && (
                  <div className="border-t border-[#f0ebd9] bg-[#fbfaf6] p-5 text-xs leading-relaxed text-[#4f6e61]">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Big Bottom CTA Banner */}
      <section className="px-5 pb-20 sm:px-8">
        <div className="mx-auto max-w-7xl rounded-[2.5rem] bg-[#0c241b] px-6 py-16 text-center text-white sm:px-12 lg:py-20 shadow-2xl shadow-[#0c241b]/20">
          <span className="text-xs font-bold uppercase tracking-widest text-[#10b981]">
            Start Saving Time Today
          </span>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-bold sm:text-5xl">
            Never make the exhausting gate walk alone again.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-[#bad4c8] sm:text-base">
            Join hundreds of students in your campus who move packages better,
            faster, and together.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href={isLoggedIn ? "/request" : "/signup"}
              className="inline-flex items-center justify-center rounded-xl bg-[#10b981] px-7 py-4 text-sm font-bold text-[#0c241b] shadow-lg transition hover:bg-[#34d399] hover:scale-105 active:scale-95"
            >
              {isLoggedIn ? "Request a Package Now →" : "Get Started (Free 100 Credits) →"}
            </Link>
            <Link
              href="/carry"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-7 py-4 text-sm font-bold text-white transition hover:bg-white/15"
            >
              Browse Gate Pickups 🚴
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e8e4da] bg-white px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-xs font-medium text-[#648074] sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0f4c3a] text-white text-[10px] font-bold">
              U
            </div>
            <span className="font-bold text-[#0c241b]">UniFetch</span>
            <span>• Built for college campuses.</span>
          </div>

          <p>© 2026 UniFetch Inc. Packages move better together.</p>
        </div>
      </footer>
    </main>
  );
}