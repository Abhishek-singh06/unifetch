"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, Sparkles, ShieldCheck, Coins, Eye, EyeOff, User, GraduationCap, Mail } from "lucide-react";
import { useSpring, animated } from "@react-spring/web";
import { supabase } from "@/lib/supabase/client";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { Alert } from "../components/ui/Alert";

const perks = [
  { icon: ShieldCheck, label: "100% student-only community" },
  { icon: Coins, label: "6-digit tamper-proof delivery handshake" },
  { icon: Sparkles, label: "Zero delivery charges between students" },
];

export default function SignupPage() {
  const router = useRouter();

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);

    const fullName = formData.get("fullName") as string;
    const college = formData.get("college") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      setIsLoading(false);
      return;
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, college },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signUpError) {
      setErrorMessage(signUpError.message);
      setIsLoading(false);
      return;
    }

    if (!signUpData.user) {
      setErrorMessage("We could not create your account. Please try again.");
      setIsLoading(false);
      return;
    }

    if (!signUpData.session) {
      setSuccessMessage(
        "Account created! Please check your email to confirm your address, then sign in to upload your college ID."
      );
      setIsLoading(false);
      return;
    }

    router.push("/verification");
    router.refresh();
  }

  // React Spring entrance animations
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
      <div className="grid min-h-[640px] w-full max-w-5xl overflow-hidden rounded-[2.5rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] shadow-glow lg:grid-cols-[1fr_1.1fr]">
        
        {/* Left: perks panel */}
        <animated.aside
          style={leftPanelSpring}
          className="relative hidden flex-col justify-between overflow-hidden bg-[#080d16] p-10 text-white lg:flex border-r border-[rgba(255,255,255,0.08)]"
        >
          {/* Subtle blue mesh background glow */}
          <div className="absolute -right-24 -bottom-24 h-80 w-80 rounded-full bg-[#2563eb]/15 blur-3xl pointer-events-none" />

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
              <Sparkles className="h-3.5 w-3.5" />
              <span>100 starter credits included</span>
            </div>

            <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tighter text-white">
              Join the student peer parcel network.
            </h1>

            <p className="text-xs leading-relaxed text-[#cbd5e1] font-semibold">
              Get gate deliveries brought right to your dorm lobby, or earn credits &amp; cash tips whenever you walk to the gate.
            </p>

            <ul className="space-y-4 pt-2">
              {perks.map((perk) => {
                const IconComp = perk.icon;
                return (
                  <li key={perk.label} className="flex items-center gap-3">
                    <span className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl bg-[#2563eb]/10 text-primary border border-[#2563eb]/20 shadow-sm">
                      <IconComp className="h-4.5 w-4.5 text-[#2563eb]" />
                    </span>
                    <span className="text-[#f9fafb] text-xs font-bold">{perk.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="relative z-10 flex items-center gap-2 text-xs font-bold text-[#cbd5e1] uppercase tracking-wider">
            <ShieldCheck className="h-4.5 w-4.5 text-primary" />
            Campus verified network · Active across dorms
          </div>
        </animated.aside>

        {/* Right: form */}
        <animated.section
          style={rightPanelSpring}
          className="flex flex-col justify-center p-6 sm:p-12 lg:p-14"
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

            <span className="text-xs font-bold uppercase tracking-widest text-[#2563eb]">Student registration</span>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tighter text-white">
              Create your account
            </h2>
            <p className="mt-1 text-xs text-[#cbd5e1] font-semibold">
              Enter your student details to claim your free 100 starter credits.
            </p>

            <form className="mt-7 space-y-4" onSubmit={handleSubmit} noValidate>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-[38px] h-4 w-4 text-muted" />
                <Field id="fullName" name="fullName" type="text" required label="Full name" placeholder="e.g. Aarav Sharma" className="pl-10" />
              </div>
              
              <div className="relative">
                <GraduationCap className="pointer-events-none absolute left-3.5 top-[38px] h-4.5 w-4.5 text-muted" />
                <Field id="college" name="college" type="text" required label="College / university" placeholder="e.g. National Institute of Tech" className="pl-10" />
              </div>
              
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-[38px] h-4 w-4 text-muted" />
                <Field id="email" name="email" type="email" required label="Email address" placeholder="you@college.edu" autoComplete="email" className="pl-10" />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="password" className="field-label">Password</label>
                  <div className="relative">
                    <input
                      id="password" name="password" type={showPassword ? "text" : "password"} required
                      placeholder="At least 6 chars" className="field pr-10 text-xs"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="field-label">Confirm</label>
                  <div className="relative">
                    <input
                      id="confirmPassword" name="confirmPassword" type={showConfirm ? "text" : "password"} required
                      placeholder="Repeat password" className="field pr-10 text-xs"
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground">
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-2xl border border-[#2563eb]/20 bg-[#2563eb]/6 p-4 text-xs text-[#cbd5e1] font-bold">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#2563eb]" />
                <span>
                  Student ID step: you&apos;ll upload your college ID card right after sign up for instant verification.
                </span>
              </div>

              {errorMessage && <Alert tone="error">{errorMessage}</Alert>}
              {successMessage && <Alert tone="success">{successMessage}</Alert>}

              <Button
                type="submit"
                size="lg"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-1.5 transition-transform duration-100 hover:scale-[1.01] active:scale-[0.99] uppercase tracking-wider text-xs py-3.5 mt-2 shadow-glow"
              >
                <span>{isLoading ? "Creating account…" : "Create account & claim credits"}</span>
                {!isLoading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-[#cbd5e1] font-semibold">
              Already registered?{" "}
              <Link href="/login" className="font-bold text-[#2563eb] underline underline-offset-4 hover:text-[#1d4ed8] transition-colors">
                Sign in here
              </Link>
            </p>
          </div>
        </animated.section>
      </div>
    </main>
  );
}
