"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AvailableRequestsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/carry");
  }, [router]);

  return (
    <main className="min-h-screen bg-[#fbfcf8] flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#dce8e1] border-t-[#1f6a55]" />
        <p className="mt-3 text-sm text-[#617971]">Redirecting to Carry Packages...</p>
      </div>
    </main>
  );
}