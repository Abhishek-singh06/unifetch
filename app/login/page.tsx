"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Eye, EyeOff, ShieldCheck, Quote, ArrowRight, Mail, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Logo } from "../components/ui/Logo";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { Alert } from "../components/ui/Alert";

const benefits = [
  "100% student-only community",
  "6-digit tamper-proof delivery handshake",
  "Zero delivery charges between peers",
];

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
      .select("verification_status, college_id_url")
      .eq("id", loginData.user.id)
      .single();

    if (profileError) {
      console.error("Profile error:", profileError);
      setErrorMessage("Your account was created, but we could not check your verification status.");
      setIsLoading(false);
      return;
    }

    if (profile.verification_status === "approved") {
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

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4 selection:bg-accent/20 sm:p-6 lg:p-8">
      <div className="grid min-h-[580px] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-border bg-surface shadow-[var(--shadow-lift)] lg:grid-cols-[1fr_1.1fr]">
        {/* Left: brand panel */}
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-white lg:flex">
          <div className="absolute -right-24 -bottom-24 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute right-10 top-10 h-40 w-40 rounded-full bg-white/5 blur-2xl" />

          <Link href="/" className="relative z-10">
            <Logo showTagline className="[&_span]:text-white" />
          </Link>

          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent">
              <ShieldCheck className="h-3.5 w-3.5" />
              Welcome back
            </span>

            <h1 className="mt-5 font-display text-3xl font-extrabold leading-tight tracking-tight">
              Your campus community is moving packages.
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-[#bad4c8]">
              Sign in to track your gate deliveries or pocket credits carrying
              parcels for dorm neighbours.
            </p>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm">
              <Quote className="h-5 w-5 text-accent" />
              <p className="mt-3 text-xs italic leading-relaxed text-[#e6f4ed]">
                UniFetch saved me 25 minutes of walking in the rain yesterday.
                The OTP handoff is super smooth.
              </p>
              <p className="mt-3 text-[11px] font-bold text-accent">
                — Tanvi M., CS 3rd Year
              </p>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-2 text-xs font-medium text-[#7eaba0]">
            <ShieldCheck className="h-4 w-4" />
            Verified ID protected · 100% student powered
          </div>
        </aside>

        {/* Right: form */}
        <section className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
          <div className="mx-auto w-full max-w-md">
            <Link href="/" className="mb-6 flex items-center gap-2 text-lg font-bold text-[#0c241b] lg:hidden">
              <Logo />
            </Link>

            <span className="eyebrow">Account access</span>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-[#081e15]">
              Sign in to your account
            </h2>
            <p className="mt-2 text-sm text-muted">
              Enter your student email and password to continue.
            </p>

            <form className="mt-8 space-y-4" onSubmit={handleSubmit} noValidate>
              <Field
                id="email"
                name="email"
                type="email"
                required
                label="Student email address"
                placeholder="you@college.edu"
                autoComplete="email"
              />

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="password" className="field-label">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9bb2a5]" />
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

              {errorMessage && <Alert tone="error">{errorMessage}</Alert>}

              <Button type="submit" size="lg" disabled={isLoading} className="w-full">
                {isLoading ? "Signing in…" : "Sign in"}
                {!isLoading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>

            <p className="mt-8 text-center text-xs text-[#638074]">
              Don&apos;t have an account yet?{" "}
              <Link
                href="/signup"
                className="font-bold text-primary underline underline-offset-4 hover:text-primary-hover"
              >
                Create your student account (100 free credits)
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
