"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

    const { data: signUpData, error: signUpError } =
      await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            college: college,
          },
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
        "🎉 Account created! Please check your email to confirm your address, then sign in to upload your college ID."
      );
      setIsLoading(false);
      return;
    }

    router.push("/verification");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#f8f7f2] flex items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-[#10b981]/20">
      <div className="mx-auto grid min-h-[640px] w-full max-w-5xl overflow-hidden rounded-3xl border border-[#e2dcd0] bg-white shadow-2xl shadow-[#0c241b]/10 lg:grid-cols-[1fr_1.1fr]">
        {/* Left Side: Community Perks */}
        <aside className="hidden flex-col justify-between bg-[#0c241b] p-10 text-white lg:flex relative overflow-hidden">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-[#10b981]/15 blur-3xl pointer-events-none" />

          <Link href="/" className="flex items-center gap-2.5 self-start group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#10b981] text-[#0c241b] font-bold shadow-md">
              U
            </div>
            <span className="font-display text-xl font-bold tracking-tight">
              UniFetch
            </span>
          </Link>

          <div className="relative z-10">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#10b981] border border-white/15">
              100 Starter Credits Included
            </span>

            <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight tracking-tight">
              Join the student peer parcel network.
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-[#bad4c8]">
              Get gate deliveries brought right to your dorm lobby, or earn credits & cash tips whenever you walk to the gate.
            </p>

            <div className="mt-8 space-y-3 text-xs text-[#d3ebe1]">
              <div className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#10b981] text-[#0c241b] font-bold text-[10px]">
                  ✓
                </span>
                <span>100% Student-Only Community</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#10b981] text-[#0c241b] font-bold text-[10px]">
                  ✓
                </span>
                <span>6-Digit Tamper-Proof Delivery Handshake</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#10b981] text-[#0c241b] font-bold text-[10px]">
                  ✓
                </span>
                <span>Zero Delivery Charges Between Students</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[#7eaba0]">
            <span>🛡️ Campus Verified Network</span>
            <span>📍 Active Across Dorms</span>
          </div>
        </aside>

        {/* Right Side: Registration Form */}
        <section className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
          <div className="w-full max-w-md mx-auto">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold text-[#0c241b] lg:hidden mb-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0f4c3a] text-white text-xs font-bold">
                U
              </div>
              <span>UniFetch</span>
            </Link>

            <span className="text-xs font-bold uppercase tracking-widest text-[#0f4c3a]">
              Student Registration
            </span>

            <h2 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-[#081e15]">
              Create your account
            </h2>

            <p className="mt-2 text-xs text-[#5c7a6e]">
              Enter your student details to claim your free 100 starter credits.
            </p>

            <form className="mt-6 space-y-3.5" onSubmit={handleSubmit} noValidate>
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-[11px] font-bold uppercase tracking-wider text-[#496a5d] mb-1"
                >
                  Full Name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  placeholder="e.g. Aarav Sharma"
                  className="w-full rounded-2xl border border-[#d8d2c4] bg-[#fbfaf6] px-4 py-3 text-sm font-medium outline-none transition placeholder:text-[#9bb2a5] focus:border-[#0f4c3a] focus:bg-white focus:ring-4 focus:ring-[#10b981]/15"
                />
              </div>

              <div>
                <label
                  htmlFor="college"
                  className="block text-[11px] font-bold uppercase tracking-wider text-[#496a5d] mb-1"
                >
                  College / University
                </label>
                <input
                  id="college"
                  name="college"
                  type="text"
                  required
                  placeholder="e.g. National Institute of Tech"
                  className="w-full rounded-2xl border border-[#d8d2c4] bg-[#fbfaf6] px-4 py-3 text-sm font-medium outline-none transition placeholder:text-[#9bb2a5] focus:border-[#0f4c3a] focus:bg-white focus:ring-4 focus:ring-[#10b981]/15"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-[11px] font-bold uppercase tracking-wider text-[#496a5d] mb-1"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@college.edu"
                  className="w-full rounded-2xl border border-[#d8d2c4] bg-[#fbfaf6] px-4 py-3 text-sm font-medium outline-none transition placeholder:text-[#9bb2a5] focus:border-[#0f4c3a] focus:bg-white focus:ring-4 focus:ring-[#10b981]/15"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="password"
                    className="block text-[11px] font-bold uppercase tracking-wider text-[#496a5d] mb-1"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    placeholder="At least 6 chars"
                    className="w-full rounded-2xl border border-[#d8d2c4] bg-[#fbfaf6] px-3.5 py-3 text-sm font-medium outline-none transition placeholder:text-[#9bb2a5] focus:border-[#0f4c3a] focus:bg-white focus:ring-4 focus:ring-[#10b981]/15"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-[11px] font-bold uppercase tracking-wider text-[#496a5d] mb-1"
                  >
                    Confirm
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    placeholder="Repeat password"
                    className="w-full rounded-2xl border border-[#d8d2c4] bg-[#fbfaf6] px-3.5 py-3 text-sm font-medium outline-none transition placeholder:text-[#9bb2a5] focus:border-[#0f4c3a] focus:bg-white focus:ring-4 focus:ring-[#10b981]/15"
                  />
                </div>
              </div>

              {/* ID Verification Note */}
              <div className="rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] p-3 text-xs text-[#065f46]">
                <span className="font-bold">🪪 Student ID Step:</span> You will upload your college ID card right after sign up for instant peer verification.
              </div>

              {errorMessage && (
                <div className="rounded-2xl border border-[#fecaca] bg-[#fff5f5] p-3 text-xs font-semibold text-[#991b1b]">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] p-4 text-xs font-semibold text-[#065f46]">
                  {successMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-2xl bg-[#0f4c3a] py-3.5 text-sm font-bold text-white shadow-xl shadow-[#0f4c3a]/20 transition hover:bg-[#093326] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
              >
                {isLoading ? "Creating Student Account..." : "Create Account & Get 100 Credits →"}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-[#638074]">
              Already registered?{" "}
              <Link
                href="/login"
                className="font-bold text-[#0f4c3a] underline underline-offset-4 hover:text-[#093326]"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}