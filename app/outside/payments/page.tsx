"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DollarSign, ArrowRight } from "lucide-react";
import { useTransition, animated } from "@react-spring/web";
import { supabase } from "@/lib/supabase/client";
import { SidebarShell } from "../../components/SidebarShell";
import { Alert } from "../../components/ui/Alert";
import { EmptyState } from "../../components/ui/EmptyState";

type PaymentRequest = {
  id: string;
  requester_id: string;
  carrier_id: string | null;
  description: string;
  destination: string;
  suggested_reward: number;
  final_reward: number | null;
  status: string;
  payment_status: string;
  profiles?: {
    full_name: string;
  };
};

export default function OutsidePaymentsPage() {
  const router = useRouter();

  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPayments() {
      setErrorMessage("");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setCurrentUserId(user.id);

      // Query requests where user is requester OR carrier and final_reward is not null
      const { data, error } = await supabase
        .from("outside_requests")
        .select(`
          id, requester_id, carrier_id, description, destination, suggested_reward, final_reward, status, payment_status,
          profiles:carrier_id ( full_name )
        `)
        .or(`requester_id.eq.${user.id},carrier_id.eq.${user.id}`)
        .not("carrier_id", "is", null)
        .order("updated_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error("Error loading payments list:", error);
        setErrorMessage("Failed to load your payments list.");
      } else {
        setPayments((data as unknown as PaymentRequest[]) || []);
      }
      setLoading(false);
    }

    loadPayments();

    const channel = supabase
      .channel("outside-payments-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "outside_requests",
        },
        () => {
          loadPayments();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [router]);

  const transitions = useTransition(payments, {
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
            Loading Payments...
          </p>
        </div>
      </main>
    );
  }

  return (
    <SidebarShell>
      <div className="p-6 sm:p-8 lg:p-10 space-y-8">
        
        {/* Title area */}
        <div className="border-b border-[rgba(255,255,255,0.08)] pb-6">
          <span className="text-xs font-bold uppercase tracking-widest text-[#10b981]">Real Money Payments</span>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-white leading-none">
            Outside Campus Payments
          </h1>
          <p className="mt-2 text-xs text-[#cbd5e1] font-semibold">
            Track payments, cash flows, and confirm transactions for outside campus deliveries.
          </p>
        </div>

        {errorMessage && <Alert tone="error">{errorMessage}</Alert>}

        {/* Empty state */}
        {!errorMessage && payments.length === 0 && (
          <EmptyState
            icon={<DollarSign className="h-10 w-10 text-[#10b981] animate-pulse" />}
            title="No payment records found"
            description="Payment entries are generated when outside requests are claimed and reward negotiation begins."
          />
        )}

        {/* Payments list */}
        <div className="max-w-4xl space-y-4">
          {transitions((style, pay) => {
            const isRequester = pay.requester_id === currentUserId;
            const amount = pay.final_reward ?? pay.suggested_reward;
            
            let statusText = "Pending";
            let statusColor = "text-[#eab308] border-[#eab308]/20 bg-[#eab308]/5";
            if (pay.payment_status === "Sent") {
              statusText = "Sent / Pending Confirmation";
              statusColor = "text-primary border-primary/20 bg-primary/5";
            } else if (pay.payment_status === "Confirmed" || pay.status === "COMPLETED") {
              statusText = "Confirmed & Paid";
              statusColor = "text-[#22c55e] border-[#22c55e]/20 bg-[#22c55e]/5";
            }

            return (
              <animated.div style={style} key={pay.id}>
                <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] p-6 bg-[#080d16]/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 hover:border-[#10b981]/30 transition-all duration-200">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">💰</span>
                      <h3 className="font-display font-bold text-base text-white">{pay.description}</h3>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted font-semibold">
                      <span>Destination: {pay.destination}</span>
                      <span className="text-[rgba(255,255,255,0.15)]">•</span>
                      <span>Flow: {isRequester ? "Outgoing (You → Carrier)" : "Incoming (Requester → You)"}</span>
                    </div>

                    <div className="pt-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[9px] font-bold uppercase tracking-wider border ${statusColor}`}>
                        Payment: {statusText}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center justify-between sm:flex-col sm:items-end gap-3 pt-3 sm:pt-0 border-t border-[rgba(255,255,255,0.04)] sm:border-none">
                    <div>
                      <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#cbd5e1] block sm:text-right">Transaction Reward</span>
                      <span className="font-display font-black text-xl text-white">₹{amount}</span>
                    </div>
                    
                    <Link
                      href={`/outside/${pay.id}`}
                      className="neo-btn-secondary px-5 py-2.5 text-[9px] font-extrabold uppercase tracking-widest border-[rgba(255,255,255,0.08)] bg-transparent hover:bg-white/5 flex items-center gap-1.5 rounded-xl"
                    >
                      <span>Details</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </animated.div>
            );
          })}
        </div>

      </div>
    </SidebarShell>
  );
}
