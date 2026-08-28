"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquare, PlusCircle } from "lucide-react";
import { useTransition, animated } from "@react-spring/web";
import { supabase } from "@/lib/supabase/client";
import { SidebarShell } from "../../components/SidebarShell";
import { Alert } from "../../components/ui/Alert";
import { StatPill } from "../../components/ui/StatPill";
import { StatusBadge } from "../../components/ui/StatusBadge";

type OutsideRequest = {
  id: string;
  requester_id: string;
  carrier_id: string | null;
  request_type: string;
  destination: string;
  description: string;
  preferred_date: string;
  suggested_reward: number;
  final_reward: number | null;
  status: string;
  payment_status: string;
  profiles?: {
    full_name: string;
  };
};

export default function MyOutsideTasksPage() {
  const router = useRouter();

  const [myRequests, setMyRequests] = useState<OutsideRequest[]>([]);
  const [myCarries, setMyCarries] = useState<OutsideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setErrorMessage("");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Load requests created by the user
      const { data: requests, error: requestsError } = await supabase
        .from("outside_requests")
        .select(`
          id, requester_id, carrier_id, request_type, destination, description, 
          preferred_date, suggested_reward, final_reward, status, payment_status,
          profiles:carrier_id ( full_name )
        `)
        .eq("requester_id", user.id)
        .order("created_at", { ascending: false });

      // Load carries accepted by the user
      const { data: carries, error: carriesError } = await supabase
        .from("outside_requests")
        .select(`
          id, requester_id, carrier_id, request_type, destination, description, 
          preferred_date, suggested_reward, final_reward, status, payment_status,
          profiles:requester_id ( full_name )
        `)
        .eq("carrier_id", user.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (requestsError || carriesError) {
        console.error("Error loading tasks:", requestsError || carriesError);
        setErrorMessage("Failed to load your tasks.");
      } else {
        setMyRequests((requests as unknown as OutsideRequest[]) || []);
        setMyCarries((carries as unknown as OutsideRequest[]) || []);
      }
      setLoading(false);
    }

    loadData();

    const channel = supabase
      .channel("outside-tasks-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "outside_requests",
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [router]);

  const activeRequestsCount = myRequests.filter(r => r.status !== "COMPLETED" && r.status !== "CANCELLED").length;
  const activeCarriesCount = myCarries.filter(c => c.status !== "COMPLETED" && c.status !== "CANCELLED").length;

  const requestTransitions = useTransition(myRequests, {
    keys: (item) => item.id,
    from: { opacity: 0, transform: "translate3d(0, 15px, 0)" },
    enter: { opacity: 1, transform: "translate3d(0, 0, 0)" },
    leave: { opacity: 0, transform: "translate3d(0, -10px, 0)", height: 0, margin: 0 },
    config: { tension: 320, friction: 24 },
  });

  const carryTransitions = useTransition(myCarries, {
    keys: (item) => item.id,
    from: { opacity: 0, transform: "translate3d(0, 15px, 0)" },
    enter: { opacity: 1, transform: "translate3d(0, 0, 0)" },
    leave: { opacity: 0, transform: "translate3d(0, -10px, 0)", height: 0, margin: 0 },
    config: { tension: 320, friction: 24 },
  });

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05070b]">
        <div className="text-center">
          <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[#10b981] text-white shadow-glow-emerald animate-bounce mx-auto">
            <svg className="h-6 w-6 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
          </span>
          <p className="mt-5 text-[10px] font-extrabold tracking-widest text-[#cbd5e1] font-display uppercase">
            Loading your tasks...
          </p>
        </div>
      </main>
    );
  }

  return (
    <SidebarShell>
      <div className="p-6 sm:p-8 lg:p-10 space-y-10">
        
        {/* Title area */}
        <div className="border-b border-[rgba(255,255,255,0.08)] pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#10b981]">Outside Campus</span>
              <span className="text-[9px] bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider">
                Real Money Tasks
              </span>
            </div>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-white leading-none">
              Outside Tasks Dashboard
            </h1>
            <p className="mt-2 text-xs text-[#cbd5e1] font-semibold">
              Track requests you posted or claimed for destinations outside college campus.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <StatPill label="My Postings" value={activeRequestsCount} />
            <StatPill label="My Deliveries" value={activeCarriesCount} />
          </div>
        </div>

        {errorMessage && <Alert tone="error">{errorMessage}</Alert>}

        {/* Section 1: My Posted Requests */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.05)] pb-3">
            <h2 className="font-display text-xl font-bold text-white">Requests I Posted</h2>
            <Link
              href="/outside/create"
              className="neo-btn-primary flex items-center gap-1.5 px-4.5 py-2 text-[10px] font-extrabold uppercase tracking-wider bg-[#10b981] hover:bg-[#059669] text-white border-none shadow-glow-emerald rounded-xl"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Create Request</span>
            </Link>
          </div>

          {myRequests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[rgba(255,255,255,0.08)] p-10 text-center text-xs text-muted font-bold uppercase tracking-widest select-none">
              You haven&apos;t posted any outside campus requests yet
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {requestTransitions((style, req) => (
                <animated.div style={style} key={req.id}>
                  <div className="rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-6 bg-[#080d16]/30 hover:border-[#10b981]/30 transition-all duration-200 flex flex-col justify-between h-full space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">📍</span>
                          <div>
                            <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#cbd5e1] block">Destination</span>
                            <span className="font-display font-bold text-sm text-white block">{req.destination}</span>
                          </div>
                        </div>
                        <StatusBadge status={req.status.toLowerCase()} />
                      </div>

                      <p className="text-xs font-semibold text-white leading-relaxed line-clamp-2">
                        {req.description}
                      </p>

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div>
                          <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#cbd5e1] block">Reward</span>
                          <span className="text-xs font-black text-white">₹{req.final_reward ?? req.suggested_reward}</span>
                        </div>
                        <div>
                          <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#cbd5e1] block">Status Detail</span>
                          <span className="text-[10px] font-bold text-[#cbd5e1] block uppercase tracking-wider">
                            {req.payment_status}
                          </span>
                        </div>
                      </div>

                      {req.profiles?.full_name && (
                        <div className="pt-2 text-[9px] font-extrabold text-muted uppercase tracking-wider">
                          Carrier: {req.profiles.full_name}
                        </div>
                      )}
                    </div>

                    <Link
                      href={`/outside/${req.id}`}
                      className="neo-btn-primary w-full py-2.5 text-center text-xs font-extrabold uppercase tracking-widest bg-[#10b981] hover:bg-[#059669] text-white border-none block rounded-xl flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>Negotiation / Chat</span>
                    </Link>
                  </div>
                </animated.div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: My Accepted Carries */}
        <div className="space-y-6">
          <h2 className="font-display text-xl font-bold text-white border-b border-[rgba(255,255,255,0.05)] pb-3">Tasks I Accepted</h2>

          {myCarries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[rgba(255,255,255,0.08)] p-10 text-center text-xs text-muted font-bold uppercase tracking-widest select-none">
              You haven&apos;t claimed any outside campus tasks yet
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {carryTransitions((style, req) => (
                <animated.div style={style} key={req.id}>
                  <div className="rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-6 bg-[#080d16]/30 hover:border-[#10b981]/30 transition-all duration-200 flex flex-col justify-between h-full space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">📍</span>
                          <div>
                            <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#cbd5e1] block">Destination</span>
                            <span className="font-display font-bold text-sm text-white block">{req.destination}</span>
                          </div>
                        </div>
                        <StatusBadge status={req.status.toLowerCase()} />
                      </div>

                      <p className="text-xs font-semibold text-white leading-relaxed line-clamp-2">
                        {req.description}
                      </p>

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div>
                          <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#cbd5e1] block">Reward</span>
                          <span className="text-xs font-black text-white">₹{req.final_reward ?? req.suggested_reward}</span>
                        </div>
                        <div>
                          <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#cbd5e1] block">Payment status</span>
                          <span className="text-[10px] font-bold text-[#cbd5e1] block uppercase tracking-wider">
                            {req.payment_status}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 text-[9px] font-extrabold text-muted uppercase tracking-wider">
                        Posted by: {req.profiles?.full_name || "Student"}
                      </div>
                    </div>

                    <Link
                      href={`/outside/${req.id}`}
                      className="neo-btn-primary w-full py-2.5 text-center text-xs font-extrabold uppercase tracking-widest bg-[#10b981] hover:bg-[#059669] text-white border-none block rounded-xl flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>Negotiation / Chat</span>
                    </Link>
                  </div>
                </animated.div>
              ))}
            </div>
          )}
        </div>

      </div>
    </SidebarShell>
  );
}
