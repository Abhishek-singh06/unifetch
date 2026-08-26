"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, X, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Logo } from "./components/ui/Logo";
import { Button } from "./components/ui/Button";
import { Card } from "./components/ui/Card";
import { Badge } from "./components/ui/Badge";
import { Alert } from "./components/ui/Alert";
import { EmptyState } from "./components/ui/EmptyState";
import { StatPill } from "./components/ui/StatPill";
import { PageHeader } from "./components/ui/PageHeader";

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
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-[var(--shadow-primary)]">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
          </span>
          <p className="mt-4 text-xs font-semibold tracking-wide text-muted">
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
    <main className="min-h-screen bg-background text-foreground selection:bg-accent/20 selection:text-primary-hover">
      {/* Top Banner Ticker */}
      <div className="overflow-hidden border-b border-border bg-primary py-2 text-xs font-medium text-[#a7d9c4]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            <span className="font-semibold text-white">Campus Live:</span>
            <span className="hidden sm:inline text-[#c4e8d8]">{tickerItems[0]}</span>
            <span className="sm:hidden text-[#c4e8d8]">14 gate packages waiting</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-[#86bba4]">
            <span className="hidden md:inline">🔒 Verified Campus Network</span>
            <span>⚡ Avg Handoff: ~18 min</span>
          </div>
        </div>
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 group" aria-label="UniFetch Home">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-[var(--shadow-primary)] transition group-hover:scale-105 group-hover:bg-primary-hover">
              <LogoMark className="h-5 w-5" />
            </div>
            <div>
              <span className="font-display text-xl font-bold tracking-tight text-primary-hover">UniFetch</span>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted">Campus Peer Network</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-muted md:flex">
            <a href="#how-it-works" className="transition hover:text-primary">How It Works</a>
            <a href="#calculator" className="transition hover:text-primary">Step Calculator</a>
            <a href="#trust" className="transition hover:text-primary">Safety & OTP</a>
            <a href="#faqs" className="transition hover:text-primary">FAQs</a>

            {isLoggedIn && (
              <>
                <Link href="/requests" className="btn-ghost px-3 py-1.5 text-xs">
                  My Requests
                </Link>
                <Link href="/carry" className="btn-ghost px-3 py-1.5 text-xs">Carry Packages</Link>
              </>
            )}
          </nav>

          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 shadow-sm text-xs font-semibold text-primary">
                <span>🪙</span>
                <span>{userCredits} Credits</span>
              </div>

              <div className="flex items-center gap-2">
                <Link href="/request" className="btn-primary px-4 py-2 text-xs">
                  + New Request
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  Sign out
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link href="/login" className="btn-ghost px-4 py-2 text-xs">Sign in</Link>
              <Link href="/signup" className="btn-primary px-5 py-2.5 text-xs">Join Campus →</Link>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-16 md:pb-28">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-accent/15 to-amber/10 blur-[100px] pointer-events-none rounded-full" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
            {/* Left Content */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold text-primary shadow-sm">
                <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                <span>The campus parcel peer-network</span>
              </div>

              <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight text-primary-hover sm:text-5xl lg:text-6xl leading-[1.08]">
                Stop walking 20 minutes to the gate for small packages.
              </h1>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
                Need your Amazon box or Swiggy parcel brought to your hostel?
                Connect with verified peers already heading back from the gate.
                Fast delivery, zero courier hassles, secured with 6-digit OTP.
              </p>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col gap-3.5 sm:flex-row">
                <Link href="/request" className="inline-flex items-center justify-center rounded-xl btn-primary px-6 py-4 text-sm shadow-xl hover:scale-[1.02] active:scale-[0.98]">
                  <span>Request a Gate Pickup</span>
                  <span className="ml-2">📦 →</span>
                </Link>

                <Link href="/carry" className="inline-flex items-center justify-center rounded-xl btn-secondary px-6 py-4 text-sm shadow-xs hover:scale-[1.02] active:scale-[0.98]">
                  <span>Carry on Your Way (Earn 🪙)</span>
                </Link>
              </div>

              {/* Security Pill Indicators */}
              <div className="mt-8 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs font-semibold text-muted">
                <div className="flex items-center gap-1.5">
                  <span className="text-accent">✓</span>
                  <span>100% Verified Student IDs</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-accent">✓</span>
                  <span>Tamper-Proof OTP Handshake</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-accent">✓</span>
                  <span>Zero Delivery Charges</span>
                </div>
              </div>
            </div>

            {/* Right Live Interactive Simulator Card */}
            <div>
              <Card className="p-6 shadow-[var(--shadow-lift)] sm:p-7">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-3 w-3 items-center justify-center rounded-full bg-accent">
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                    </span>
                    <span className="eyebrow">Live Pickup Radar</span>
                  </div>
                  <Badge tone="success" className="bg-accent-tint border-accent/30 text-accent-strong">
                    Verified Peer Matched
                  </Badge>
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
                          ? "btn-primary text-white shadow-xs"
                          : "bg-surface-soft text-muted hover:bg-surface hover:text-primary"
                      }`}
                    >
                      {p.label.split(" ")[0]} {p.label.split(" ")[1]}
                    </button>
                  ))}
                </div>

                {/* Active Simulated Order Details */}
                <div className="mt-6 rounded-2xl border border-border bg-surface-soft p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted">Item Description</p>
                      <h4 className="mt-1 font-display text-lg font-bold text-primary-hover">{activeMock.item}</h4>
                    </div>
                    <Badge tone="warning" className="bg-amber-tint border-amber/30 text-amber">
                      {activeMock.credits} Credits
                    </Badge>
                  </div>

                  {/* Route Visual */}
                  <div className="mt-4 space-y-2 text-xs text-muted">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">A</span>
                      <span><strong>Pickup:</strong> {activeMock.pickup}</span>
                    </div>
                    <div className="ml-2.5 h-3 w-0.5 bg-border" />
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">B</span>
                      <span><strong>Dropoff:</strong> {activeMock.dropoff}</span>
                    </div>
                  </div>

                  {/* Carrier Information */}
                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-bold text-white text-sm">
                        {activeMock.carrier.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-primary-hover">{activeMock.carrier} • {activeMock.branch}</p>
                        <p className="text-[11px] text-muted">{activeMock.rating}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-primary">{activeMock.eta}</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] font-semibold text-muted mb-1.5">
                      <span>Status: {activeMock.status}</span>
                      <span>{activeMock.progress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-border-strong">
                      <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${activeMock.progress}%` }} />
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-xl bg-accent-tint px-4 py-2.5 text-xs text-primary">
                  <span className="font-semibold">🔒 Security code required for handoff</span>
                  <span className="font-mono font-bold tracking-widest bg-surface px-2 py-0.5 rounded border border-accent/30">*** 592</span>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* The Gate Problem: Why Campus Erranding is Broken */}
      <section className="border-t border-border bg-surface py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-accent">The Campus Errand Dilemma</span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-primary-hover sm:text-4xl">
              Why walking to the main gate 4 times a week is absurd.
            </h2>
            <p className="mt-4 text-base text-muted">E-commerce couriers cannot enter campus gates. Students spend hours every semester making the same exhausting round trips.</p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-2">
            {/* The Old Frustrating Way */}
            <Card className="border-danger/30 bg-danger-tint p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-danger/10 text-lg">❌</span>
                <h3 className="font-display text-xl font-bold text-danger">The Old Way (Gate Nightmare)</h3>
              </div>

              <ul className="mt-6 space-y-4 text-sm text-danger">
                <li className="flex items-start gap-3">
                  <span>•</span>
                  <span><strong>Delivery arrives mid-lecture:</strong> Delivery guy calls 3 times while you are presenting or taking notes.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span>•</span>
                  <span><strong>20–30 minute round trip:</strong> Walking across campus in scorching heat, rain, or before dinner.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span>•</span>
                  <span><strong>Parcels piling up at guard desk:</strong> Boxes getting misplaced or buried under dozens of deliveries.</span>
                </li>
              </ul>
            </Card>

            {/* The UniFetch Peer Network Way */}
            <Card className="border-success/30 bg-success-tint p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/10 text-lg">✨</span>
                <h3 className="font-display text-xl font-bold text-success">With UniFetch (Peer Delivery)</h3>
              </div>

              <ul className="mt-6 space-y-4 text-sm text-success">
                <li className="flex items-start gap-3">
                  <span>•</span>
                  <span><strong>Zero detours needed:</strong> A student who was already at the gate cafe grabs your parcel on their walk back.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span>•</span>
                  <span><strong>Delivered to your hostel lobby:</strong> Receive your Amazon parcel or Swiggy meal right where you live.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span>•</span>
                  <span><strong>Win-win credit economy:</strong> Carriers earn points/credits, requesters save 20 minutes of walking.</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Interactive Step & Time Calculator */}
      <section id="calculator" className="border-t border-border bg-surface-soft py-20">
        <div className="mx-auto max-w-4xl px-5 sm:px-8 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Interactive Campus Savings Calculator</span>
          <h2 className="mt-3 font-display text-3xl font-bold text-primary-hover sm:text-4xl">
            How much walking will UniFetch save you this semester?
          </h2>

          <Card className="mt-10 p-8 shadow-[var(--shadow-card)]">
            <label htmlFor="orders" className="block text-sm font-bold text-muted">How many parcels / food deliveries do you get per week?</label>

            {/* Slider / Preset Buttons */}
            <div className="mt-6 flex justify-center gap-3">
              {[1, 2, 3, 5, 8].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setOrdersPerWeek(num)}
                  className={`h-12 w-14 rounded-2xl text-sm font-bold transition ${
                    ordersPerWeek === num
                      ? "btn-primary shadow-md scale-105"
                      : "btn-secondary"
                  }`}
                >
                  {num}/wk
                </button>
              ))}
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-3 border-t border-border pt-8">
              <Card className="bg-accent-tint border-success/30 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-success">Steps Avoided</p>
                <p className="mt-2 font-display text-3xl font-extrabold text-primary">~{stepsSaved.toLocaleString()}</p>
                <p className="mt-1 text-xs text-muted">Every single semester</p>
              </Card>

              <Card className="bg-accent-tint border-success/30 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-success">Study & Free Time Saved</p>
                <p className="mt-2 font-display text-3xl font-extrabold text-primary">~{hoursSaved} Hours</p>
                <p className="mt-1 text-xs text-muted">No gate walking in heat/rain</p>
              </Card>

              <Card className="bg-amber-tint border-amber/30 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-amber">Carrier Earnings Potential</p>
                <p className="mt-2 font-display text-3xl font-extrabold text-amber">+{ordersPerWeek * 30 * 16} 🪙</p>
                <p className="mt-1 text-xs text-amber">If you carry for friends on walks</p>
              </Card>
            </div>

            <div className="mt-8">
              <Link href="/signup" className="inline-flex items-center justify-center rounded-xl btn-primary px-7 py-3.5 text-sm shadow-lg">
                Claim Your 100 Free Starter Credits →
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* How It Works (3 Steps) */}
      <section id="how-it-works" className="border-t border-border bg-primary-hover py-20 text-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-xl">
            <span className="text-xs font-bold uppercase tracking-widest text-accent">Simple 3-Step Flow</span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              How packages move effortlessly across your campus.
            </h2>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <Card className="border-white/15 bg-white/[0.05] p-7 transition hover:bg-white/[0.08]">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent font-display text-lg font-bold text-primary-hover">01</span>
              <h3 className="mt-6 font-display text-xl font-bold">1. Post in 10 Seconds</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#bad4c8]">
                Type what package is waiting at the gate (Amazon parcel, Swiggy, stationery) and select your hostel block.
              </p>
            </Card>

            <Card className="border-white/15 bg-white/[0.05] p-7 transition hover:bg-white/[0.08]">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent font-display text-lg font-bold text-primary-hover">02</span>
              <h3 className="mt-6 font-display text-xl font-bold">2. A Nearby Student Claims It</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#bad4c8]">
                A verified peer who is already at the main gate claims your delivery and picks it up from the security counter.
              </p>
            </Card>

            <Card className="border-white/15 bg-white/[0.05] p-7 transition hover:bg-white/[0.08]">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent font-display text-lg font-bold text-primary-hover">03</span>
              <h3 className="mt-6 font-display text-xl font-bold">3. OTP Secured Handoff</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#bad4c8]">
                They bring it straight to your hostel lobby. You check your parcel, give them your unique 6-digit OTP, and they receive credits.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Safety & Trust Section */}
      <section id="trust" className="border-t border-border bg-surface py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-accent">Safety First Architecture</span>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-primary-hover sm:text-4xl">
                Built strictly for students. Protected by OTP cryptography.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted">
                We know your packages contain expensive electronics, books, and personal items. UniFetch was engineered around verifiable campus trust.
              </p>

              <div className="mt-8 space-y-5">
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-tint text-lg text-primary">🪪</div>
                  <div>
                    <h4 className="font-bold text-primary-hover">Strict Student ID Verification</h4>
                    <p className="mt-1 text-xs leading-relaxed text-muted">Every student must submit a verified college ID card before they can request or carry a single parcel.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-tint text-lg text-primary">🔑</div>
                  <div>
                    <h4 className="font-bold text-primary-hover">6-Digit OTP Delivery Handshake</h4>
                    <p className="mt-1 text-xs leading-relaxed text-muted">Carriers cannot fake a delivery. The database will only mark an order complete when your unique OTP is entered.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-tint text-lg text-primary">⭐</div>
                  <div>
                    <h4 className="font-bold text-primary-hover">Community Peer Reputation</h4>
                    <p className="mt-1 text-xs leading-relaxed text-muted">Ratings, completed delivery stats, and student badges keep our network reliable, punctual, and safe.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* OTP Security Visual Graphic */}
            <Card className="bg-surface-soft p-8 text-center shadow-[var(--shadow-card)]">
              <span className="text-4xl">🔐</span>
              <h3 className="mt-4 font-display text-xl font-bold text-primary-hover">How the OTP Handshake Works</h3>
              <p className="mt-2 text-xs text-muted">Only release this code when the package is physically in your hands.</p>

              <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border-2 border-dashed border-primary/40 bg-surface p-4 shadow-xs">
                <span className="font-mono text-2xl font-extrabold tracking-[0.3em] text-primary">4 8 2 9 1 0</span>
                <Badge tone="success" className="bg-accent-tint border-accent/30 text-accent-strong">Active OTP</Badge>
              </div>

              <div className="mt-6 rounded-2xl bg-accent-tint p-4 text-left text-xs text-primary">
                <p className="font-bold">✓ Carrier enters code on their phone</p>
                <p className="mt-1 text-muted">Database verifies cryptographic match instantly ➔ Marks order Delivered ➔ Credits transferred.</p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQs Section */}
      <section id="faqs" className="border-t border-border bg-surface-soft py-20">
        <div className="mx-auto max-w-4xl px-5 sm:px-8">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Got Questions?</span>
            <h2 className="mt-3 font-display text-3xl font-bold text-primary-hover">Frequently Asked Questions</h2>
          </div>

          <div className="mt-12 space-y-4">
            {faqs.map((faq, idx) => (
              <Card key={faq.q} className="overflow-hidden transition shadow-xs">
                <button type="button" onClick={() => setOpenFaq(openFaq === idx ? null : idx)} className="flex w-full items-center justify-between p-5 text-left text-sm font-bold text-primary-hover hover:bg-surface-soft">
                  <span>{faq.q}</span>
                  <span className="text-base text-primary">{openFaq === idx ? "−" : "+"}</span>
                </button>

                {openFaq === idx && (
                  <div className="border-t border-border bg-surface-soft p-5 text-xs leading-relaxed text-muted">{faq.a}</div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Big Bottom CTA Banner */}
      <section className="px-5 pb-20 sm:px-8">
        <div className="mx-auto max-w-7xl rounded-[2.5rem] bg-primary-hover px-6 py-16 text-center text-white sm:px-12 lg:py-20 shadow-[var(--shadow-primary)]">
          <span className="text-xs font-bold uppercase tracking-widest text-accent">Start Saving Time Today</span>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-bold sm:text-5xl">
            Never make the exhausting gate walk alone again.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-[#bad4c8] sm:text-base">
            Join hundreds of students in your campus who move packages better, faster, and together.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={isLoggedIn ? "/request" : "/signup"} className="inline-flex items-center justify-center rounded-xl bg-accent px-7 py-4 text-sm font-bold text-primary-hover shadow-lg transition hover:bg-accent-strong hover:scale-105 active:scale-95">
              {isLoggedIn ? "Request a Package Now →" : "Get Started (Free 100 Credits) →"}
            </Link>
            <Link href="/carry" className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-7 py-4 text-sm font-bold text-white transition hover:bg-white/15">
              Browse Gate Pickups 🚴
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-xs font-medium text-muted sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-white text-[10px] font-bold">U</div>
            <span className="font-bold text-primary-hover">UniFetch</span>
            <span>• Built for college campuses.</span>
          </div>
          <p>© 2026 UniFetch Inc. Packages move better together.</p>
        </div>
      </footer>
    </main>
  );
}

function LogoMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" />
      <path d="m4.5 7.7 7.5 4.2 7.5-4.2M12 12v9" />
    </svg>
  );
}