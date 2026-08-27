"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageLoader } from "../components/ui/Spinner";

export default function AvailableRequestsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/carry");
  }, [router]);

  return (
    <PageLoader label="Redirecting to Carry Packages..." />
  );
}