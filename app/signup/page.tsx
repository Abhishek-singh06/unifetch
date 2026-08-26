"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Check, ArrowRight, Sparkles, ShieldCheck, Coins, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Logo } from "../components/ui/Logo";
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

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4 selection:bg-accent/20 sm:p-6 lg:p-8">
      <div className="grid min-h-[640px] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-border bg-surface shadow-[var(--shadow-lift)] lg:grid-cols-[1fr_1.1fr]">
        {/* Left: perks panel */}
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-white lg:flex">
          <div className="absolute -right-24 -bottom-24 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />

          <Link href="/" className="relative z-10">
            <Logo showTagline className="[&_span]:text-white" />
          </Link>

          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              100 starter credits included
            </span>

            <h1 className="mt-5 font-display text-3xl font-extrabold leading-tight tracking-tight">
              Join the student peer parcel network.
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-[#bad4c8]">
              Get gate deliveries brought right to your dorm lobby, or earn
              credits &amp; cash tips whenever you walk to the gate.
            </p>

            <ul className="mt-8 space-y-3 text-sm text-[#d3ebe1]">
              {perks.map((perk) => (
                <li key={perk.label} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  {perk.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative z-10 flex items-center gap-2 text-xs font-medium text-[#7eaba0]">
            <ShieldCheck className="h-4 w-4" />
            Campus verified network · Active across dorms
          </div>
        </aside>

        {/* Right: form */}
        <section className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
          <div className="mx-auto w-full max-w-md">
            <Link href="/" className="mb-6 flex items-center gap-2 text-lg font-bold text-[#0c241b] lg:hidden">
              <Logo />
            </Link>

            <span className="eyebrow">Student registration</span>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-[#081e15]">
              Create your account
            </h2>
            <p className="mt-2 text-sm text-muted">
              Enter your student details to claim your free 100 starter credits.
            </p>

            <form className="mt-7 space-y-3.5" onSubmit={handleSubmit} noValidate>
              <Field id="fullName" name="fullName" type="text" required label="Full name" placeholder="e.g. Aarav Sharma" />
              <Field id="college" name="college" type="text" required label="College / university" placeholder="e.g. National Institute of Tech" />
              <Field id="email" name="email" type="email" required label="Email address" placeholder="you@college.edu" autoComplete="email" />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="password" className="field-label">Password</label>
                  <div className="relative">
                    <input
                      id="password" name="password" type={showPassword ? "text" : "password"} required
                      placeholder="At least 6 chars" className="field pr-10"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9bb2a5] hover:text-primary">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="field-label">Confirm</label>
                  <div className="relative">
                    <input
                      id="confirmPassword" name="confirmPassword" type={showConfirm ? "text" : "password"} required
                      placeholder="Repeat password" className="field pr-10"
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9bb2a5] hover:text-primary">
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] p-3 text-xs text-[#065f46]">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <strong>Student ID step:</strong> you&apos;ll upload your college
                  ID card right after sign up for instant peer verification.
                </span>
              </div>

              {errorMessage && <Alert tone="error">{errorMessage}</Alert>}
              {successMessage && <Alert tone="success">{successMessage}</Alert>}

              <Button type="submit" size="lg" disabled={isLoading} className="w-full">
                {isLoading ? "Creating student account…" : "Create account & get 100 credits"}
                {!isLoading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-[#638074]">
              Already registered?{" "}
              <Link href="/login" className="font-bold text-primary underline underline-offset-4 hover:text-primary-hover">
                Sign in here
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
