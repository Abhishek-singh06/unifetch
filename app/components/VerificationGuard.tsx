"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase/client";
import { PageLoader } from "../components/ui/Spinner";

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
      const isAdminRoute = pathname.startsWith("/admin");
      const isAdminLogin = pathname === "/admin/login";

      // Public routes that unauthenticated guests can access
      const isPublicRoute =
        pathname === "/" ||
        pathname === "/login" ||
        pathname === "/signup" ||
        pathname === "/verification" ||
        pathname.startsWith("/auth") ||
        isAdminLogin;

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
        if (isAdminRoute) {
          router.replace("/admin/login");
        } else {
          router.replace("/login");
        }
        return;
      }

      // Get user verification status and role
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("verification_status, role")
        .eq("id", user.id)
        .single();

      if (error || !profile) {
        console.error("Could not check verification status:", error);
        setChecking(false);
        return;
      }

      // Admin route checks
      if (isAdminRoute) {
        if (profile.role !== "admin") {
          router.replace("/admin/login");
          return;
        }
        setChecking(false);
        return;
      }

      // Admins bypass normal verification checks when browsing normal pages
      if (profile.role === "admin") {
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