"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSpring, animated } from "@react-spring/web";
import { Mail, Bell, Shield, Info, Save, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { isDemoMode } from "@/lib/demoSession";
import { SidebarShell } from "../components/SidebarShell";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";

type PreferenceSection = {
  requests: boolean;
  payments: boolean;
  credits?: boolean;
  tasks: boolean;
  messages: boolean;
  reviews?: boolean;
};

type NotificationPreferences = {
  email: PreferenceSection;
  push: PreferenceSection;
};

const defaultPreferences: NotificationPreferences = {
  email: {
    requests: true,
    payments: true,
    credits: true,
    tasks: true,
    messages: false,
  },
  push: {
    requests: true,
    messages: true,
    payments: true,
    tasks: true,
    reviews: true,
  },
};

export default function NotificationSettingsPage() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<NotificationPreferences>(defaultPreferences);
  const [successMessage, setSuccessMessage] = useState("");
  const [browserPermission, setBrowserPermission] = useState<string>("default");
  const [loading, setLoading] = useState(true);

  async function handleDeactivate() {
    if (isDemoMode()) {
      alert("Account deactivation is disabled in Demo Mode. To exit demo mode, click 'Exit Demo' in the top banner.");
      return;
    }

    const confirm = window.confirm(
      "Are you sure you want to deactivate your account? This will anonymize your profile data, sign you out, and restrict future logins. Your historical records will be preserved."
    );
    if (!confirm) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: "Deactivated Student",
        status: "deactivated",
        college_id_url: null,
      })
      .eq("id", user.id);

    if (error) {
      alert("Error deactivating account: " + error.message);
    } else {
      await supabase.auth.signOut();
      router.replace("/login");
    }
  }

  useEffect(() => {
    async function loadPreferences() {
      setLoading(true);
      if (isDemoMode()) {
        if (typeof window !== "undefined" && "Notification" in window) {
          setBrowserPermission(Notification.permission);
        }
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading notification preferences:", error);
      } else if (data) {
        setPrefs({
          email: {
            requests: data.email_requests,
            payments: data.email_payments,
            credits: data.email_credits,
            tasks: data.email_tasks,
            messages: data.email_messages,
          },
          push: {
            requests: data.push_requests,
            messages: data.push_messages,
            payments: data.push_payments,
            tasks: data.push_tasks,
            reviews: data.push_reviews,
          },
        });
      } else {
        // Row doesn't exist, insert default preferences
        const { error: insertError } = await supabase
          .from("notification_preferences")
          .insert({ user_id: user.id });
        if (insertError) {
          console.error("Error inserting default preferences:", insertError);
        }
      }

      if (typeof window !== "undefined" && "Notification" in window) {
        setBrowserPermission(Notification.permission);
      }
      setLoading(false);
    }

    loadPreferences();
  }, []);

  function handleToggle(channel: "email" | "push", category: keyof PreferenceSection) {
    setPrefs((prev) => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [category]: !prev[channel][category],
      },
    }));
    setSuccessMessage("");
  }

  async function handleSave() {
    setSuccessMessage("");
    if (isDemoMode()) {
      setSuccessMessage("✓ Notification preferences saved successfully. (Demo Simulation)");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("notification_preferences")
      .upsert({
        user_id: user.id,
        email_requests: prefs.email.requests,
        email_payments: prefs.email.payments,
        email_credits: prefs.email.credits,
        email_tasks: prefs.email.tasks,
        email_messages: prefs.email.messages,
        push_requests: prefs.push.requests,
        push_messages: prefs.push.messages,
        push_payments: prefs.push.payments,
        push_tasks: prefs.push.tasks,
        push_reviews: prefs.push.reviews,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Error saving preferences:", error);
    } else {
      setSuccessMessage("✓ Notification preferences saved successfully.");
    }
  }

  async function requestPushPermission() {
    if (typeof window !== "undefined" && "Notification" in window) {
      const permission = await Notification.requestPermission();
      setBrowserPermission(permission);
      if (permission === "granted") {
        setSuccessMessage("✓ Browser push notifications enabled.");
      }
    }
  }

  const pageSpring = useSpring({
    from: { opacity: 0, transform: "translate3d(0, 15px, 0)" },
    to: { opacity: 1, transform: "translate3d(0, 0, 0)" },
    config: { tension: 320, friction: 24 },
  });

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05070b]">
        <div className="text-center">
          <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563eb] text-white shadow-glow animate-bounce mx-auto">
            <svg className="h-6 w-6 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
          </span>
          <p className="mt-5 text-[10px] font-extrabold tracking-widest text-[#cbd5e1] font-display uppercase">
            Loading Preferences...
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
          <span className="text-xs font-bold uppercase tracking-widest text-[#2563eb]">Settings</span>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-white leading-none">
            Notifications
          </h1>
          <p className="mt-2 text-xs text-[#cbd5e1] font-semibold">
            Choose how and when you want to receive updates about your requests and trips.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] items-start">
          <animated.div style={pageSpring} className="space-y-6">
            <div className="rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-6 sm:p-8 bg-[#080d16]/40 backdrop-blur-sm space-y-8">
              
              {/* Email Section */}
              <div className="space-y-4">
                <h3 className="font-display font-bold text-white text-lg flex items-center gap-2">
                  <Mail className="h-5 w-5 text-[#2563eb]" />
                  <span>Email Notifications</span>
                </h3>
                <p className="text-xs text-muted leading-relaxed font-semibold">
                  Receive transactional emails for important event updates.
                </p>
                <div className="space-y-3.5 pt-2">
                  {[
                    { key: "requests", label: "Request updates", desc: "Notification when someone accepts your request" },
                    { key: "payments", label: "Payment updates", desc: "Updates on reward proposals and payment receipt confirmations" },
                    { key: "credits", label: "Credit updates", desc: "Status of credit purchases and admin balance adjustments" },
                    { key: "tasks", label: "Task updates", desc: "Notifications when campus or outside runs complete" },
                    { key: "messages", label: "New messages", desc: "Emails for standard chat messages (disabled by default to avoid spam)" },
                  ].map((item) => (
                    <label key={item.key} className="flex items-start gap-3.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={prefs.email[item.key as keyof PreferenceSection] || false}
                        onChange={() => handleToggle("email", item.key as keyof PreferenceSection)}
                        className="mt-1 rounded border-[rgba(255,255,255,0.15)] bg-white/5 text-[#2563eb] focus:ring-[#2563eb] focus:ring-offset-[#080d16]"
                      />
                      <div>
                        <span className="text-xs font-bold text-white block">{item.label}</span>
                        <span className="text-[10px] text-muted font-semibold mt-0.5 block">{item.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <hr className="border-[rgba(255,255,255,0.06)]" />

              {/* Push Section */}
              <div className="space-y-4">
                <h3 className="font-display font-bold text-white text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5 text-[#2563eb]" />
                  <span>Browser Push Notifications</span>
                </h3>
                <p className="text-xs text-muted leading-relaxed font-semibold">
                  Receive real-time alerts in your browser when using UniFetch.
                </p>

                {browserPermission !== "granted" && (
                  <div className="p-4 rounded-2xl bg-[#ef4444]/5 border border-[#ef4444]/15 flex items-center justify-between gap-4">
                    <p className="text-xs text-[#cbd5e1] font-semibold">
                      Browser notification permissions are currently not granted.
                    </p>
                    <button
                      onClick={requestPushPermission}
                      className="px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-[#3b82f6] text-[10px] font-bold uppercase text-white shadow-glow shrink-0 transition-colors"
                    >
                      Enable Browser Alerts
                    </button>
                  </div>
                )}

                <div className="space-y-3.5 pt-2">
                  {[
                    { key: "requests", label: "Requests", desc: "Alerts when someone accepts your campus or outside request" },
                    { key: "messages", label: "Messages", desc: "Instant alert when a peer sends a chat message" },
                    { key: "payments", label: "Payments", desc: "Notifications when payment is marked sent or confirmed" },
                    { key: "tasks", label: "Tasks", desc: "Notifications when a delivery begins or completes" },
                    { key: "reviews", label: "Reviews", desc: "Notification when you receive a review rating" },
                  ].map((item) => (
                    <label key={item.key} className="flex items-start gap-3.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={prefs.push[item.key as keyof PreferenceSection] || false}
                        onChange={() => handleToggle("push", item.key as keyof PreferenceSection)}
                        className="mt-1 rounded border-[rgba(255,255,255,0.15)] bg-white/5 text-[#2563eb] focus:ring-[#2563eb] focus:ring-offset-[#080d16]"
                      />
                      <div>
                        <span className="text-xs font-bold text-white block">{item.label}</span>
                        <span className="text-[10px] text-muted font-semibold mt-0.5 block">{item.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {successMessage && <Alert tone="success">{successMessage}</Alert>}

              <Button
                onClick={handleSave}
                size="lg"
                className="w-full flex items-center justify-center gap-2 uppercase tracking-wider text-xs font-bold py-3.5 shadow-glow"
              >
                <Save className="h-4.5 w-4.5" />
                <span>Save Preferences</span>
              </Button>

            </div>
          </animated.div>

          {/* Right Information sidebar */}
          <div className="space-y-6 lg:sticky lg:top-[85px]">
            <div className="rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-6 bg-[#080d16]/30">
              <h4 className="font-display font-bold text-white flex items-center gap-2 border-b border-[rgba(255,255,255,0.08)] pb-3">
                <Shield className="h-4 w-4 text-[#2563eb]" />
                In-App Notification Policy
              </h4>
              <p className="mt-4 text-xs text-[#cbd5e1] font-semibold leading-relaxed">
                Critical in-app notifications (such as credit deductions, security OTPs, and system alerts) remain always enabled and cannot be turned off. This ensures you never miss critical actions on your tasks.
              </p>
            </div>

            <div className="rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-6 bg-[#080d16]/30">
              <h4 className="font-display font-bold text-white flex items-center gap-2 border-b border-[rgba(255,255,255,0.08)] pb-3">
                <Info className="h-4 w-4 text-[#2563eb]" />
                Realtime Updates
              </h4>
              <p className="mt-4 text-xs text-[#cbd5e1] font-semibold leading-relaxed">
                Real-time alerts appear instantly on the notification bell in the sidebar. You can mark individual notifications as read or clear them all in one click.
              </p>
            </div>

            <div className="rounded-[2rem] border border-red-500/20 p-6 bg-red-500/3">
              <h4 className="font-display font-bold text-red-400 flex items-center gap-2 border-b border-red-500/10 pb-3">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Account Settings
              </h4>
              <p className="mt-4 text-[10px] text-[#cbd5e1] font-semibold leading-relaxed">
                Deactivating your account will scrub your name and email, and log you out. Historical transactions will remain preserved for security auditing.
              </p>
              <button
                onClick={handleDeactivate}
                className="mt-4 w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-[10px] font-extrabold uppercase text-red-400 tracking-wider transition-all"
              >
                Deactivate Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </SidebarShell>
  );
}
