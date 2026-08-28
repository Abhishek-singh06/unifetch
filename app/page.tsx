"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  X,
  Check,
  Shield,
  Award,
  HelpCircle,
  Package,
  MapPin,
  Navigation,
  Clock,
  ThumbsUp,
  User,
  Percent,
  MessageSquare,
  Truck
} from "lucide-react";
import { useSpring, useTransition, animated, config, useTrail } from "@react-spring/web";
import { supabase } from "@/lib/supabase/client";
import { LogoMark } from "./components/ui/Logo";
import { Button } from "./components/ui/Button";
import { Card } from "./components/ui/Card";

const tickerItems = [
  "⚡ Rahul accepted a package to Library Gate",
  "🪙 Sneha delivered to Hostel C",
  "🛡️ Aman is on the way to Main Gate",
  "📦 Food parcel delivered to Hostel D2 in 12 mins",
  "⭐ Campus Trust Rating: 4.95 / 5.0 across 1,420+ deliveries"
];

const mockPreviews = [
  {
    id: "amazon",
    label: "📦 Amazon Package",
    item: "AirPods Pro & Books",
    pickup: "Main Gate • Security Desk",
    dropoff: "Hostel C • Room 214",
    status: "Carrier En Route",
    carrier: "Devansh R.",
    branch: "ECE '26",
    rating: "4.9 ★ (34 runs)",
    eta: "Arriving in 6 mins",
    credits: "+30",
    progress: 75,
    pathCoords: "M 30,130 C 50,80 120,80 140,110 C 160,140 220,150 250,90",
    dotACoords: { x: 30, y: 130 },
    dotBCoords: { x: 250, y: 90 },
    dotCarrierCoords: { x: 170, y: 135 }
  },
  {
    id: "food",
    label: "🍔 Food & Drinks",
    item: "Subway Meal + Cold Coffee",
    pickup: "North Turnstile Gate",
    dropoff: "Hostel A",
    status: "Picked Up",
    carrier: "Meera S.",
    branch: "CS '25",
    rating: "5.0 ★ (51 runs)",
    eta: "Arriving in 9 mins",
    credits: "+40",
    progress: 50,
    pathCoords: "M 40,80 C 100,70 120,160 170,120 C 200,90 230,130 260,140",
    dotACoords: { x: 40, y: 80 },
    dotBCoords: { x: 260, y: 140 },
    dotCarrierCoords: { x: 150, y: 135 }
  },
  {
    id: "prints",
    label: "📄 Documents / Prints",
    item: "Project Report (Spiral)",
    pickup: "Campus Post Office",
    dropoff: "Science Block • Lab 402",
    status: "Matched with Carrier",
    carrier: "Karan T.",
    branch: "Mech '26",
    rating: "4.8 ★ (19 runs)",
    eta: "Pickup in 4 mins",
    credits: "+25",
    progress: 20,
    pathCoords: "M 50,140 C 90,120 140,150 180,90 C 210,50 230,80 250,110",
    dotACoords: { x: 50, y: 140 },
    dotBCoords: { x: 250, y: 110 },
    dotCarrierCoords: { x: 90, y: 120 }
  }
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Real stats state
  const [realStats, setRealStats] = useState({
    activeStudents: "2K+",
    deliveredPackages: "850+",
    successRate: "99.2%",
    support: "24/7"
  });

  // Dynamic Ticker
  const [tickerList, setTickerList] = useState(tickerItems);

  useEffect(() => {
    async function loadRealStatsAndActivity() {
      try {
        // Query active students count
        const { count: studentCount } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true });

        // Query total delivered requests
        const { count: deliveredCount } = await supabase
          .from("package_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "delivered");

        // Format and set stats
        setRealStats({
          activeStudents: studentCount && studentCount > 0 ? `${studentCount}+` : "2K+",
          deliveredPackages: deliveredCount && deliveredCount > 0 ? `${deliveredCount}+` : "850+",
          successRate: "99.2%",
          support: "24/7"
        });

        // Query latest 5 deliveries/requests for activity feed
        const { data: recentRequests } = await supabase
          .from("package_requests")
          .select("package_description, pickup_location, delivery_location, status, created_at")
          .order("created_at", { ascending: false })
          .limit(5);

        if (recentRequests && recentRequests.length > 0) {
          const formatted = recentRequests.map((req) => {
            const desc = req.package_description || "Package";
            const statusMap: Record<string, string> = {
              pending: `pickup posted at ${req.pickup_location}`,
              accepted: `is on its way from ${req.pickup_location}`,
              delivered: `delivered to ${req.delivery_location}`
            };
            return `📦 ${desc} ${statusMap[req.status] || "delivery updated"}`;
          });
          setTickerList(formatted);
        }
      } catch (err) {
        console.error("Error loading home page stats:", err);
      }
    }
    loadRealStatsAndActivity();
  }, []);

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

  // React Spring transitions / springs
  const heroFadeSpring = useSpring({
    from: { opacity: 0, transform: "translate3d(0, 30px, 0)" },
    to: { opacity: 1, transform: "translate3d(0, 0, 0)" },
    config: config.gentle,
  });

  const mobileMenuTransition = useTransition(mobileMenuOpen, {
    from: { opacity: 0, height: 0, transform: "translate3d(0, -10px, 0)" },
    enter: { opacity: 1, height: "auto", transform: "translate3d(0, 0, 0)" },
    leave: { opacity: 0, height: 0, transform: "translate3d(0, -10px, 0)" },
    config: { tension: 300, friction: 23 },
  });

  const activeMock = mockPreviews[selectedPreview];
  const radarTransition = useTransition(selectedPreview, {
    key: selectedPreview,
    from: { opacity: 0, transform: "translate3d(15px, 0, 0)" },
    enter: { opacity: 1, transform: "translate3d(0, 0, 0)" },
    leave: { opacity: 0, transform: "translate3d(-15px, 0, 0)" },
    exitBeforeEnter: true,
    config: { tension: 280, friction: 22 },
  });

  const progressBarSpring = useSpring({
    width: `${activeMock.progress}%`,
    config: { tension: 120, friction: 18 },
  });

  // How it works trail animation on viewport scroll simulation
  const stepsTrail = useTrail(3, {
    from: { opacity: 0, transform: "translate3d(0, 40px, 0)" },
    to: { opacity: 1, transform: "translate3d(0, 0, 0)" },
    config: config.slow,
  });

  if (isCheckingUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05070b]">
        <div className="text-center">
          <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-glow animate-bounce mx-auto">
            <svg className="h-6 w-6 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
          </span>
          <p className="mt-5 text-[10px] font-extrabold tracking-widest text-[#cbd5e1] font-display uppercase">
            UniFetch Peer Network
          </p>
        </div>
      </main>
    );
  }

  const stepsSaved = ordersPerWeek * 1800 * 16;
  const hoursSaved = Math.round((ordersPerWeek * 22 * 16) / 60);

  return (
    <main className="min-h-screen bg-[#05070b] text-[#ffffff] selection:bg-[#2563eb]/30 selection:text-white grid-bg relative overflow-x-hidden">
      {/* Background Atmosphere Glows */}
      <div className="absolute top-[-10%] left-[10%] w-[500px] h-[500px] rounded-full bg-[#2563eb]/8 blur-[130px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#3b82f6]/6 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[15%] left-[5%] w-[450px] h-[450px] rounded-full bg-[#2563eb]/6 blur-[120px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-[rgba(255,255,255,0.08)] bg-[#05070b]/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3.5 group" aria-label="UniFetch Home">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white border border-primary/20 shadow-primary transition-transform duration-200 group-hover:scale-105">
              <LogoMark className="h-5.5 w-5.5" />
            </div>
            <div>
              <span className="font-display text-xl font-bold tracking-tight text-white block leading-none">UniFetch</span>
              <span className="block text-[8px] font-extrabold uppercase tracking-widest text-[#2563eb] mt-1.5">Campus Logistics</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-[11px] font-bold uppercase tracking-wider text-[#cbd5e1] md:flex">
            <a href="#how-it-works" className="transition hover:text-white">How It Works</a>
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#calculator" className="transition hover:text-white">For Campus</a>
            <a href="#faqs" className="transition hover:text-white">FAQs</a>

            {isLoggedIn && (
              <>
                <Link href="/requests" className="transition hover:text-white">My Requests</Link>
                <Link href="/carry" className="transition hover:text-white">Carry Packages</Link>
              </>
            )}
          </nav>

          <div className="flex items-center gap-3.5">
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-surface px-4 py-2 text-xs font-bold text-white shadow-sm">
                  <span>🪙</span>
                  <span>{userCredits} Credits</span>
                </div>
                <Link href="/request" className="neo-btn-primary px-5 py-2.5 text-[11px] uppercase tracking-wider">
                  + New Request
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden sm:inline-flex text-[#cbd5e1] hover:text-white">
                  Sign out
                </Button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-3">
                <Link href="/login" className="btn-ghost px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#cbd5e1] hover:text-white">Sign in</Link>
                <Link href="/signup" className="neo-btn-primary px-5 py-2.5 text-[11px] uppercase tracking-wider shadow-glow">
                  Get Started
                </Link>
              </div>
            )}

            {/* Hamburger Button for mobile */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(255,255,255,0.08)] bg-surface text-white md:hidden shadow-sm"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5.5 w-5.5" /> : <Menu className="h-5.5 w-5.5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuTransition((style, isOpen) =>
          isOpen ? (
            <animated.div
              style={style}
              className="border-b border-[rgba(255,255,255,0.08)] bg-[#05070b]/95 backdrop-blur-md px-6 py-6 md:hidden overflow-hidden"
            >
              <nav className="flex flex-col gap-4 text-xs font-bold uppercase tracking-wider text-[#cbd5e1]">
                <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="hover:text-white py-2 border-b border-[rgba(255,255,255,0.04)]">How It Works</a>
                <a href="#features" onClick={() => setMobileMenuOpen(false)} className="hover:text-white py-2 border-b border-[rgba(255,255,255,0.04)]">Features</a>
                <a href="#calculator" onClick={() => setMobileMenuOpen(false)} className="hover:text-white py-2 border-b border-[rgba(255,255,255,0.04)]">For Campus</a>
                <a href="#faqs" onClick={() => setMobileMenuOpen(false)} className="hover:text-white py-2 border-b border-[rgba(255,255,255,0.04)]">FAQs</a>
                {isLoggedIn ? (
                  <>
                    <Link href="/requests" onClick={() => setMobileMenuOpen(false)} className="hover:text-white py-2 border-b border-[rgba(255,255,255,0.04)]">My Requests</Link>
                    <Link href="/carry" onClick={() => setMobileMenuOpen(false)} className="hover:text-white py-2 border-b border-[rgba(255,255,255,0.04)]">Carry Packages</Link>
                    <div className="flex items-center gap-2 py-2 text-xs font-bold text-white">
                      <span>🪙 Balance:</span>
                      <span>{userCredits} Credits</span>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="w-full mt-2 border-[rgba(255,255,255,0.08)]">
                      Sign out
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col gap-2.5 pt-2">
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="neo-btn-secondary py-3 text-center text-xs border-[rgba(255,255,255,0.08)]">
                      Sign in
                    </Link>
                    <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="neo-btn-primary py-3 text-center text-xs">
                      Get Started
                    </Link>
                  </div>
                )}
              </nav>
            </animated.div>
          ) : null
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Hero Left */}
            <animated.div style={heroFadeSpring} className="lg:col-span-7 space-y-6">
              {/* Green status badge */}
              <div className="inline-flex items-center gap-2.5 rounded-full border border-[#22c55e]/20 bg-[#22c55e]/6 px-4 py-2 text-[10px] font-extrabold uppercase tracking-widest text-[#22c55e] shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22c55e]" />
                </span>
                <span>Trusted by 2000+ students across campus</span>
              </div>

              {/* Giant Headline */}
              <div className="space-y-2">
                <h1 className="font-display text-5xl font-extrabold tracking-tighter text-white sm:text-6xl xl:text-[5.5rem] leading-[1.03]">
                  Packages move.
                </h1>
                <h1 className="font-display text-5xl font-extrabold tracking-tighter text-[#2563eb] sm:text-6xl xl:text-[5.5rem] leading-[1.03] drop-shadow-[0_0_25px_rgba(37,99,235,0.25)]">
                  You focus.
                </h1>
              </div>

              {/* Description */}
              <p className="max-w-xl text-base leading-relaxed text-[#cbd5e1] font-normal sm:text-lg">
                The fastest and safest way to send, carry, and receive packages on campus.
              </p>

              {/* Choice Section: What do you need? */}
              <div className="pt-4 space-y-6">
                <h3 className="text-xs font-bold text-[#2563eb] uppercase tracking-wider">
                  What do you need?
                </h3>
                <div className="grid gap-6 sm:grid-cols-2">
                  {/* Option 1: Within College */}
                  <div className="neo-card flex flex-col justify-between p-6 space-y-4 border border-[rgba(255,255,255,0.08)] bg-[#080d16]/50 rounded-2xl hover:border-[#2563eb]/30 transition-all duration-300">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🏫</span>
                        <h4 className="font-display text-lg font-bold text-white">Within College</h4>
                      </div>
                      <p className="text-xs text-[#cbd5e1] leading-relaxed">
                        Need something carried or delivered inside college? Request a student to help using UniFetch Credits.
                      </p>
                      <ul className="text-[10px] text-primary/80 font-bold space-y-1 pt-2 uppercase tracking-wider">
                        <li>• 50 Credits to request</li>
                        <li>• +35 Credits for completing delivery</li>
                        <li>• Local Dorm Carry</li>
                      </ul>
                    </div>
                    <Link
                      href={isLoggedIn ? "/requests" : "/signup"}
                      className="neo-btn-primary w-full py-3 text-center text-xs font-extrabold uppercase tracking-widest shadow-glow inline-block"
                    >
                      Within College
                    </Link>
                  </div>

                  {/* Option 2: Outside Campus */}
                  <div className="neo-card flex flex-col justify-between p-6 space-y-4 border border-[rgba(255,255,255,0.08)] bg-[#080d16]/50 rounded-2xl hover:border-[#2563eb]/30 transition-all duration-300">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🚗</span>
                        <h4 className="font-display text-lg font-bold text-white">Outside Campus</h4>
                      </div>
                      <p className="text-xs text-[#cbd5e1] leading-relaxed">
                        Going outside campus or need something brought from Chennai or another location? Connect with another student and agree on the price directly.
                      </p>
                      <ul className="text-[10px] text-primary/80 font-bold space-y-1 pt-2 uppercase tracking-wider">
                        <li>• Real Money • Student to Student</li>
                        <li>• Buy/Return/Repair/Pickup</li>
                        <li>• Direct UPI QR Transfers</li>
                      </ul>
                    </div>
                    <Link
                      href={isLoggedIn ? "/outside/browse" : "/signup"}
                      className="neo-btn-secondary w-full py-3 text-center text-xs font-extrabold uppercase tracking-widest border-[rgba(255,255,255,0.08)] bg-transparent hover:bg-white/5 inline-block"
                    >
                      Outside Campus
                    </Link>
                  </div>
                </div>
              </div>
            </animated.div>

            {/* Hero Right: 3D Illustration */}
            <div className="lg:col-span-5 flex justify-center relative">
              {/* Blur backdrop behind illustration */}
              <div className="absolute top-[20%] left-[20%] w-[250px] h-[250px] rounded-full bg-[#2563eb]/20 blur-[80px] pointer-events-none" />
              <HeroIllustration />
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="relative py-12 border-t border-[rgba(255,255,255,0.08)] bg-[#05070b]/60">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={<User className="h-5 w-5 text-[#2563eb]" />} number={realStats.activeStudents} label="Active Students" />
            <StatCard icon={<Package className="h-5 w-5 text-[#2563eb]" />} number={realStats.deliveredPackages} label="Delivered Packages" />
            <StatCard icon={<Percent className="h-5 w-5 text-[#2563eb]" />} number={realStats.successRate} label="Success Rate" />
            <StatCard icon={<Clock className="h-5 w-5 text-[#2563eb]" />} number={realStats.support} label="Support" />
          </div>
        </div>
      </section>

      {/* How UniFetch Works */}
      <section id="how-it-works" className="relative py-24 border-t border-[rgba(255,255,255,0.08)]">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
          <div className="text-center space-y-3">
            <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl text-white">
              How UniFetch Works
            </h2>
            <p className="text-xs font-bold uppercase tracking-widest text-[#2563eb] font-display">
              Simple. Fast. Reliable.
            </p>
          </div>

          <div className="mt-16 grid gap-10 lg:grid-cols-3 relative">
            {/* Connecting line for Desktop layout */}
            <div className="hidden lg:block absolute top-[60px] left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-[rgba(37,99,235,0.25)] to-transparent z-0" />

            {stepsTrail.map((style, idx) => {
              if (idx === 0) {
                return (
                  <animated.div style={style} key={idx} className="relative z-10 flex flex-col items-center text-center p-6 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-[2rem] hover:border-[#2563eb]/20 transition-colors">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#05070b] border border-[#2563eb]/30 text-white font-display text-sm font-bold shadow-glow mb-6">
                      1
                    </div>
                    <div className="h-10 w-10 flex items-center justify-center bg-[#2563eb]/10 rounded-xl mb-4 text-[#2563eb]">
                      <Package className="h-5 w-5" />
                    </div>
                    <h3 className="font-display text-lg font-bold text-white">Create Request</h3>
                    <p className="mt-3 text-xs leading-relaxed text-[#cbd5e1] font-medium">
                      Add package details, pick-up and drop locations.
                    </p>
                  </animated.div>
                );
              }
              if (idx === 1) {
                return (
                  <animated.div style={style} key={idx} className="relative z-10 flex flex-col items-center text-center p-6 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-[2rem] hover:border-[#2563eb]/20 transition-colors">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#05070b] border border-[#2563eb]/30 text-white font-display text-sm font-bold shadow-glow mb-6">
                      2
                    </div>
                    <div className="h-10 w-10 flex items-center justify-center bg-[#2563eb]/10 rounded-xl mb-4 text-[#2563eb]">
                      <Truck className="h-5 w-5" />
                    </div>
                    <h3 className="font-display text-lg font-bold text-white">Someone Carries</h3>
                    <p className="mt-3 text-xs leading-relaxed text-[#cbd5e1] font-medium">
                      A trusted student picks it up on their way.
                    </p>
                  </animated.div>
                );
              }
              return (
                <animated.div style={style} key={idx} className="relative z-10 flex flex-col items-center text-center p-6 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-[2rem] hover:border-[#2563eb]/20 transition-colors">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#05070b] border border-[#2563eb]/30 text-white font-display text-sm font-bold shadow-glow mb-6">
                    3
                  </div>
                  <div className="h-10 w-10 flex items-center justify-center bg-[#2563eb]/10 rounded-xl mb-4 text-[#2563eb]">
                    <ThumbsUp className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-white">You Receive</h3>
                  <p className="mt-3 text-xs leading-relaxed text-[#cbd5e1] font-medium">
                    Get your package safely at your destination.
                  </p>
                </animated.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Live Activity Ticker */}
      <section className="border-y border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.01)] py-4 overflow-hidden relative">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Label */}
          <div className="flex items-center gap-2.5 shrink-0 bg-[#05070b] border border-[rgba(255,255,255,0.08)] px-4 py-1.5 rounded-full text-xs font-bold text-white relative z-10">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22c55e]" />
            </span>
            <span className="uppercase tracking-widest font-display text-[9px] text-[#cbd5e1]">Live Activity</span>
          </div>

          {/* Marquee Ticker */}
          <div className="flex-1 w-full overflow-hidden relative select-none">
            <div className="flex animate-marquee gap-8">
              {tickerList.concat(tickerList).map((text, idx) => (
                <div key={idx} className="flex items-center gap-2 font-display text-xs font-bold text-[#cbd5e1] uppercase tracking-wider shrink-0">
                  <span>{text}</span>
                  <span className="h-1 w-1 bg-[#2563eb] rounded-full mx-4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
          <div className="text-center space-y-3 mb-16">
            <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl text-white">
              Everything you need, built for campus
            </h2>
            <p className="max-w-xl mx-auto text-sm text-[#cbd5e1] font-semibold">
              Move parcels security-verified, earn rewards, and secure drop-offs without gate delays.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<Shield className="h-6 w-6 text-[#2563eb]" />}
              title="Secure & Verified"
              description="All users are verified with active student credentials for a safe experience."
            />
            <FeatureCard
              icon={<Navigation className="h-6 w-6 text-[#2563eb]" />}
              title="Live Tracking"
              description="Real-time status updates and routing tracking for complete peace of mind."
            />
            <FeatureCard
              icon={<Award className="h-6 w-6 text-[#2563eb]" />}
              title="Earn Rewards"
              description="Earn UniCredits on walks you're already taking and spend them on free fetches."
            />
            <FeatureCard
              icon={<MessageSquare className="h-6 w-6 text-[#2563eb]" />}
              title="24/7 Support"
              description="We're here to help anytime, anywhere to resolve any delivery issues."
            />
          </div>
        </div>
      </section>

      {/* Product Showcase / Why Choose UniFetch */}
      <section className="relative py-24 border-t border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.01)]">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-16 lg:grid-cols-12 lg:items-center">
            
            {/* Showcase Left: Interactive phone frame & radar preview */}
            <div className="lg:col-span-6 flex flex-col items-center">
              {/* Category tabs */}
              <div className="flex gap-2.5 p-1 rounded-2xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] mb-6 w-full max-w-[420px]">
                {mockPreviews.map((mock, idx) => (
                  <button
                    key={mock.id}
                    onClick={() => setSelectedPreview(idx)}
                    type="button"
                    className={`flex-1 text-center py-2.5 rounded-xl text-[10px] uppercase font-bold tracking-wider transition-all duration-200 ${
                      selectedPreview === idx
                        ? "bg-[#2563eb] text-white shadow-glow"
                        : "text-[#cbd5e1] hover:text-white"
                    }`}
                  >
                    {mock.label.split(" ")[1]}
                  </button>
                ))}
              </div>

              {/* Glowing Mobile Frame Mock-up */}
              <div className="relative w-full max-w-[340px] aspect-[9/18.5] rounded-[3rem] border-8 border-[#1e293b] bg-[#05070b] shadow-2xl overflow-hidden p-4">
                {/* Speaker Grill */}
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-4 rounded-full bg-[#1e293b] flex items-center justify-center gap-1 z-20">
                  <div className="w-10 h-1 bg-black rounded-full" />
                </div>

                {/* Simulated Screen */}
                <div className="relative h-full w-full rounded-[2rem] bg-[#05070b] overflow-hidden flex flex-col justify-between pt-6">
                  {radarTransition((style, index) => {
                    const preview = mockPreviews[index];
                    return (
                      <animated.div style={style} className="absolute inset-0 p-4 flex flex-col justify-between">
                        {/* Map Header */}
                        <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] pb-3">
                          <div className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
                            <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#cbd5e1]">Live tracking</span>
                          </div>
                          <span className="text-[10px] font-bold text-[#2563eb]">{preview.credits} credits</span>
                        </div>

                        {/* Interactive path visual */}
                        <div className="flex-1 my-4 bg-[#0a0f18] rounded-2xl relative border border-[rgba(255,255,255,0.04)] overflow-hidden">
                          {/* Dotted Map background */}
                          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1.5px,transparent_1.5px)] bg-[size:12px_12px]" />
                          
                          {/* Map path SVG */}
                          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 200">
                            <path d={preview.pathCoords} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeDasharray="4 4" opacity="0.8" />
                            
                            {/* Point A (Pickup) */}
                            <circle cx={preview.dotACoords.x} cy={preview.dotACoords.y} r="6" fill="#2563eb" className="animate-pulse" />
                            <circle cx={preview.dotACoords.x} cy={preview.dotACoords.y} r="2" fill="#ffffff" />
                            
                            {/* Point B (Dropoff) */}
                            <circle cx={preview.dotBCoords.x} cy={preview.dotBCoords.y} r="6" fill="#22c55e" className="animate-pulse" />
                            <circle cx={preview.dotBCoords.x} cy={preview.dotBCoords.y} r="2" fill="#ffffff" />

                            {/* Carrier dot moving */}
                            <circle cx={preview.dotCarrierCoords.x} cy={preview.dotCarrierCoords.y} r="7" fill="#3b82f6" />
                            <circle cx={preview.dotCarrierCoords.x} cy={preview.dotCarrierCoords.y} r="3.5" fill="#ffffff" />
                          </svg>

                          <div className="absolute bottom-2.5 left-2.5 right-2.5 p-2.5 rounded-xl bg-[rgba(5,7,11,0.9)] border border-[rgba(255,255,255,0.06)] text-[9px] space-y-1">
                            <p className="font-bold text-white">From: {preview.pickup}</p>
                            <p className="font-semibold text-[#cbd5e1]">To: {preview.dropoff}</p>
                          </div>
                        </div>

                        {/* Tracker ETA Details Card */}
                        <div className="p-3 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-2xl space-y-2">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-white">{preview.carrier} ({preview.branch})</span>
                            <span className="font-extrabold text-[#2563eb]">{preview.eta}</span>
                          </div>
                          
                          <div className="h-1.5 w-full bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden">
                            <animated.div style={progressBarSpring} className="h-full bg-[#2563eb]" />
                          </div>

                          <div className="flex items-center justify-between text-[8px] font-extrabold text-[#cbd5e1] uppercase">
                            <span>Status: {preview.status}</span>
                            <span>{preview.progress}%</span>
                          </div>
                        </div>

                        {/* OTP Cryptographic handshake code */}
                        <div className="mt-3 py-2 px-3 border border-dashed border-[#2563eb]/30 bg-[#2563eb]/6 rounded-xl flex items-center justify-between text-[10px]">
                          <span className="text-[#cbd5e1] font-semibold">Verification Handshake</span>
                          <span className="font-mono tracking-widest text-[#2563eb] font-bold">*** 421</span>
                        </div>
                      </animated.div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Showcase Right: Why Choose UniFetch + Semester Savings Calculator */}
            <div className="lg:col-span-6 space-y-8">
              <div className="space-y-4">
                <h2 className="font-display text-4xl font-extrabold tracking-tight text-white">
                  Why students love UniFetch
                </h2>
                
                <div className="grid gap-4.5 pt-2">
                  <BulletCheck text="Fast delivery by fellow students walking identical routes." />
                  <BulletCheck text="Affordable and transparent pricing using credits." />
                  <BulletCheck text="Safe, reliable, and secured by OTP handshake confirmations." />
                  <BulletCheck text="Built for students, by students, to save time." />
                </div>
              </div>

              {/* Savings Calculator integrated directly inside */}
              <div className="p-6 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-[2rem] space-y-5">
                <div>
                  <h4 className="font-display text-md font-bold text-white">Semester Savings Calculator</h4>
                  <p className="text-[11px] text-[#cbd5e1] mt-1">Select the number of packages or meals you get at the gate weekly:</p>
                </div>

                <div className="flex gap-2.5">
                  {[1, 2, 3, 5, 8].map((val) => (
                    <button
                      key={val}
                      onClick={() => setOrdersPerWeek(val)}
                      type="button"
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                        ordersPerWeek === val
                          ? "bg-[#2563eb] text-white"
                          : "bg-transparent text-[#cbd5e1] border border-[rgba(255,255,255,0.08)] hover:border-[#2563eb]/45"
                      }`}
                    >
                      {val} / wk
                    </button>
                  ))}
                </div>

                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 pt-2">
                  <div className="p-3.5 bg-[#2563eb]/6 border border-[#2563eb]/15 rounded-2xl text-center">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#2563eb]">Steps Saved</p>
                    <p className="text-xl font-extrabold text-white mt-1">~{stepsSaved.toLocaleString()}</p>
                  </div>
                  <div className="p-3.5 bg-[#2563eb]/6 border border-[#2563eb]/15 rounded-2xl text-center">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#2563eb]">Time Saved</p>
                    <p className="text-xl font-extrabold text-white mt-1">~{hoursSaved} Hours</p>
                  </div>
                  <div className="p-3.5 bg-[#eab308]/6 border border-[#eab308]/15 rounded-2xl text-center col-span-2 sm:col-span-1">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#eab308]">Credits Earned</p>
                    <p className="text-xl font-extrabold text-[#eab308] mt-1">+{ordersPerWeek * 30 * 16} 🪙</p>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <Link href={isLoggedIn ? "/request" : "/signup"} className="neo-btn-primary px-8 py-4 text-xs font-extrabold uppercase tracking-widest shadow-glow">
                  Join UniFetch Today
                </Link>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* FAQs Section */}
      <section id="faqs" className="relative py-24 border-t border-[rgba(255,255,255,0.08)]">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          <div className="text-center space-y-3 mb-16">
            <h2 className="font-display text-4xl font-extrabold text-white">Frequently Asked Questions</h2>
            <p className="text-xs font-bold uppercase tracking-widest text-[#2563eb]">Help center</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <FaqAccordionItem
                key={faq.q}
                q={faq.q}
                a={faq.a}
                isOpen={openFaq === idx}
                onToggle={() => setOpenFaq(openFaq === idx ? null : idx)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="px-6 py-16 sm:px-8">
        <div className="mx-auto max-w-7xl rounded-[3rem] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/25 via-[#0b0f19]/80 to-[#05070b]/90 border border-[rgba(255,255,255,0.08)] px-8 py-16 text-center text-white sm:px-16 lg:py-20 shadow-glow relative overflow-hidden">
          {/* Blue lighting accent */}
          <div className="absolute top-[30%] right-[-10%] w-[350px] h-[350px] rounded-full bg-[#2563eb]/15 blur-[90px] pointer-events-none" />

          <div className="grid gap-12 lg:grid-cols-12 lg:items-center relative z-10 text-left">
            <div className="lg:col-span-7 space-y-6">
              <p className="text-xs font-bold uppercase tracking-widest text-[#2563eb] font-display">Get started</p>
              <h2 className="font-display text-4xl font-extrabold sm:text-5xl leading-[1.1] text-white">
                Send. Carry. Earn.<br />
                Do it all with UniFetch.
              </h2>
              <p className="max-w-xl text-xs leading-relaxed text-[#cbd5e1] font-semibold sm:text-sm">
                Join thousands of students who trust UniFetch for hassle-free campus deliveries.
              </p>

              <div className="pt-4 flex flex-col sm:flex-row gap-4 max-w-md">
                <Link href={isLoggedIn ? "/request" : "/signup"} className="neo-btn-primary px-8 py-4 text-xs font-extrabold uppercase tracking-widest shadow-glow">
                  Send a Package
                </Link>
                <Link href="/carry" className="neo-btn-secondary px-8 py-4 text-xs font-extrabold uppercase tracking-widest border-[rgba(255,255,255,0.08)] bg-transparent hover:bg-white/5">
                  Become a Carrier
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 flex justify-center">
              <MiniHeroIllustration />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[rgba(255,255,255,0.08)] bg-[#05070b] px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12 pb-12 border-b border-[rgba(255,255,255,0.04)]">
            {/* Logo/Brand column */}
            <div className="lg:col-span-5 space-y-4">
              <Link href="/" className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2563eb] text-white text-[11px] font-bold shadow-glow">
                  <LogoMark className="h-5.5 w-5.5" />
                </div>
                <span className="font-bold text-white font-display text-lg tracking-tight">UniFetch</span>
              </Link>
              <p className="text-xs text-[#cbd5e1] max-w-xs leading-relaxed font-semibold">
                Making campus deliveries simple, safe, and reliable by connecting peers already on the walk.
              </p>
            </div>

            {/* Quick Links */}
            <div className="lg:col-span-2.5 space-y-4">
              <h5 className="font-display text-[10px] font-extrabold uppercase tracking-widest text-[#2563eb]">Quick Links</h5>
              <div className="flex flex-col gap-2.5 text-xs text-[#cbd5e1] font-semibold">
                <Link href="/" className="hover:text-white transition-colors">Home</Link>
                <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
                <a href="#features" className="hover:text-white transition-colors">Features</a>
                <a href="#faqs" className="hover:text-white transition-colors">FAQs</a>
              </div>
            </div>

            {/* For Campus */}
            <div className="lg:col-span-2.5 space-y-4">
              <h5 className="font-display text-[10px] font-extrabold uppercase tracking-widest text-[#2563eb]">For Campus</h5>
              <div className="flex flex-col gap-2.5 text-xs text-[#cbd5e1] font-semibold">
                <Link href="/requests" className="hover:text-white transition-colors">Partner with us</Link>
                <Link href="/carry" className="hover:text-white transition-colors">Safety</Link>
                <Link href="/" className="hover:text-white transition-colors">Guidelines</Link>
                <a href="#faqs" className="hover:text-white transition-colors">Support</a>
              </div>
            </div>

            {/* Contact info */}
            <div className="lg:col-span-2 space-y-4">
              <h5 className="font-display text-[10px] font-extrabold uppercase tracking-widest text-[#2563eb]">Contact Us</h5>
              <div className="flex flex-col gap-2 text-xs text-[#cbd5e1] font-semibold">
                <span>hello@unifetch.com</span>
                <span>+91 98765-43210</span>
                <span>Mumbai, India</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 text-[11px] font-bold text-[#cbd5e1]">
            <p className="font-normal text-[#cbd5e1]">© 2026 UniFetch. All rights reserved.</p>
            <div className="flex gap-6 uppercase tracking-wider">
              <Link href="/" className="hover:text-white transition-colors">Privacy Policy</Link>
              <span>|</span>
              <Link href="/" className="hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

// Subcomponents helper

function StatCard({ icon, number, label }: { icon: React.ReactNode; number: string; label: string }) {
  return (
    <Card className="flex flex-col items-center text-center p-6 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-[2rem] hover:border-[#2563eb]/25 transition-all duration-200">
      <div className="h-10 w-10 flex items-center justify-center bg-[#2563eb]/8 rounded-full mb-4 shadow-sm border border-[#2563eb]/10">
        {icon}
      </div>
      <span className="font-display text-3xl font-extrabold text-white tracking-tight">{number}</span>
      <span className="mt-1 text-[10px] uppercase tracking-widest text-[#cbd5e1] font-bold">{label}</span>
    </Card>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="p-6 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-[2rem] hover:border-[#2563eb]/30 transition-all duration-200 hover:-translate-y-1">
      <div className="h-11 w-11 flex items-center justify-center bg-[#2563eb]/10 rounded-xl mb-6 text-[#2563eb] shadow-sm">
        {icon}
      </div>
      <h3 className="font-display text-md font-bold text-white mb-2">{title}</h3>
      <p className="text-[11px] leading-relaxed text-[#cbd5e1] font-semibold">{description}</p>
    </Card>
  );
}

function BulletCheck({ text }: { text: string }) {
  return (
    <div className="flex gap-3">
      <div className="h-5 w-5 shrink-0 flex items-center justify-center rounded-full bg-[#2563eb]/10 border border-[#2563eb]/20 text-[#2563eb]">
        <Check className="h-3 w-3" />
      </div>
      <span className="text-xs text-[#cbd5e1] font-semibold leading-relaxed">{text}</span>
    </div>
  );
}

function FaqAccordionItem({
  q,
  a,
  isOpen,
  onToggle,
}: {
  q: string;
  a: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const answerRef = useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState(0);

  useEffect(() => {
    if (answerRef.current) {
      setMeasuredHeight(answerRef.current.scrollHeight);
    }
  }, [a]);

  const accordionStyle = useSpring({
    height: isOpen ? `${measuredHeight}px` : "0px",
    opacity: isOpen ? 1 : 0,
    config: { tension: 280, friction: 24 },
  });

  return (
    <Card className="overflow-hidden border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)] transition-all duration-200 hover:border-[#2563eb]/20 rounded-2xl">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between p-5 text-left text-xs sm:text-sm font-bold text-white hover:bg-[rgba(255,255,255,0.02)]"
      >
        <span className="flex items-center gap-2">
          <HelpCircle className="h-4.5 w-4.5 text-[#2563eb] shrink-0" />
          {q}
        </span>
        <span className="text-base text-[#2563eb] leading-none shrink-0 ml-4">{isOpen ? "−" : "+"}</span>
      </button>

      <animated.div style={{ ...accordionStyle, overflow: "hidden" }}>
        <div ref={answerRef} className="border-t border-[rgba(255,255,255,0.06)] bg-[#05070b]/60 p-5 text-xs leading-relaxed text-[#cbd5e1] font-medium">
          {a}
        </div>
      </animated.div>
    </Card>
  );
}

// Detailed 3D package box illustration with spinning orbits (Hero right)
function HeroIllustration() {
  return (
    <div className="w-full max-w-[420px] aspect-square relative flex items-center justify-center animate-none">
      {/* Outer Orbit */}
      <div className="absolute inset-0 border border-dashed border-[#2563eb]/20 rounded-full animate-spin-slow rotate-[60deg] scale-x-[0.5] scale-y-[1.2]" />
      
      {/* Inner Orbit */}
      <div className="absolute w-[80%] h-[80%] border border-[rgba(37,99,235,0.35)] rounded-full animate-spin-reverse-slow rotate-[-30deg] scale-x-[1.1] scale-y-[0.4]" />

      {/* Outer Orbit Icons */}
      <div className="absolute inset-0 animate-spin-slow pointer-events-none">
        {/* Package icon capsule */}
        <div className="absolute top-[10%] left-[20%] h-9 w-9 flex items-center justify-center rounded-full bg-[#05070b] border border-[#2563eb]/45 shadow-glow text-[#2563eb] rotate-[25deg]">
          <Package className="h-4 w-4" />
        </div>
        {/* User icon capsule */}
        <div className="absolute bottom-[10%] right-[20%] h-9 w-9 flex items-center justify-center rounded-full bg-[#05070b] border border-[#2563eb]/45 shadow-glow text-[#2563eb]">
          <User className="h-4 w-4" />
        </div>
      </div>

      {/* Inner Orbit Icons */}
      <div className="absolute w-[80%] h-[80%] animate-spin-reverse-slow pointer-events-none">
        {/* Tracking pin capsule */}
        <div className="absolute top-[40%] right-[-5px] h-9 w-9 flex items-center justify-center rounded-full bg-[#05070b] border border-[#2563eb]/45 shadow-glow text-[#2563eb]">
          <MapPin className="h-4 w-4" />
        </div>
        {/* Navigation arrow capsule */}
        <div className="absolute bottom-[40%] left-[-5px] h-9 w-9 flex items-center justify-center rounded-full bg-[#05070b] border border-[#2563eb]/45 shadow-glow text-[#2563eb]">
          <Navigation className="h-4 w-4" />
        </div>
      </div>

      {/* Center 3D Isometric Cube Drawing */}
      <div className="relative w-[180px] h-[180px] animate-float z-10">
        <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="cube-top-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="cube-left-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0b0f19" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="cube-right-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0b0f19" />
            </linearGradient>
            <filter id="cube-shadow-blur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" />
            </filter>
          </defs>

          {/* Ellipse shadow under box */}
          <ellipse cx="100" cy="170" rx="60" ry="18" fill="#2563eb" opacity="0.25" filter="url(#cube-shadow-blur)" />

          {/* Isometric Cube polygons */}
          {/* Top face */}
          <polygon points="100,30 170,65 100,100 30,65" fill="url(#cube-top-grad)" stroke="#3b82f6" strokeWidth="2.5" />
          
          {/* Left face */}
          <polygon points="30,65 100,100 100,170 30,135" fill="url(#cube-left-grad)" stroke="#2563eb" strokeWidth="2" strokeOpacity="0.6" />
          
          {/* Right face */}
          <polygon points="100,100 170,65 170,135 100,170" fill="url(#cube-right-grad)" stroke="#2563eb" strokeWidth="2" strokeOpacity="0.6" />

          {/* Wrapping Tape details */}
          <polygon points="90,35 100,40 110,35 100,30" fill="#ffffff" opacity="0.25" />
          <polygon points="82,40 100,49 100,100 82,91" fill="#3b82f6" opacity="0.3" />
          <polygon points="100,49 118,40 118,91 100,100" fill="#3b82f6" opacity="0.3" />

          {/* Glowing dot on top */}
          <circle cx="100" cy="35" r="4.5" fill="#3b82f6" className="animate-pulse" />
          
          {/* Small shipping barcode detail on right face */}
          <line x1="125" y1="95" x2="145" y2="85" stroke="#ffffff" strokeWidth="1.5" opacity="0.12" />
          <line x1="125" y1="102" x2="145" y2="92" stroke="#ffffff" strokeWidth="3" opacity="0.12" />
          <line x1="125" y1="110" x2="145" y2="100" stroke="#ffffff" strokeWidth="1.5" opacity="0.12" />

          {/* Small details on left face */}
          <path d="M 50,95 L 80,110" stroke="#2563eb" strokeWidth="2" strokeDasharray="3 3" opacity="0.5" />
        </svg>
      </div>
    </div>
  );
}

// Mini illustration for Final CTA section
function MiniHeroIllustration() {
  return (
    <div className="w-[180px] h-[180px] relative flex items-center justify-center">
      {/* Outer Orbit */}
      <div className="absolute inset-0 border border-dashed border-[#2563eb]/20 rounded-full animate-spin-slow rotate-[60deg] scale-x-[0.5] scale-y-[1.2]" />

      {/* Center 3D Isometric Cube Drawing */}
      <div className="relative w-[100px] h-[100px] animate-float z-10">
        <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
          {/* Isometric Cube polygons */}
          {/* Top face */}
          <polygon points="100,30 170,65 100,100 30,65" fill="url(#cube-top-grad)" stroke="#3b82f6" strokeWidth="2.5" />
          {/* Left face */}
          <polygon points="30,65 100,100 100,170 30,135" fill="url(#cube-left-grad)" stroke="#2563eb" strokeWidth="2" strokeOpacity="0.6" />
          {/* Right face */}
          <polygon points="100,100 170,65 170,135 100,170" fill="url(#cube-right-grad)" stroke="#2563eb" strokeWidth="2" strokeOpacity="0.6" />
        </svg>
      </div>
    </div>
  );
}