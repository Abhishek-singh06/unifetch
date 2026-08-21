"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    async function handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (!code) {
        setError("Invalid or expired confirmation link.");
        return;
      }

      const { error } =
        await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("Auth callback error:", error);
        setError(error.message);
        return;
      }

      router.replace("/");
      router.refresh();
    }

    handleCallback();
  }, [router]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbfcf8] px-5">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <h1 className="text-2xl font-semibold text-[#173a30]">
            Verification failed
          </h1>

          <p className="mt-4 text-[#a53d28]">
            {error}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fbfcf8]">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-[#173a30]">
          Verifying your email...
        </h1>

        <p className="mt-3 text-[#617971]">
          Please wait.
        </p>
      </div>
    </main>
  );
}