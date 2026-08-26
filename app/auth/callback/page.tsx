"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Spinner, PageLoader } from "../../components/ui/Spinner";
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
        <Card className="w-full max-w-md p-8 text-center">
          <h1 className="text-2xl font-semibold text-primary-hover">
            Verification failed
          </h1>

          <Alert tone="error" className="mt-4">
            {error}
          </Alert>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-primary-hover">
          Verifying your email...
        </h1>

        <p className="mt-3 text-muted">
          Please wait.
        </p>
      </div>
    </main>
  );
}