"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageLoader } from "../../components/ui/Spinner";

export default function AdminVerificationRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin");
  }, [router]);

  return <PageLoader label="Redirecting to Admin Dashboard..." />;
}