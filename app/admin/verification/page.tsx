"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type Profile = {
  id: string;
  full_name: string;
  college: string;
  college_id_url: string | null;
  verification_status: string;
  created_at: string;
};

export default function VerificationPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [processingId, setProcessingId] = useState("");

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, college, college_id_url, verification_status, created_at")
      .eq("verification_status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading profiles:", error);
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    setProfiles(data || []);
    setIsLoading(false);
  }

  async function verifyUser(id: string) {
    setProcessingId(id);

    const { error } = await supabase
      .from("profiles")
      .update({
        verification_status: "verified",
      })
      .eq("id", id);

    if (error) {
      setErrorMessage(error.message);
      setProcessingId("");
      return;
    }

    setProfiles((current) => current.filter((profile) => profile.id !== id));
    setProcessingId("");
  }

  async function rejectUser(id: string) {
    setProcessingId(id);

    const { error } = await supabase
      .from("profiles")
      .update({
        verification_status: "rejected",
      })
      .eq("id", id);

    if (error) {
      setErrorMessage(error.message);
      setProcessingId("");
      return;
    }

    setProfiles((current) => current.filter((profile) => profile.id !== id));
    setProcessingId("");
  }

  async function viewCollegeId(filePath: string | null) {
    if (!filePath) {
      alert("No college ID photo has been uploaded by this user.");
      return;
    }

    const { data, error } = await supabase.storage
      .from("college-ids")
      .createSignedUrl(filePath, 60 * 10);

    if (error) {
      console.error("Signed URL error:", error);
      setErrorMessage(error.message);
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  return (
    <main className="min-h-screen bg-[#f8f7f2] px-5 py-8 text-[#0c1c15] sm:px-8 sm:py-12 selection:bg-[#10b981]/20">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold text-[#0f4c3a] hover:text-[#093326]"
          >
            <span>← Back to UniFetch</span>
          </Link>

          <span className="rounded-full bg-[#0f4c3a] px-3.5 py-1 text-xs font-bold text-white shadow-xs">
            Admin Console
          </span>
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#0f4c3a]">
              Review Pipeline
            </span>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-[#081e15] sm:text-4xl">
              Student ID Verifications
            </h1>
            <p className="mt-1 text-sm text-[#5c7a6e]">
              Verify college student credentials to grant access to the campus parcel network.
            </p>
          </div>

          <div className="rounded-2xl border border-[#e2dcd0] bg-white px-4 py-2.5 shadow-xs">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#6b857a]">
              Pending Reviews
            </span>
            <span className="font-display text-xl font-bold text-[#0f4c3a]">
              {profiles.length}
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-[#fecaca] bg-[#fff5f5] p-4 text-xs font-semibold text-[#991b1b]">
            {errorMessage}
          </div>
        )}

        {isLoading && (
          <div className="mt-10 rounded-3xl border border-[#e2dcd0] bg-white p-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-3 border-[#d8e8de] border-t-[#0f4c3a]" />
            <p className="mt-3 text-xs font-semibold text-[#5c7a6e]">Loading verification deck...</p>
          </div>
        )}

        {!isLoading && profiles.length === 0 && (
          <div className="mt-10 rounded-3xl border border-[#e2dcd0] bg-white p-12 text-center shadow-lg shadow-[#0c241b]/5">
            <div className="text-5xl">✨</div>
            <h2 className="mt-4 font-display text-2xl font-bold text-[#0c241b]">
              Inbox Zero! No pending IDs to review
            </h2>
            <p className="mt-2 text-xs text-[#5c7a6e]">
              All submitted student ID cards have been reviewed and processed.
            </p>
          </div>
        )}

        {!isLoading && profiles.length > 0 && (
          <div className="mt-8 space-y-5">
            {profiles.map((profile) => (
              <article
                key={profile.id}
                className="rounded-3xl border border-[#e2dcd0] bg-white p-6 shadow-md shadow-[#0c241b]/5 transition sm:p-7"
              >
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <span className="inline-flex rounded-full bg-[#fffbeb] border border-[#fde68a] px-3 py-1 text-[11px] font-bold text-[#b45309]">
                      PENDING REVIEW
                    </span>

                    <h2 className="mt-3 font-display text-2xl font-bold text-[#0c241b]">
                      {profile.full_name}
                    </h2>

                    <p className="mt-1 text-sm font-medium text-[#466355]">
                      🏛️ {profile.college}
                    </p>

                    <p className="mt-1 text-xs text-[#7e998c]">
                      Submitted: {new Date(profile.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => viewCollegeId(profile.college_id_url)}
                      className="rounded-2xl border border-[#d6e3db] bg-white px-5 py-3 text-xs font-bold text-[#0f4c3a] shadow-xs hover:bg-[#edeae0] transition"
                    >
                      Inspect College ID 🔍
                    </button>

                    <button
                      type="button"
                      disabled={processingId === profile.id}
                      onClick={() => verifyUser(profile.id)}
                      className="rounded-2xl bg-[#0f4c3a] px-5 py-3 text-xs font-bold text-white shadow-md shadow-[#0f4c3a]/20 hover:bg-[#093326] transition disabled:opacity-60"
                    >
                      {processingId === profile.id ? "Processing..." : "✓ Approve Student"}
                    </button>

                    <button
                      type="button"
                      disabled={processingId === profile.id}
                      onClick={() => rejectUser(profile.id)}
                      className="rounded-2xl border border-[#fecaca] bg-[#fff5f5] px-5 py-3 text-xs font-bold text-[#991b1b] hover:bg-[#ffe4df] transition disabled:opacity-60"
                    >
                      ✕ Reject
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}