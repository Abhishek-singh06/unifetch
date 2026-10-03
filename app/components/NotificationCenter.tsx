"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, MessageSquare, Package, Star, CreditCard, Coins, CheckSquare, Info } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { isDemoMode, getDemoNotifications, markDemoNotificationRead } from "@/lib/demoSession";

type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
};

type Preferences = {
  email: { requests: boolean; payments: boolean; credits: boolean; tasks: boolean; messages: boolean };
  push: { requests: boolean; messages: boolean; payments: boolean; tasks: boolean; reviews: boolean };
};

const DEFAULT_PREFS: Preferences = {
  email: { requests: true, payments: true, credits: true, tasks: true, messages: false },
  push: { requests: true, messages: true, payments: true, tasks: true, reviews: true }
};

export default function NotificationCenter() {
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [pushPermission, setPushPermission] = useState<string>("default");
  const [showPushPrompt, setShowPushPrompt] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const prefsRef = useRef<Preferences>(DEFAULT_PREFS);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setPushPermission(Notification.permission);
      }, 0);
      if (Notification.permission === "default") {
        // Show our push permission prompt after 5 seconds if not yet set
        const timer = setTimeout(() => {
          setShowPushPrompt(true);
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  async function loadNotifications() {
    if (isDemoMode()) {
      const demoNotifs = getDemoNotifications();
      setNotifications(demoNotifs as Notification[]);
      setUnreadCount(demoNotifs.filter(n => !n.read).length);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error loading notifications:", error);
    } else if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    }

    // Load preferences from Supabase
    const { data: prefsData } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (prefsData) {
      prefsRef.current = {
        email: {
          requests: prefsData.email_requests,
          payments: prefsData.email_payments,
          credits: prefsData.email_credits,
          tasks: prefsData.email_tasks,
          messages: prefsData.email_messages,
        },
        push: {
          requests: prefsData.push_requests,
          messages: prefsData.push_messages,
          payments: prefsData.push_payments,
          tasks: prefsData.push_tasks,
          reviews: prefsData.push_reviews,
        }
      };
    }
  }

  useEffect(() => {
    // Initial load - wrapped in setTimeout to avoid synchronous setState in effect
    const initTimer = setTimeout(() => {
      loadNotifications();
    }, 0);

    if (isDemoMode()) {
      return () => clearTimeout(initTimer);
    }

    let channel: ReturnType<typeof supabase.channel>;

    async function setupSubscription() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channelName = `user-notifications-${user.id}-${Date.now()}`;
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotif = payload.new as Notification;
            setNotifications(prev => [newNotif, ...prev.slice(0, 19)]);
            setUnreadCount(prev => prev + 1);

            // Read preferences from refs cache
            const prefs = prefsRef.current;

            // Map notification type to preference category
            let emailCategory: "requests" | "payments" | "credits" | "tasks" | "messages" | null = null;
            let pushCategory: "requests" | "messages" | "payments" | "tasks" | "reviews" | null = null;

            if (["REQUEST_CREATED", "REQUEST_ACCEPTED"].includes(newNotif.type)) {
              emailCategory = "requests";
              pushCategory = "requests";
            } else if (["PAYMENT_DETAILS_SHARED", "PAYMENT_SENT", "PAYMENT_CONFIRMED"].includes(newNotif.type)) {
              emailCategory = "payments";
              pushCategory = "payments";
            } else if (["CREDIT_PURCHASE_SUBMITTED", "CREDITS_ADDED", "CREDIT_PURCHASE_REJECTED"].includes(newNotif.type)) {
              emailCategory = "credits";
            } else if (["TASK_IN_PROGRESS", "TASK_COMPLETED", "CARRIER_REWARD"].includes(newNotif.type)) {
              emailCategory = "tasks";
              pushCategory = "tasks";
            } else if (["NEW_MESSAGE", "REWARD_PROPOSAL"].includes(newNotif.type)) {
              emailCategory = "messages";
              pushCategory = "messages";
            } else if (newNotif.type === "NEW_REVIEW") {
              pushCategory = "reviews";
            }

            // Trigger local browser push notification
            const allowPush = pushCategory ? prefs.push[pushCategory] : true;
            if (
              allowPush &&
              typeof window !== "undefined" &&
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              new Notification(newNotif.title, {
                body: newNotif.message,
                icon: "/favicon.ico",
              });
            }

            // Send transactional email if enabled
            const allowEmail = emailCategory ? prefs.email[emailCategory] : true;
            if (allowEmail) {
              fetch("/api/notifications/send-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notificationId: newNotif.id }),
              }).catch(err => console.error("Failed to send email trigger:", err));
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadNotifications();
          }
        )
        .subscribe();
    }

    setupSubscription();

    return () => {
      clearTimeout(initTimer);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleMarkRead(id: string) {
    if (isDemoMode()) {
      markDemoNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      return;
    }

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);

    if (error) {
      console.error("Error marking notification read:", error);
    } else {
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }

  async function handleMarkAllRead() {
    if (isDemoMode()) {
      const demoNotifs = getDemoNotifications();
      demoNotifs.forEach(n => markDemoNotificationRead(n.id));
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);

    if (error) {
      console.error("Error marking all read:", error);
    } else {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  }

  function handleNotificationClick(notif: Notification) {
    if (!notif.read) {
      handleMarkRead(notif.id);
    }
    setIsOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  }

  async function requestNotificationPermission() {
    if (typeof window !== "undefined" && "Notification" in window) {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      setShowPushPrompt(false);
    }
  }

  function getIcon(type: string) {
    switch (type) {
      case "REQUEST_ACCEPTED":
      case "REQUEST_CREATED":
      case "TASK_COMPLETED":
        return <Package className="h-4 w-4 text-[#2563eb]" />;
      case "NEW_MESSAGE":
        return <MessageSquare className="h-4 w-4 text-[#10b981]" />;
      case "REWARD_PROPOSAL":
      case "REWARD_AGREED":
        return <Coins className="h-4 w-4 text-[#f59e0b]" />;
      case "PAYMENT_DETAILS_SHARED":
      case "PAYMENT_SENT":
      case "PAYMENT_CONFIRMED":
        return <CreditCard className="h-4 w-4 text-[#8b5cf6]" />;
      case "NEW_REVIEW":
        return <Star className="h-4 w-4 text-[#eab308]" fill="#eab308" />;
      case "CREDIT_PURCHASE_SUBMITTED":
      case "CREDITS_ADDED":
      case "CREDIT_PURCHASE_REJECTED":
        return <Coins className="h-4 w-4 text-[#3b82f6]" />;
      default:
        return <Bell className="h-4 w-4 text-muted" />;
    }
  }

  function timeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        className="relative h-9 w-9 flex items-center justify-center rounded-xl bg-white/5 border border-[rgba(255,255,255,0.08)] text-[#cbd5e1] hover:text-white hover:bg-white/10 active:scale-[0.95] transition-all duration-200"
        aria-label="Notifications"
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#ef4444] text-[9px] font-black text-white border border-[#05070b] animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#080d16] p-5 shadow-2xl z-50 animate-fade-in max-h-[80vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] pb-3 mb-4">
            <div>
              <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#2563eb] block">Updates</span>
              <h3 className="font-display font-bold text-sm text-white mt-0.5">Notifications</h3>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[9px] font-extrabold uppercase tracking-wider text-[#2563eb] hover:text-[#3b82f6] flex items-center gap-1"
              >
                <CheckSquare className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* Push Permission Prompt inside Panel */}
          {showPushPrompt && pushPermission === "default" && (
            <div className="mb-4 p-3 rounded-2xl bg-[#2563eb]/5 border border-[#2563eb]/20 space-y-2 text-left">
              <div className="flex items-start gap-2">
                <Info className="h-4.5 w-4.5 text-[#2563eb] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-white">Enable Push Updates</h4>
                  <p className="text-[10px] text-[#cbd5e1] font-semibold mt-1">
                    Want updates when someone responds to your request?
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowPushPrompt(false)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[9px] font-bold uppercase text-white"
                >
                  Not Now
                </button>
                <button
                  onClick={requestNotificationPermission}
                  className="px-2.5 py-1 rounded-lg bg-[#2563eb] hover:bg-[#3b82f6] text-[9px] font-bold uppercase text-white shadow-glow"
                >
                  Enable
                </button>
              </div>
            </div>
          )}

          {/* List */}
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted">
              <Bell className="h-8 w-8 mx-auto opacity-20 mb-2" />
              <p className="text-[10px] font-bold uppercase tracking-wider">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-[rgba(255,255,255,0.04)] max-h-[50vh] overflow-y-auto pr-1">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`py-3.5 flex items-start gap-3.5 cursor-pointer group hover:bg-white/2 px-2 rounded-2xl transition-colors duration-150 ${
                    !notif.read ? "bg-[#2563eb]/3" : ""
                  }`}
                >
                  <div className={`h-8 w-8 rounded-xl flex items-center justify-center bg-white/5 border border-white/5 group-hover:bg-white/10 shrink-0`}>
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold truncate ${!notif.read ? "text-white" : "text-[#cbd5e1]"}`}>
                        {notif.title}
                      </span>
                      <span className="text-[8px] text-muted font-semibold shrink-0">
                        {timeAgo(notif.created_at)}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted mt-1 leading-relaxed truncate group-hover:text-[#cbd5e1]">
                      {notif.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
