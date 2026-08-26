"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase/client";
import { Spinner, PageLoader } from "../components/ui/Spinner";

export default function VerificationGuard({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkVerification() {
      // Public routes that unauthenticated guests can access
      const isPublicRoute =
        pathname === "/" ||
        pathname === "/login" ||
        pathname === "/signup" ||
        pathname === "/verification" ||
        pathname.startsWith("/auth");

      if (isPublicRoute) {
        setChecking(false);
        return;
      }

      // Protected routes: Check if user is logged in
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // If not logged in, redirect to login
      if (!user) {
        router.replace("/login");
        return;
      }

      // Get user verification status
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("verification_status")
        .eq("id", user.id)
        .single();

      if (error || !profile) {
        console.error("Could not check verification status:", error);
        setChecking(false);
        return;
      }

      // If user is pending or rejected, redirect to verification page
      if (profile.verification_status !== "approved") {
        router.replace("/verification");
        return;
      }

      // User is logged in and verified
      setChecking(false);
    }

    checkVerification();
  }, [pathname, router]);

  if (checking) {
    return (
      <PageLoader label="Checking your verification status..." />
    );
  }

  return <>{children}</>;
}