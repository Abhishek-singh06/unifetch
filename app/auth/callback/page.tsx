"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { PageLoader } from "../../components/ui/Spinner";
import { Card } from "../../components/ui/Card";
import { Alert } from "../../components/ui/Alert";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (!code) {
        setError("Invalid or expired confirmation link.");
        setIsLoading(false);
        return;
      }

      const { error } =
        await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("Auth callback error:", error);
        setError(error.message);
        setIsLoading(false);
        return;
      }

      router.replace("/");
      router.refresh();
    }

    handleCallback();
  }, [router]);

  if (isLoading) {
    return (
      <PageLoader label="Verifying your email..." />
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5">
        <Card className="w-full max-w-md p-8 text-center bg-surface">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-tint text-danger border border-danger-border mx-auto mb-4">
            <ShieldAlert className="h-6 w-6" />
          </div>

          <h1 className="font-display text-2xl font-bold text-primary-hover">
            Verification Failed
          </h1>

          <Alert tone="error" className="mt-4">
            {error}
          </Alert>

          <p className="mt-6 text-xs text-muted font-semibold">
            Try requesting a new confirmation link or contact support.
          </p>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-[var(--shadow-primary)] mx-auto mb-4">
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
          </svg>
        </span>
        <h1 className="font-display text-2xl font-bold text-primary-hover">
          Verifying your email...
        </h1>
        <p className="mt-2 text-xs text-muted font-semibold">
          Setting up your secure campus peer session. Please wait.
        </p>
      </div>
    </main>
  );
}