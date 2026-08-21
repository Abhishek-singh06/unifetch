"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase/client";

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
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

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

    const userId = loginData.user.id;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("verification_status, college_id_url")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Profile error:", profileError);
      setErrorMessage("Your account was created, but we could not check your verification status.");
      setIsLoading(false);
      return;
    }

    if (profile.verification_status === "verified") {
      router.push("/");
      router.refresh();
      return;
    }

    if (profile.verification_status === "pending" || profile.verification_status === "rejected") {
      router.push("/verification");
      router.refresh();
      return;
    }

    setErrorMessage("Your verification status could not be determined. Please contact support.");
    setIsLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#f8f7f2] flex items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-[#10b981]/20">
      <div className="mx-auto grid min-h-[580px] w-full max-w-5xl overflow-hidden rounded-3xl border border-[#e2dcd0] bg-white shadow-2xl shadow-[#0c241b]/10 lg:grid-cols-[1fr_1.1fr]">
        {/* Left Side: Campus Brand Visual */}
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
              Welcome back
            </span>

            <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight tracking-tight">
              Your campus community is moving packages.
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-[#bad4c8]">
              Sign in to track your gate deliveries or pocket credits carrying parcels for dorm neighbours.
            </p>

            {/* Testimonial Card */}
            <div className="mt-8 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-xs">
              <p className="text-xs italic text-[#e6f4ed]">
                &ldquo;UniFetch saved me 25 minutes of walking in the rain yesterday. The OTP handoff is super smooth.&rdquo;
              </p>
              <p className="mt-2 text-[11px] font-bold text-[#10b981]">
                — Tanvi M., CS 3rd Year
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[#7eaba0]">
            <span>🔒 Verified ID Protected</span>
            <span>⚡ 100% Student Powered</span>
          </div>
        </aside>

        {/* Right Side: Form */}
        <section className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
          <div className="w-full max-w-md mx-auto">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold text-[#0c241b] lg:hidden mb-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0f4c3a] text-white text-xs font-bold">
                U
              </div>
              <span>UniFetch</span>
            </Link>

            <span className="text-xs font-bold uppercase tracking-widest text-[#0f4c3a]">
              Account Access
            </span>

            <h2 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-[#081e15]">
              Sign in to your account
            </h2>

            <p className="mt-2 text-xs text-[#5c7a6e]">
              Enter your student email and password to continue.
            </p>

            <form className="mt-8 space-y-4" onSubmit={handleSubmit} noValidate>
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-bold uppercase tracking-wider text-[#496a5d] mb-1.5"
                >
                  Student Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@college.edu"
                  className="w-full rounded-2xl border border-[#d8d2c4] bg-[#fbfaf6] px-4 py-3.5 text-sm font-medium outline-none transition placeholder:text-[#9bb2a5] focus:border-[#0f4c3a] focus:bg-white focus:ring-4 focus:ring-[#10b981]/15"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="block text-xs font-bold uppercase tracking-wider text-[#496a5d]"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs font-bold text-[#0f4c3a] hover:underline"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
                  className="w-full rounded-2xl border border-[#d8d2c4] bg-[#fbfaf6] px-4 py-3.5 text-sm font-medium outline-none transition placeholder:text-[#9bb2a5] focus:border-[#0f4c3a] focus:bg-white focus:ring-4 focus:ring-[#10b981]/15"
                />
              </div>

              {errorMessage && (
                <div className="rounded-2xl border border-[#fecaca] bg-[#fff5f5] p-4 text-xs font-semibold text-[#991b1b]">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-2xl bg-[#0f4c3a] py-3.5 text-sm font-bold text-white shadow-xl shadow-[#0f4c3a]/20 transition hover:bg-[#093326] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
              >
                {isLoading ? "Signing in..." : "Sign in →"}
              </button>
            </form>

            <p className="mt-8 text-center text-xs text-[#638074]">
              Don&apos;t have an account yet?{" "}
              <Link
                href="/signup"
                className="font-bold text-[#0f4c3a] underline underline-offset-4 hover:text-[#093326]"
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