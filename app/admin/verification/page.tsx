"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatPill } from "../../components/ui/StatPill";

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

    loadProfiles();
  }, []);

  async function verifyUser(id: string) {
    setProcessingId(id);

    const { error } = await supabase
      .from("profiles")
      .update({
        verification_status: "approved",
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
      .from("student-ids")
      .createSignedUrl(filePath, 60 * 10);

    if (error) {
      console.error("Signed URL error:", error);
      setErrorMessage(error.message);
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-[var(--shadow-primary)]">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
          </span>
          <p className="mt-4 text-xs font-semibold tracking-wide text-muted">
            Loading verification deck...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-8 sm:py-12 selection:bg-accent/20">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          backHref="/"
          backLabel="Back to UniFetch"
          actions={
            <Badge tone="success" className="bg-primary border-primary text-white shadow-xs">
              Admin Console
            </Badge>
          }
        />

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="eyebrow">Review Pipeline</span>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-primary-hover sm:text-4xl">
              Student ID Verifications
            </h1>
            <p className="mt-1 text-sm text-muted">
              Verify college student credentials to grant access to the campus parcel network.
            </p>
          </div>

          <StatPill label="Pending Reviews" value={profiles.length} />
        </div>

        <Alert tone="error" className="mt-6">{errorMessage}</Alert>

        {!isLoading && profiles.length === 0 && (
          <EmptyState
            icon={<span className="text-4xl">✨</span>}
            title="Inbox Zero! No pending IDs to review"
            description="All submitted student ID cards have been reviewed and processed."
          />
        )}

        {profiles.length > 0 && (
          <div className="mt-8 space-y-5">
            {profiles.map((profile) => (
              <Card key={profile.id} className="p-6 hover:shadow-[var(--shadow-lift)] hover:border-border-strong sm:p-7">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <Badge tone="warning">PENDING REVIEW</Badge>

                    <h2 className="mt-3 font-display text-2xl font-bold text-primary-hover">
                      {profile.full_name}
                    </h2>

                    <p className="mt-1 text-sm font-medium text-muted">
                      🏛️ {profile.college}
                    </p>

                    <p className="mt-1 text-xs text-muted">
                      Submitted: {new Date(profile.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button type="button" variant="secondary" size="lg" onClick={() => viewCollegeId(profile.college_id_url)}>
                      Inspect College ID 🔍
                    </Button>

                    <Button
                      type="button"
                      size="lg"
                      disabled={processingId === profile.id}
                      onClick={() => verifyUser(profile.id)}
                    >
                      {processingId === profile.id ? "Processing..." : "✓ Approve Student"}
                    </Button>

                    <Button
                      type="button"
                      variant="danger"
                      size="lg"
                      disabled={processingId === profile.id}
                      onClick={() => rejectUser(profile.id)}
                    >
                      ✕ Reject
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}