"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase/client";
import { PageLoader } from "../components/ui/Spinner";
import { isDemoMode } from "@/lib/demoSession";

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

      // 1. Handle Demo Mode Sessions
      if (isDemoMode()) {
        // Demo users MUST NOT access admin functionality
        if (isAdminRoute) {
          router.replace("/admin/login");
          return;
        }
        // Allow demo users to browse all other marketplace pages
        setChecking(false);
        return;
      }

      // 2. Public routes that unauthenticated guests can access
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

      // 3. Protected routes: Check if real user is logged in
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

      // 4. Get user verification status, role, and deactivation status
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("verification_status, role, status")
        .eq("id", user.id)
        .single();

      if (error || !profile) {
        console.error("Could not check verification status:", error);
        setChecking(false);
        return;
      }

      if (profile.status === "deactivated") {
        await supabase.auth.signOut();
        router.replace("/login");
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

      // Check onboarding verification status:
      // Both verified/approved and submitted/id_submitted give immediate access without manual admin approval waiting.
      // Only users who haven't uploaded an ID ('pending' or 'rejected') are sent to /verification.
      if (
        profile.verification_status !== "approved" &&
        profile.verification_status !== "verified" &&
        profile.verification_status !== "submitted" &&
        profile.verification_status !== "id_submitted"
      ) {
        router.replace("/verification");
        return;
      }

      // User is logged in and active
      setChecking(false);
    }

    checkVerification();
  }, [pathname, router]);

  if (checking) {
    return <PageLoader label="Checking access permissions..." />;
  }

  return <>{children}</>;
}