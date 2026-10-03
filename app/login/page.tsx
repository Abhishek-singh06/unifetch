"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ShieldCheck, Quote, ArrowRight, Mail, Lock } from "lucide-react";
import { useSpring, animated } from "@react-spring/web";
import { supabase } from "@/lib/supabase/client";
import { disableDemoMode } from "@/lib/demoSession";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { Alert } from "../components/ui/Alert";

export default function LoginPage() {
  const router = useRouter();

  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { data: loginData, error: loginError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (loginError) {
      setErrorMessage(loginError.message);
      setIsLoading(false);
      return;
    }

    if (!loginData.user) {
      setErrorMessage("Unable to get your account details.");
      setIsLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("verification_status, college_id_url, status")
      .eq("id", loginData.user.id)
      .single();

    if (profileError) {
      console.error("Profile error:", profileError);
      setErrorMessage("Your account was created, but we could not check your verification status.");
      setIsLoading(false);
      return;
    }

    if (profile.status === "deactivated") {
      await supabase.auth.signOut();
      setErrorMessage("This account has been deactivated.");
      setIsLoading(false);
      return;
    }

    disableDemoMode();

    if (
      profile.verification_status === "approved" ||
      profile.verification_status === "verified" ||
      profile.verification_status === "submitted" ||
      profile.verification_status === "id_submitted"
    ) {
      router.push("/");
      router.refresh();
      return;
    }

    if (
      profile.verification_status === "pending" ||
      profile.verification_status === "rejected"
    ) {
      router.push("/verification");
      router.refresh();
      return;
    }

    setErrorMessage("Your verification status could not be determined. Please contact support.");
    setIsLoading(false);
  }

  // React Spring animations for split panels
  const leftPanelSpring = useSpring({
    from: { opacity: 0, transform: "translate3d(-25px, 0, 0)" },
    to: { opacity: 1, transform: "translate3d(0, 0, 0)" },
    config: { tension: 280, friction: 24 },
  });

  const rightPanelSpring = useSpring({
    from: { opacity: 0, transform: "translate3d(25px, 0, 0)" },
    to: { opacity: 1, transform: "translate3d(0, 0, 0)" },
    config: { tension: 280, friction: 24 },
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#05070b] p-4 selection:bg-[#2563eb]/20 sm:p-6 lg:p-8 grid-bg">
      <div className="grid min-h-[620px] w-full max-w-5xl overflow-hidden rounded-[2.5rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] shadow-glow lg:grid-cols-[1fr_1.1fr]">
        
        {/* Left: brand panel */}
        <animated.aside
          style={leftPanelSpring}
          className="relative hidden flex-col justify-between overflow-hidden bg-[#080d16] p-10 text-white lg:flex border-r border-[rgba(255,255,255,0.08)]"
        >
          {/* Subtle blue mesh background glow */}
          <div className="absolute -right-24 -bottom-24 h-80 w-80 rounded-full bg-[#2563eb]/15 blur-3xl pointer-events-none" />
          <div className="absolute right-10 top-10 h-40 w-40 rounded-full bg-[#2563eb]/5 blur-2xl pointer-events-none" />

          <Link href="/" className="relative z-10 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white border border-primary/20 shadow-primary">
              <svg className="h-5.5 w-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" />
                <path d="m4.5 7.7 7.5 4.2 7.5-4.2M12 12v9" />
              </svg>
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-white">UniFetch</span>
          </Link>

          <div className="relative z-10 my-auto space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2563eb]/20 bg-[#2563eb]/6 px-4 py-2 text-[9px] font-extrabold uppercase tracking-widest text-[#2563eb] shadow-sm">
              <ShieldCheck className="h-4 w-4" />
              <span>Welcome back</span>
            </div>

            <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tighter text-white">
              Your campus community is moving packages.
            </h1>

            <p className="text-xs leading-relaxed text-[#cbd5e1] font-semibold">
              Sign in to track your gate deliveries or pocket credits carrying parcels for dorm neighbors.
            </p>

            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#05070b]/55 p-6 shadow-glow">
              <Quote className="h-5 w-5 text-primary" />
              <p className="mt-3 text-xs italic leading-relaxed text-[#cbd5e1] font-semibold">
                {"\"UniFetch saved me 25 minutes of walking in the rain yesterday. The OTP handoff is super smooth.\""}
              </p>
              <p className="mt-3.5 text-[9px] font-extrabold text-[#2563eb] uppercase tracking-widest leading-none">
                — Tanvi M., CS 3rd Year
              </p>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-2 text-xs font-bold text-[#cbd5e1] uppercase tracking-wider">
            <ShieldCheck className="h-4.5 w-4.5 text-primary" />
            Verified ID protected · 100% student powered
          </div>
        </animated.aside>

        {/* Right: form */}
        <animated.section
          style={rightPanelSpring}
          className="flex flex-col justify-center p-8 sm:p-12 lg:p-14"
        >
          <div className="mx-auto w-full max-w-md">
            <Link href="/" className="mb-6 flex items-center gap-2.5 text-lg font-bold text-white lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white border border-primary/20 shadow-primary">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" />
                  <path d="m4.5 7.7 7.5 4.2 7.5-4.2M12 12v9" />
                </svg>
              </div>
              <span className="font-display font-bold tracking-tight">UniFetch</span>
            </Link>

            <span className="text-xs font-bold uppercase tracking-widest text-[#2563eb]">Account access</span>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tighter text-white">
              Sign in to your account
            </h2>
            <p className="mt-1 text-xs text-[#cbd5e1] font-semibold">
              Enter your student email and password to continue.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-[38px] h-4 w-4 text-muted" />
                <Field
                  id="email"
                  name="email"
                  type="email"
                  required
                  label="Student email address"
                  placeholder="you@college.edu"
                  autoComplete="email"
                  className="pl-10"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="password" className="field-label">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-[#2563eb] hover:underline"
                  >
                    <span>{showPassword ? "Hide" : "Show"}</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="field pl-10"
                  />
                </div>
              </div>

              {errorMessage && <Alert tone="error" className="mt-4">{errorMessage}</Alert>}

              <Button
                type="submit"
                size="lg"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-1.5 mt-2 transition-transform duration-100 hover:scale-[1.01] active:scale-[0.99] uppercase tracking-wider text-xs py-3.5 shadow-glow"
              >
                <span>{isLoading ? "Signing in…" : "Sign in"}</span>
                {!isLoading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>

            <p className="mt-8 text-center text-xs text-[#cbd5e1] font-semibold">
              Don&apos;t have an account yet?{" "}
              <Link
                href="/signup"
                className="font-bold text-[#2563eb] underline underline-offset-4 hover:text-[#1d4ed8] transition-colors"
              >
                Create your student account (100 free credits)
              </Link>
            </p>
          </div>
        </animated.section>
      </div>
    </main>
  );
}
