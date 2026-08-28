"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquare, MapPin } from "lucide-react";
import { useTransition, animated } from "@react-spring/web";
import { supabase } from "@/lib/supabase/client";
import { SidebarShell } from "../../components/SidebarShell";
import { Alert } from "../../components/ui/Alert";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatusBadge } from "../../components/ui/StatusBadge";

type ChatRequest = {
  id: string;
  requester_id: string;
  carrier_id: string | null;
  description: string;
  destination: string;
  status: string;
  requesterProfile?: {
    full_name: string;
  };
  carrierProfile?: {
    full_name: string;
  };
};

export default function OutsideMessagesPage() {
  const router = useRouter();

  const [chats, setChats] = useState<ChatRequest[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadChats() {
      setErrorMessage("");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setCurrentUserId(user.id);

      // Query requests where user is requester OR carrier and carrier_id is not null
      const { data, error } = await supabase
        .from("outside_requests")
        .select(`
          id, requester_id, carrier_id, description, destination, status,
          requesterProfile:requester_id ( full_name ),
          carrierProfile:carrier_id ( full_name )
        `)
        .or(`requester_id.eq.${user.id},carrier_id.eq.${user.id}`)
        .not("carrier_id", "is", null)
        .order("updated_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error("Error loading chat list:", error);
        setErrorMessage("Failed to load your chat list.");
      } else {
        setChats((data as unknown as ChatRequest[]) || []);
      }
      setLoading(false);
    }

    loadChats();

    const channel = supabase
      .channel("outside-chats-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "outside_requests",
        },
        () => {
          loadChats();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [router]);

  const transitions = useTransition(chats, {
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
            Loading Chat Threads...
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
          <span className="text-xs font-bold uppercase tracking-widest text-[#10b981]">In-App Communication</span>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-white leading-none">
            Negotiations &amp; Chats
          </h1>
          <p className="mt-2 text-xs text-[#cbd5e1] font-semibold">
            Negotiate rewards, clarify details, and track payouts with fellow students.
          </p>
        </div>

        {errorMessage && <Alert tone="error">{errorMessage}</Alert>}

        {/* Empty state */}
        {!errorMessage && chats.length === 0 && (
          <EmptyState
            icon={<MessageSquare className="h-10 w-10 text-[#10b981] animate-pulse" />}
            title="No active chats"
            description="You don't have any active chats yet. Go to the Browse feed to claim a task, or create a request to get started."
          />
        )}

        {/* Chat list */}
        <div className="max-w-3xl space-y-4">
          {transitions((style, chat) => {
            const isRequester = chat.requester_id === currentUserId;
            const partnerName = isRequester 
              ? chat.carrierProfile?.full_name || "Carrier" 
              : chat.requesterProfile?.full_name || "Requester";
            const roleLabel = isRequester ? "Carrier" : "Requester";

            return (
              <animated.div style={style} key={chat.id}>
                <Link
                  href={`/outside/${chat.id}`}
                  className="rounded-2xl border border-[rgba(255,255,255,0.08)] p-5 bg-[#080d16]/30 hover:border-[#10b981]/30 transition-all duration-200 flex items-center justify-between gap-4 block"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-white/5 border border-[rgba(255,255,255,0.08)] flex items-center justify-center font-display font-bold text-xs text-[#10b981]">
                      {partnerName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{partnerName}</span>
                        <span className="text-[8px] bg-white/5 border border-[rgba(255,255,255,0.08)] text-muted px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                          {roleLabel}
                        </span>
                      </div>
                      <p className="text-xs text-[#cbd5e1] font-semibold mt-1 truncate max-w-[200px] sm:max-w-sm">
                        {chat.description}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted font-semibold uppercase tracking-wider mt-1.5">
                        <MapPin className="h-3.5 w-3.5 text-[#10b981]" />
                        <span>{chat.destination}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-2">
                    <StatusBadge status={chat.status.toLowerCase()} />
                    <span className="text-[10px] text-[#10b981] font-extrabold uppercase tracking-widest block">
                      Open Chat ➔
                    </span>
                  </div>
                </Link>
              </animated.div>
            );
          })}
        </div>

      </div>
    </SidebarShell>
  );
}
