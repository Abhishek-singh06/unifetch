"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  MapPin, Calendar, Coins,
  Send, ShieldAlert, Check, X, Phone, Mail, Award, AlertCircle
} from "lucide-react";
import { useSpring, animated } from "@react-spring/web";
import { supabase } from "@/lib/supabase/client";
import { SidebarShell } from "../../components/SidebarShell";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { StatusBadge } from "../../components/ui/StatusBadge";

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
  final_reward: number | null;
  status: string;
  payment_status: string;
  payment_qr_url: string | null;
  contact_shared: boolean;
  requester_contact: string | null;
  carrier_contact: string | null;
};

type Message = {
  id: string;
  request_id: string;
  sender_id: string | null;
  content: string;
  is_system: boolean;
  proposal_amount: number | null;
  proposal_status: string | null;
  created_at: string;
};

export default function OutsideRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;

  const [request, setRequest] = useState<OutsideRequest | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentProfileName, setCurrentProfileName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [proposalAmount, setProposalAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  
  const [errorMessage, setErrorMessage] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!requestId) return;

    let cancelled = false;

    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      if (!cancelled) {
        setCurrentUserId(user.id);
      }

      // Load request
      const { data: reqData, error: reqError } = await supabase
        .from("outside_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      if (reqError) {
        console.error("Error loading request:", reqError);
        if (!cancelled) setErrorMessage("Failed to load task details.");
        setLoading(false);
        return;
      }

      if (reqData && !cancelled) {
        setRequest(reqData);
      }

      // Load profile name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      
      if (profile && !cancelled) {
        setCurrentProfileName(profile.full_name || "Student");
      }

      // Load messages
      const { data: msgData, error: msgError } = await supabase
        .from("outside_messages")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });

      if (msgError) {
        console.error("Error loading messages:", msgError);
      } else if (!cancelled) {
        setMessages(msgData || []);
      }

      setLoading(false);
    }

    loadData();

    // Subscribe to changes on requests and messages
    const requestChannel = supabase
      .channel(`outside-request-${requestId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "outside_requests", filter: `id=eq.${requestId}` },
        (payload) => {
          if (!cancelled && payload.new) {
            setRequest(payload.new as OutsideRequest);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "outside_messages", filter: `request_id=eq.${requestId}` },
        (payload) => {
          if (!cancelled && payload.new) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.new.id)) return prev;
              return [...prev, payload.new as Message];
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "outside_messages", filter: `request_id=eq.${requestId}` },
        (payload) => {
          if (!cancelled && payload.new) {
            setMessages((prev) =>
              prev.map((m) => (m.id === payload.new.id ? (payload.new as Message) : m))
            );
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(requestChannel);
    };
  }, [requestId, router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Actions

  async function handleSendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !request) return;

    const content = newMessage.trim();
    setNewMessage("");

    await supabase.from("outside_messages").insert({
      request_id: request.id,
      sender_id: currentUserId,
      content,
      is_system: false
    });
  }

  async function handleJoinNegotiation() {
    if (!request || request.requester_id === currentUserId) return;

    // Join task as carrier using secure RPC
    const { error } = await supabase.rpc("claim_outside_request", {
      p_request_id: request.id
    });

    if (error) {
      setErrorMessage("Failed to claim task: " + error.message);
      return;
    }
  }

  async function handleProposeReward() {
    const amount = parseInt(proposalAmount, 10);
    if (isNaN(amount) || amount <= 0 || !request) {
      setErrorMessage("Please enter a valid amount to propose.");
      return;
    }

    setProposalAmount("");

    // Propose reward using secure RPC
    const { error } = await supabase.rpc("propose_outside_reward", {
      p_request_id: request.id,
      p_amount: amount
    });

    if (error) {
      setErrorMessage("Failed to propose reward: " + error.message);
    }
  }

  async function handleAcceptProposal(msgId: string, amount: number) {
    if (!request) return;

    // Accept proposal using secure RPC
    const { error } = await supabase.rpc("accept_outside_reward", {
      p_request_id: request.id,
      p_amount: amount
    });

    if (error) {
      setErrorMessage("Failed to accept proposal: " + error.message);
    }
  }

  async function handleRejectProposal(msgId: string) {
    if (!request) return;

    // Update proposal message status to rejected (allowed via RLS UPDATE policy)
    const { error } = await supabase
      .from("outside_messages")
      .update({ proposal_status: "rejected" })
      .eq("id", msgId);

    if (error) {
      setErrorMessage("Failed to reject proposal: " + error.message);
      return;
    }

    // Send a system-like notification text as the student (since triggers don't run on individual message proposal updates)
    await supabase.from("outside_messages").insert({
      request_id: request.id,
      sender_id: currentUserId,
      content: `The reward proposal of ₹${request.suggested_reward} was rejected.`,
      is_system: false
    });
  }

  async function handleShareContact(type: "phone" | "email") {
    if (!request) return;

    let contactDetail = "";
    if (type === "phone") {
      const num = prompt("Enter the phone number you wish to share:");
      if (!num) return;
      contactDetail = `Phone: ${num}`;
    } else {
      const email = prompt("Enter the email address you wish to share:");
      if (!email) return;
      contactDetail = `Email: ${email}`;
    }

    // Update request record contact details using secure RPC
    await supabase.rpc("share_outside_contact", {
      p_request_id: request.id,
      p_contact: contactDetail
    });

    // Insert user message in chat
    await supabase.from("outside_messages").insert({
      request_id: request.id,
      sender_id: currentUserId,
      content: `[CONTACT INFO SHARED] ${contactDetail}`,
      is_system: false
    });
  }

  async function handleSetUpiId() {
    if (!upiId.trim() || !request) return;

    // Generate dynamic QR code matching requested payment details
    const upiUrl = `upi://pay?pa=${upiId.trim()}&pn=${encodeURIComponent(currentProfileName)}&am=${request.final_reward ?? request.suggested_reward}&cu=INR`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;

    await supabase.rpc("set_outside_payment_qr", {
      p_request_id: request.id,
      p_qr_url: qrUrl
    });

    setUpiId("");
  }

  async function handleMarkPaid() {
    if (!request) return;

    await supabase.rpc("mark_outside_payment_sent", {
      p_request_id: request.id
    });
  }

  async function handleConfirmPaid() {
    if (!request) return;

    await supabase.rpc("confirm_outside_payment_received", {
      p_request_id: request.id
    });
  }

  async function handleStartTask() {
    if (!request) return;

    await supabase.rpc("start_outside_task", {
      p_request_id: request.id
    });
  }

  async function handleCompleteTask() {
    if (!request) return;

    await supabase.rpc("complete_outside_task", {
      p_request_id: request.id
    });
  }

  async function handleCancelTask() {
    if (!request) return;
    if (!confirm("Are you sure you want to cancel this task?")) return;

    await supabase.rpc("cancel_outside_request", {
      p_request_id: request.id
    });
  }

  const slideSpring = useSpring({
    from: { opacity: 0, transform: "translate3d(15px, 0, 0)" },
    to: { opacity: 1, transform: "translate3d(0, 0, 0)" },
    config: { tension: 300, friction: 23 },
  });

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05070b]">
        <div className="text-center">
          <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[#10b981] text-white shadow-glow animate-bounce mx-auto">
            <svg className="h-6 w-6 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
          </span>
          <p className="mt-5 text-[10px] font-extrabold tracking-widest text-[#cbd5e1] font-display uppercase">
            Loading Task...
          </p>
        </div>
      </main>
    );
  }

  if (!request) {
    return (
      <SidebarShell>
        <div className="p-8 text-center">
          <Alert tone="error">Task request not found or deleted.</Alert>
          <Link href="/outside/browse" className="mt-4 inline-block text-xs font-bold text-[#10b981] uppercase tracking-wider underline">
            Go back to Browse Feed
          </Link>
        </div>
      </SidebarShell>
    );
  }

  const isRequester = request.requester_id === currentUserId;
  const isCarrier = request.carrier_id === currentUserId;
  const isParticipant = isRequester || isCarrier;

  return (
    <SidebarShell>
      <div className="p-6 sm:p-8 lg:p-10 flex flex-col h-[calc(100vh-69px)] md:h-screen overflow-hidden">
        {errorMessage && (
          <Alert tone="error" className="mb-4">{errorMessage}</Alert>
        )}

        {/* Top Header */}
        <div className="border-b border-[rgba(255,255,255,0.08)] pb-4 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div>
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#10b981]">Outside Campus Task Detail</span>
            <h1 className="mt-1 font-display text-xl font-bold text-white leading-tight">
              {request.description}
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-muted font-semibold mt-1">
              <MapPin className="h-3.5 w-3.5 text-[#10b981]" />
              <span>{request.destination}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={request.status.toLowerCase()} />
            {isParticipant && request.status !== "COMPLETED" && request.status !== "CANCELLED" && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCancelTask}
                className="text-xs text-[#ef4444] border-[rgba(255,255,255,0.08)] hover:bg-[#ef4444]/10 rounded-xl px-4 py-1.5"
              >
                Cancel Task
              </Button>
            )}
          </div>
        </div>

        {/* Message Panels Split */}
        <div className="flex-1 min-h-0 grid gap-6 lg:grid-cols-[1.5fr_1fr] py-6 overflow-hidden">
          
          {/* Left Side: Chat Area */}
          <div className="rounded-[2.5rem] border border-[rgba(255,255,255,0.08)] bg-[#080d16]/30 flex flex-col overflow-hidden h-full relative">
            {!isParticipant ? (
              // Non-participant view
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <ShieldAlert className="h-12 w-12 text-[#10b981] animate-pulse" />
                <h3 className="font-display font-bold text-lg text-white">Join Negotiation</h3>
                <p className="text-xs text-[#cbd5e1] font-semibold max-w-sm">
                  You are not part of this task negotiation. Students heading outside campus can click below to offer help.
                </p>
                <Button
                  onClick={handleJoinNegotiation}
                  className="bg-[#10b981] hover:bg-[#059669] text-white border-none px-6 py-3 text-xs font-bold uppercase tracking-wider rounded-xl shadow-glow-emerald"
                >
                  Start Negotiation as Carrier
                </Button>
              </div>
            ) : (
              // Active chat panel
              <>
                {/* Chat Header controls */}
                <div className="px-6 py-3 border-b border-[rgba(255,255,255,0.06)] bg-white/2 flex items-center justify-between text-xs text-muted font-bold uppercase tracking-wider shrink-0">
                  <span>Chat Conversation</span>
                  
                  {/* Share Contact Control */}
                  <div className="flex items-center gap-2">
                    <span className="text-[9px]">Share:</span>
                    <button
                      onClick={() => handleShareContact("phone")}
                      className="px-2.5 py-1 rounded bg-white/5 border border-[rgba(255,255,255,0.08)] hover:bg-white/10 text-white flex items-center gap-1 transition-colors"
                      title="Share Phone Number"
                    >
                      <Phone className="h-3 w-3" />
                      <span>Phone</span>
                    </button>
                    <button
                      onClick={() => handleShareContact("email")}
                      className="px-2.5 py-1 rounded bg-white/5 border border-[rgba(255,255,255,0.08)] hover:bg-white/10 text-white flex items-center gap-1 transition-colors"
                      title="Share Email"
                    >
                      <Mail className="h-3 w-3" />
                      <span>Email</span>
                    </button>
                  </div>
                </div>

                {/* Messages feed */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  {messages.map((msg) => {
                    if (msg.is_system) {
                      // System alert message
                      return (
                        <div key={msg.id} className="flex justify-center my-2">
                          <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-white/2 px-4 py-2 text-[10px] font-bold text-muted uppercase tracking-widest text-center max-w-md">
                            {msg.content}
                            
                            {/* Proposal acceptance option */}
                            {msg.proposal_amount && msg.proposal_status === "pending" && (
                              <div className="mt-2.5 flex items-center justify-center gap-3">
                                {msg.sender_id !== currentUserId ? (
                                  <>
                                    <button
                                      onClick={() => handleAcceptProposal(msg.id, msg.proposal_amount!)}
                                      className="px-3.5 py-1 rounded-lg bg-[#22c55e] text-white flex items-center gap-1 hover:bg-[#16a34a] font-bold text-[9px]"
                                    >
                                      <Check className="h-3 w-3" />
                                      <span>Accept Proposal</span>
                                    </button>
                                    <button
                                      onClick={() => handleRejectProposal(msg.id)}
                                      className="px-3.5 py-1 rounded-lg bg-[#ef4444] text-white flex items-center gap-1 hover:bg-[#dc2626] font-bold text-[9px]"
                                    >
                                      <X className="h-3 w-3" />
                                      <span>Reject</span>
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-[8px] italic text-[#eab308]">Waiting for response...</span>
                                )}
                              </div>
                            )}

                            {msg.proposal_status === "accepted" && (
                              <div className="mt-1 text-[#22c55e] text-[9px] font-extrabold uppercase">Accepted ✓</div>
                            )}
                            {msg.proposal_status === "rejected" && (
                              <div className="mt-1 text-[#ef4444] text-[9px] font-extrabold uppercase">Rejected ✗</div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    const isMe = msg.sender_id === currentUserId;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`rounded-2xl px-4 py-3 text-xs max-w-sm ${
                          isMe 
                            ? "bg-[#10b981] text-white font-semibold rounded-br-none" 
                            : "bg-white/5 border border-[rgba(255,255,255,0.06)] text-[#cbd5e1] font-semibold rounded-bl-none"
                        }`}>
                          <p className="break-words leading-relaxed">{msg.content}</p>
                          <span className="text-[8px] opacity-60 block text-right mt-1 font-bold">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* Message input */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-[rgba(255,255,255,0.08)] bg-white/1 flex items-center gap-3 shrink-0">
                  <input
                    type="text"
                    placeholder="Type your message here..."
                    className="flex-1 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#05070b]/60 px-4 py-3 text-xs font-semibold text-white placeholder-muted focus:outline-none focus:border-[#10b981] transition-colors"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="h-10 w-10 rounded-xl bg-[#10b981] text-white flex items-center justify-center hover:bg-[#059669] transition-colors shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Right Side: Task Status & Details */}
          <animated.div style={slideSpring} className="space-y-6 overflow-y-auto pr-1 h-full">
            
            {/* Reward & Negotiation Panel */}
            {isParticipant && (
              <div className="rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-6 bg-[#080d16]/30 space-y-4">
                <h3 className="font-display font-bold text-white flex items-center gap-2">
                  <Award className="h-5 w-5 text-[#10b981]" />
                  <span>Reward Proposal</span>
                </h3>
                
                <div className="grid grid-cols-2 gap-4 border-b border-[rgba(255,255,255,0.06)] pb-4">
                  <div>
                    <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#cbd5e1] block">Suggested Cash Offer</span>
                    <span className="text-lg font-black text-white">₹{request.suggested_reward}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#cbd5e1] block">Agreed Reward</span>
                    <span className="text-lg font-black text-[#10b981]">{request.final_reward ? `₹${request.final_reward}` : "Negotiating..."}</span>
                  </div>
                </div>

                {request.status === "NEGOTIATING" && (
                  <div className="space-y-3">
                    <label className="text-[8px] font-extrabold uppercase tracking-widest text-[#cbd5e1] block">
                      Propose new amount (₹)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="e.g. 150"
                        className="flex-1 px-3 py-2 border border-[rgba(255,255,255,0.08)] bg-white/5 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-[#10b981]"
                        value={proposalAmount}
                        onChange={(e) => setProposalAmount(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={handleProposeReward}
                        className="px-4 py-2 bg-white/5 border border-[rgba(255,255,255,0.08)] text-white hover:bg-white/10 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors shrink-0"
                      >
                        Propose
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Payment & QR flow panel */}
            {isParticipant && request.status !== "OPEN" && request.status !== "NEGOTIATING" && (
              <div className="rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-6 bg-[#080d16]/30 space-y-4">
                <h3 className="font-display font-bold text-white flex items-center gap-2 border-b border-[rgba(255,255,255,0.06)] pb-3">
                  <Coins className="h-5 w-5 text-[#10b981]" />
                  <span>Real Money Payment</span>
                </h3>

                {isCarrier && !request.payment_qr_url && (
                  <div className="space-y-3">
                    <p className="text-[10px] text-muted font-semibold leading-relaxed">
                      Upload your UPI ID to generate a payment QR code for the requester to scan.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="UPI ID (e.g. name@upi)"
                        className="flex-1 px-3 py-2 border border-[rgba(255,255,255,0.08)] bg-white/5 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-[#10b981]"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={handleSetUpiId}
                        className="px-4 py-2 bg-[#10b981] text-white hover:bg-[#059669] text-xs font-bold uppercase tracking-wider rounded-xl transition-colors shrink-0 border-none"
                      >
                        Generate QR
                      </button>
                    </div>
                  </div>
                )}

                {request.payment_qr_url && (
                  <div className="flex flex-col items-center justify-center p-4 bg-[#05070b]/60 rounded-2xl border border-[rgba(255,255,255,0.04)] text-center space-y-3">
                    <p className="text-[9px] font-extrabold uppercase tracking-widest text-[#cbd5e1]">UPI QR SCAN &amp; PAY</p>
                    {/* Embedded QR Image */}
                    <img 
                      src={request.payment_qr_url} 
                      alt="UPI QR Code" 
                      className="w-[180px] h-[180px] bg-white p-2 rounded-xl"
                    />
                    <div className="text-[10px] text-[#cbd5e1] font-semibold">
                      Agreed Reward: <span className="text-white font-black text-xs">₹{request.final_reward ?? request.suggested_reward}</span>
                    </div>

                    {isRequester && request.payment_status === "Pending" && (
                      <Button
                        onClick={handleMarkPaid}
                        className="bg-[#10b981] hover:bg-[#059669] text-white px-5 py-2 text-[10px] font-bold uppercase tracking-widest border-none w-full shadow-glow-emerald"
                      >
                        Mark Payment as Sent
                      </Button>
                    )}

                    {isCarrier && request.payment_status === "Sent" && (
                      <Button
                        onClick={handleConfirmPaid}
                        className="bg-[#10b981] hover:bg-[#059669] text-white px-5 py-2 text-[10px] font-bold uppercase tracking-widest border-none w-full shadow-glow-emerald"
                      >
                        Confirm Payment Received
                      </Button>
                    )}

                    {request.payment_status === "Sent" && !isCarrier && (
                      <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full uppercase font-bold tracking-wider animate-pulse">
                        Payment Sent • Pending Carrier Confirmation
                      </span>
                    )}

                    {request.payment_status === "Confirmed" && (
                      <span className="text-[9px] bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 px-3 py-1 rounded-full uppercase font-bold tracking-wider">
                        Payment Confirmed &amp; Paid ✓
                      </span>
                    )}
                  </div>
                )}

                {!request.payment_qr_url && (
                  <div className="text-center py-6 text-xs text-muted font-bold uppercase tracking-widest border border-dashed border-[rgba(255,255,255,0.08)] rounded-xl">
                    Waiting for Carrier UPI QR
                  </div>
                )}
              </div>
            )}

            {/* Carrier Task Controls */}
            {isCarrier && (
              <div className="rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-6 bg-[#080d16]/30 space-y-4">
                <h3 className="font-display font-bold text-white flex items-center gap-2 border-b border-[rgba(255,255,255,0.06)] pb-3">
                  <AlertCircle className="h-5 w-5 text-[#10b981]" />
                  <span>Task Execution</span>
                </h3>

                {request.status === "PAID" && (
                  <Button
                    onClick={handleStartTask}
                    className="w-full bg-[#10b981] hover:bg-[#059669] text-white border-none py-3 text-xs font-bold uppercase tracking-wider rounded-xl shadow-glow-emerald"
                  >
                    Start Task (In Progress)
                  </Button>
                )}

                {request.status === "IN PROGRESS" && (
                  <Button
                    onClick={handleCompleteTask}
                    className="w-full bg-[#10b981] hover:bg-[#059669] text-white border-none py-3 text-xs font-bold uppercase tracking-wider rounded-xl shadow-glow-emerald"
                  >
                    Mark Task as Completed
                  </Button>
                )}

                {request.status !== "PAID" && request.status !== "IN PROGRESS" && (
                  <p className="text-[10px] text-muted font-semibold leading-relaxed text-center">
                    Action items will appear once payment is settled. Current status: <span className="text-white font-bold">{request.status}</span>.
                  </p>
                )}
              </div>
            )}

            {/* Task Details panel */}
            <div className="rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-6 bg-[#080d16]/30 space-y-4">
              <h3 className="font-display font-bold text-white border-b border-[rgba(255,255,255,0.06)] pb-3">Task Details</h3>
              
              <div className="space-y-4 text-xs font-semibold text-[#cbd5e1]">
                <div>
                  <span className="text-[8px] font-extrabold uppercase tracking-widest text-muted block mb-1">Description</span>
                  <p className="text-white">{request.description}</p>
                </div>

                <div>
                  <span className="text-[8px] font-extrabold uppercase tracking-widest text-muted block mb-1">Destination</span>
                  <p className="text-white flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-[#10b981]" />
                    {request.destination}
                  </p>
                </div>

                <div>
                  <span className="text-[8px] font-extrabold uppercase tracking-widest text-muted block mb-1">Instructions</span>
                  <p className="text-white whitespace-pre-wrap">{request.instructions || "No additional instructions provided."}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[rgba(255,255,255,0.04)]">
                  <div>
                    <span className="text-[8px] font-extrabold uppercase tracking-widest text-muted block mb-1">Preferred Date</span>
                    <p className="text-white flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-[#10b981]" />
                      {new Date(request.preferred_date).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <div>
                    <span className="text-[8px] font-extrabold uppercase tracking-widest text-muted block mb-1">Contact Sharing</span>
                    <p className="text-white">
                      {request.contact_shared ? "Shared ✓" : "Protected 🔒"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </animated.div>

        </div>

      </div>
    </SidebarShell>
  );
}
