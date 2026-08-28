"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Calendar, Compass, Plus, Navigation, Clock, User, Check, X, ClipboardList } from "lucide-react";
import { useTransition, animated } from "@react-spring/web";
import { supabase } from "@/lib/supabase/client";
import { SidebarShell } from "../../components/SidebarShell";
import { Alert } from "../../components/ui/Alert";
import { EmptyState } from "../../components/ui/EmptyState";

type OutsideRequest = {
  id: string;
  requester_id: string;
  carrier_id: string | null;
  request_type: string;
  destination: string;
  description: string;
  preferred_date: string;
  instructions: string;
  suggested_reward: number;
  status: string;
  trip_id: string | null;
  profiles?: {
    full_name: string;
  };
};

type OutsideTrip = {
  id: string;
  creator_id: string;
  origin: string;
  destination: string;
  departure_date: string;
  departure_time: string | null;
  return_date: string | null;
  return_time: string | null;
  help_types: string[];
  note: string | null;
  status: string;
  profiles?: {
    full_name: string;
  };
  outside_requests?: OutsideRequest[];
};

export default function BrowseOutsideCampusPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"trips" | "requests" | "my-trips">("trips");
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // Trips Tab States
  const [trips, setTrips] = useState<OutsideTrip[]>([]);
  const [tripsSearch, setTripsSearch] = useState("");
  const [tripsLoading, setTripsLoading] = useState(true);

  // Requests Tab States
  const [requests, setRequests] = useState<OutsideRequest[]>([]);
  const [requestsSearch, setRequestsSearch] = useState("");
  const [requestsLoading, setRequestsLoading] = useState(true);

  // My Trips Tab States
  const [myTrips, setMyTrips] = useState<OutsideTrip[]>([]);
  const [myTripsLoading, setMyTripsLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Load basic authentication
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setCurrentUserId(user.id);
    }
    checkAuth();
  }, [router]);

  // Load Trips
  useEffect(() => {
    let cancelled = false;

    async function loadTrips() {
      if (!currentUserId) return;
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("outside_trips")
        .select(`
          *,
          profiles:creator_id ( full_name )
        `)
        .eq("status", "active")
        .gte("departure_date", today)
        .order("departure_date", { ascending: true });

      if (cancelled) return;

      if (error) {
        console.error("Error loading trips:", error);
        setErrorMessage("Failed to load trips.");
      } else {
        // Filter out my own trips from public feed
        const publicTrips = (data as OutsideTrip[] || []).filter(t => t.creator_id !== currentUserId);
        setTrips(publicTrips);
      }
      setTripsLoading(false);
    }

    loadTrips();

    const channel = supabase
      .channel("outside-trips-channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "outside_trips" }, () => {
        loadTrips();
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  // Load Requests
  useEffect(() => {
    let cancelled = false;

    async function loadRequests() {
      if (!currentUserId) return;

      const { data, error } = await supabase
        .from("outside_requests")
        .select(`
          id, requester_id, carrier_id, request_type, destination, description, 
          preferred_date, instructions, suggested_reward, status, trip_id,
          profiles:requester_id ( full_name )
        `)
        .eq("status", "OPEN")
        .neq("requester_id", currentUserId)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error("Error loading requests:", error);
        setErrorMessage("Failed to load requests.");
      } else {
        setRequests((data as unknown as OutsideRequest[]) || []);
      }
      setRequestsLoading(false);
    }

    loadRequests();

    const channel = supabase
      .channel("outside-requests-browse-channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "outside_requests" }, () => {
        loadRequests();
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  // Load My Trips
  useEffect(() => {
    let cancelled = false;

    async function loadMyTrips() {
      if (!currentUserId) return;

      const { data, error } = await supabase
        .from("outside_trips")
        .select(`
          *,
          outside_requests (
            id,
            description,
            suggested_reward,
            status,
            requester_id,
            profiles:requester_id ( full_name )
          )
        `)
        .eq("creator_id", currentUserId)
        .order("departure_date", { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error("Error loading my trips:", error);
      } else {
        setMyTrips((data as unknown as OutsideTrip[]) || []);
      }
      setMyTripsLoading(false);
    }

    loadMyTrips();

    const channel = supabase
      .channel("outside-my-trips-channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "outside_trips" }, () => {
        loadMyTrips();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "outside_requests" }, () => {
        loadMyTrips();
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  // Actions on my trips
  async function handleUpdateTripStatus(tripId: string, status: "completed" | "cancelled") {
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("outside_trips")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", tripId)
      .eq("creator_id", currentUserId);

    if (error) {
      setErrorMessage("Failed to update trip status: " + error.message);
    } else {
      setSuccessMessage(`Trip successfully marked as ${status}!`);
    }
  }

  // Filter lists
  const filteredTrips = trips.filter((t) => {
    const query = tripsSearch.toLowerCase();
    const matchesDest = t.destination.toLowerCase().includes(query) || t.origin.toLowerCase().includes(query);
    const matchesHelp = t.help_types.some(h => h.toLowerCase().includes(query));
    const matchesCreator = (t.profiles?.full_name || "").toLowerCase().includes(query);
    return matchesDest || matchesHelp || matchesCreator;
  });

  const filteredRequests = requests.filter((r) => {
    const query = requestsSearch.toLowerCase();
    return (
      r.destination.toLowerCase().includes(query) ||
      r.description.toLowerCase().includes(query) ||
      (r.profiles?.full_name || "").toLowerCase().includes(query)
    );
  });

  // Animations
  const tripTransitions = useTransition(filteredTrips, {
    keys: (item) => item.id,
    from: { opacity: 0, transform: "translate3d(0, 15px, 0)" },
    enter: { opacity: 1, transform: "translate3d(0, 0, 0)" },
    leave: { opacity: 0, transform: "translate3d(0, -10px, 0)", height: 0, margin: 0 },
    trail: 35,
    config: { tension: 300, friction: 22 },
  });

  const requestTransitions = useTransition(filteredRequests, {
    keys: (item) => item.id,
    from: { opacity: 0, transform: "translate3d(0, 15px, 0)" },
    enter: { opacity: 1, transform: "translate3d(0, 0, 0)" },
    leave: { opacity: 0, transform: "translate3d(0, -10px, 0)", height: 0, margin: 0 },
    trail: 35,
    config: { tension: 300, friction: 22 },
  });

  const myTripTransitions = useTransition(myTrips, {
    keys: (item) => item.id,
    from: { opacity: 0, transform: "translate3d(0, 15px, 0)" },
    enter: { opacity: 1, transform: "translate3d(0, 0, 0)" },
    leave: { opacity: 0, transform: "translate3d(0, -10px, 0)", height: 0, margin: 0 },
    trail: 35,
    config: { tension: 300, friction: 22 },
  });

  const tabLoading = activeTab === "trips" ? tripsLoading : activeTab === "requests" ? requestsLoading : myTripsLoading;

  return (
    <SidebarShell>
      <div className="p-6 sm:p-8 lg:p-10 space-y-8">
        
        {/* Header Section */}
        <div className="border-b border-[rgba(255,255,255,0.08)] pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#10b981]">Outside Campus</span>
              <span className="text-[9px] bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider">
                Direct User-to-User Payout
              </span>
            </div>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-white leading-none">
              Outside Campus Carry
            </h1>
            <p className="mt-2 text-xs text-[#cbd5e1] font-semibold">
              Find students traveling outside campus to fetch items, or announce your own trip to pick up tasks.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/outside/create"
              className="neo-btn-primary py-3 px-5 text-xs font-extrabold uppercase tracking-widest bg-white/5 border border-[rgba(255,255,255,0.08)] hover:bg-white/10 text-white rounded-xl flex items-center gap-2 shadow-sm transition-all"
            >
              <Plus className="h-4 w-4 text-[#10b981]" />
              <span>Create Request</span>
            </Link>
            <Link
              href="/outside/trips/create"
              className="neo-btn-primary py-3 px-5 text-xs font-extrabold uppercase tracking-widest bg-[#10b981] hover:bg-[#059669] text-white border-none rounded-xl flex items-center gap-2 shadow-glow-emerald transition-all"
            >
              <Navigation className="h-4 w-4" />
              <span>I&apos;m Going Out</span>
            </Link>
          </div>
        </div>

        {errorMessage && <Alert tone="error">{errorMessage}</Alert>}
        {successMessage && <Alert tone="success">{successMessage}</Alert>}

        {/* Tab Navigation */}
        <div className="flex border-b border-[rgba(255,255,255,0.06)] pb-px gap-6 text-xs font-bold uppercase tracking-widest overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab("trips")}
            className={`pb-4 border-b-2 transition-all duration-150 whitespace-nowrap ${
              activeTab === "trips" 
                ? "border-[#10b981] text-[#10b981]" 
                : "border-transparent text-muted hover:text-white"
            }`}
          >
            🚗 Students Going Out
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`pb-4 border-b-2 transition-all duration-150 whitespace-nowrap ${
              activeTab === "requests" 
                ? "border-[#10b981] text-[#10b981]" 
                : "border-transparent text-muted hover:text-white"
            }`}
          >
            📋 Open Carry Requests
          </button>
          <button
            onClick={() => setActiveTab("my-trips")}
            className={`pb-4 border-b-2 transition-all duration-150 whitespace-nowrap ${
              activeTab === "my-trips" 
                ? "border-[#10b981] text-[#10b981]" 
                : "border-transparent text-muted hover:text-white"
            }`}
          >
            🎒 My Trips &amp; Requests
          </button>
        </div>

        {/* Loader */}
        {tabLoading ? (
          <div className="py-20 text-center">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-[#10b981] text-white shadow-glow-emerald animate-bounce mx-auto">
              <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
              </svg>
            </span>
            <p className="mt-4 text-[9px] font-extrabold tracking-widest text-[#cbd5e1] font-display uppercase">
              Loading details...
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* TRIPS TAB */}
            {activeTab === "trips" && (
              <>
                <div className="relative max-w-md">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    placeholder="Search trips by destination, help type, or creator..."
                    className="w-full rounded-2xl border border-[rgba(255,255,255,0.08)] bg-white/5 py-3 pl-11 pr-4 text-xs font-semibold text-white placeholder-[rgba(255,255,255,0.3)] focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] focus:outline-none transition-colors"
                    value={tripsSearch}
                    onChange={(e) => setTripsSearch(e.target.value)}
                  />
                </div>

                {filteredTrips.length === 0 ? (
                  <EmptyState
                    icon={<Compass className="h-10 w-10 text-[#10b981] animate-pulse" />}
                    title="No trips announced yet"
                    description="Be the first one! If you are planning to go outside college soon, click 'I'm Going Out' to announce it."
                  />
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {tripTransitions((style, trip) => (
                      <animated.div style={style} key={trip.id}>
                        <div className="rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-6 bg-[#080d16]/30 hover:border-[#10b981]/30 transition-all duration-200 flex flex-col justify-between h-full space-y-4">
                          <div className="space-y-3">
                            {/* Trip Header */}
                            <div className="flex items-start justify-between border-b border-[rgba(255,255,255,0.06)] pb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">🚗</span>
                                <div>
                                  <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#10b981] block">Going to</span>
                                  <span className="font-display font-bold text-sm text-white truncate max-w-[150px] block">{trip.destination}</span>
                                </div>
                              </div>
                            </div>

                            {/* Trip Route */}
                            <div className="space-y-2 text-xs font-semibold text-[#cbd5e1]">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-[#10b981] shrink-0" />
                                <span>{new Date(trip.departure_date).toLocaleDateString([], { month: "short", day: "numeric", weekday: "short" })}</span>
                              </div>
                              {trip.departure_time && (
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 text-[#10b981] shrink-0" />
                                  <span>Leaving around {trip.departure_time}</span>
                                </div>
                              )}
                              <div className="pt-1.5 border-t border-[rgba(255,255,255,0.04)] grid grid-cols-2 gap-2 text-[10px]">
                                <div>
                                  <span className="text-[8px] text-muted block uppercase font-bold">From</span>
                                  <span className="text-white block truncate">{trip.origin}</span>
                                </div>
                                <div>
                                  <span className="text-[8px] text-muted block uppercase font-bold">To</span>
                                  <span className="text-white block truncate">{trip.destination}</span>
                                </div>
                              </div>
                            </div>

                            {/* Help types */}
                            <div className="space-y-1">
                              <span className="text-[8px] font-extrabold uppercase tracking-widest text-muted block">Willing to help with</span>
                              <div className="flex flex-wrap gap-1">
                                {trip.help_types.length === 0 ? (
                                  <span className="text-[10px] text-[#cbd5e1]">Any small carries</span>
                                ) : (
                                  trip.help_types.map((type) => (
                                    <span key={type} className="text-[8px] bg-white/5 text-[#cbd5e1] border border-[rgba(255,255,255,0.06)] px-2 py-0.5 rounded-md uppercase font-extrabold">
                                      {type.replace("_", " ")}
                                    </span>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Optional Note */}
                            {trip.note && (
                              <p className="text-[11px] italic text-[#cbd5e1] line-clamp-2 pt-1 border-t border-[rgba(255,255,255,0.04)] leading-relaxed">
                                &quot;{trip.note}&quot;
                              </p>
                            )}

                            <div className="pt-2 flex items-center gap-1 text-[9px] font-extrabold text-muted uppercase tracking-wider">
                              <User className="h-3.5 w-3.5 text-[#10b981]" />
                              <span>Carrier: {trip.profiles?.full_name || "Student"}</span>
                            </div>
                          </div>

                          <Link
                            href={`/outside/create?trip_id=${trip.id}&destination=${encodeURIComponent(trip.destination)}`}
                            className="neo-btn-primary w-full py-3 text-center text-xs font-extrabold uppercase tracking-widest bg-[#10b981] hover:bg-[#059669] shadow-glow-emerald text-white border-none block"
                          >
                            Ask Me to Bring Something
                          </Link>
                        </div>
                      </animated.div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* REQUESTS TAB */}
            {activeTab === "requests" && (
              <>
                <div className="relative max-w-md">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    placeholder="Search requests by destination, description..."
                    className="w-full rounded-2xl border border-[rgba(255,255,255,0.08)] bg-white/5 py-3 pl-11 pr-4 text-xs font-semibold text-white placeholder-[rgba(255,255,255,0.3)] focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] focus:outline-none transition-colors"
                    value={requestsSearch}
                    onChange={(e) => setRequestsSearch(e.target.value)}
                  />
                </div>

                {filteredRequests.length === 0 ? (
                  <EmptyState
                    icon={<Compass className="h-10 w-10 text-[#10b981] animate-pulse" />}
                    title="No open outside requests"
                    description="There are currently no requests posted by other students. Post your own or check back later!"
                  />
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {requestTransitions((style, req) => {
                      const typeLabel = req.request_type.charAt(0).toUpperCase() + req.request_type.slice(1);
                      return (
                        <animated.div style={style} key={req.id}>
                          <div className="rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-6 bg-[#080d16]/30 hover:border-[#10b981]/30 transition-all duration-200 flex flex-col justify-between h-full space-y-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] pb-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-xl">📍</span>
                                  <div>
                                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#10b981] block">Destination</span>
                                    <span className="font-display font-bold text-sm text-white truncate max-w-[150px] block">{req.destination}</span>
                                  </div>
                                </div>
                                <span className="inline-flex items-center gap-1.5 bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                  {typeLabel}
                                </span>
                              </div>

                              <div className="space-y-1">
                                <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#cbd5e1] block">Task Description</span>
                                <p className="text-xs font-semibold text-white leading-relaxed line-clamp-3">
                                  {req.description}
                                </p>
                              </div>

                              <div className="grid grid-cols-2 gap-3 pt-2">
                                <div>
                                  <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#cbd5e1] block">Suggested Reward</span>
                                  <span className="text-sm font-black text-white">₹{req.suggested_reward}</span>
                                </div>
                                <div>
                                  <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#cbd5e1] block">Preferred Date</span>
                                  <span className="text-[10px] font-bold text-[#cbd5e1] block truncate">
                                    {new Date(req.preferred_date).toLocaleDateString([], { month: "short", day: "numeric" })}
                                  </span>
                                </div>
                              </div>

                              {req.trip_id && (
                                <div className="text-[8px] font-extrabold text-[#10b981] uppercase tracking-wider">
                                  🔗 Linked to Trip Announcement
                                </div>
                              )}

                              <div className="pt-2 border-t border-[rgba(255,255,255,0.04)] text-[9px] font-extrabold text-muted block uppercase tracking-wider">
                                Requester: {req.profiles?.full_name || "Student"}
                              </div>
                            </div>

                            <Link
                              href={`/outside/${req.id}`}
                              className="neo-btn-primary w-full py-3 text-center text-xs font-extrabold uppercase tracking-widest bg-[#10b981] hover:bg-[#059669] shadow-glow-emerald text-white border-none block"
                            >
                              View &amp; Negotiate
                            </Link>
                          </div>
                        </animated.div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* MY TRIPS TAB */}
            {activeTab === "my-trips" && (
              <>
                {myTrips.length === 0 ? (
                  <EmptyState
                    icon={<Compass className="h-10 w-10 text-[#10b981] animate-pulse" />}
                    title="No trips announced yet"
                    description="Planning to go somewhere? Announce it so dormmates can request errands from you!"
                  />
                ) : (
                  <div className="space-y-8 max-w-4xl">
                    {myTripTransitions((style, trip) => {
                      const associatedRequests = trip.outside_requests || [];
                      const activeRequests = associatedRequests.filter(r => r.status !== "CANCELLED");

                      return (
                        <animated.div style={style} key={trip.id}>
                          <div className="rounded-[2rem] border border-[rgba(255,255,255,0.08)] bg-[#080d16]/30 p-6 space-y-6 relative overflow-hidden">
                            
                            {/* Trip Summary Card */}
                            <div className="flex flex-col md:flex-row justify-between gap-4 border-b border-[rgba(255,255,255,0.06)] pb-4">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xl">🚗</span>
                                  <h3 className="font-display font-black text-lg text-white leading-none">
                                    Trip to {trip.destination}
                                  </h3>
                                  <span className={`text-[8px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                                    trip.status === "active" 
                                      ? "bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30" 
                                      : trip.status === "completed"
                                      ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                      : "bg-red-500/10 text-red-400 border-red-500/20"
                                  }`}>
                                    {trip.status}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-[#cbd5e1] font-semibold">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5 text-[#10b981]" />
                                    {new Date(trip.departure_date).toLocaleDateString([], { month: "short", day: "numeric", weekday: "short" })}
                                  </span>
                                  {trip.departure_time && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3.5 w-3.5 text-[#10b981]" />
                                      Leaving {trip.departure_time}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {trip.status === "active" && (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleUpdateTripStatus(trip.id, "completed")}
                                    className="neo-btn-primary py-2 px-4 text-[10px] font-extrabold uppercase tracking-wider bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] border border-[#10b981]/30 rounded-xl flex items-center gap-1.5 transition-all"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    <span>Mark Completed</span>
                                  </button>
                                  <button
                                    onClick={() => handleUpdateTripStatus(trip.id, "cancelled")}
                                    className="neo-btn-primary py-2 px-4 text-[10px] font-extrabold uppercase tracking-wider bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl flex items-center gap-1.5 transition-all"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                    <span>Cancel Trip</span>
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Associated Requests list */}
                            <div className="space-y-4">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#10b981] flex items-center gap-1.5">
                                <ClipboardList className="h-4 w-4" />
                                <span>Requests for this trip ({activeRequests.length})</span>
                              </h4>

                              {activeRequests.length === 0 ? (
                                <p className="text-xs text-muted italic font-semibold">No requests sent for this trip yet.</p>
                              ) : (
                                <div className="grid gap-4 sm:grid-cols-2">
                                  {activeRequests.map((req) => (
                                    <div key={req.id} className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#05070b]/60 p-4 space-y-3 hover:border-[#10b981]/20 transition-all flex flex-col justify-between">
                                      <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 text-[#cbd5e1]">
                                            {req.status}
                                          </span>
                                          <span className="text-xs font-black text-white">₹{req.suggested_reward}</span>
                                        </div>
                                        <p className="text-xs font-semibold text-white leading-relaxed line-clamp-2">
                                          {req.description}
                                        </p>
                                        <p className="text-[9px] text-muted font-bold uppercase tracking-wider">
                                          From: {req.profiles?.full_name || "Student"}
                                        </p>
                                      </div>
                                      <Link
                                        href={`/outside/${req.id}`}
                                        className="neo-btn-primary w-full py-2 text-center text-[10px] font-extrabold uppercase tracking-widest bg-white/5 hover:bg-white/10 text-white border border-[rgba(255,255,255,0.08)] block rounded-xl mt-2"
                                      >
                                        View Details &amp; Chat
                                      </Link>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                          </div>
                        </animated.div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

          </div>
        )}

      </div>
    </SidebarShell>
  );
}
