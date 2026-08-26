"use client";

import { ChangeEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Field } from "../components/ui/Field";
import { Alert } from "../components/ui/Alert";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { Spinner, PageLoader } from "../components/ui/Spinner";

export default function VerificationPage() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("verification_status, college_id_url")
        .eq("id", user.id)
        .single();

      if (profileError) {
        setError(profileError.message);
        setIsLoading(false);
        return;
      }

      setStatus(profile?.verification_status ?? "pending");
      setIsLoading(false);
    }

    loadProfile();
  }, [router]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setError("");
    setMessage("");

    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5 MB.");
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    if (
      selectedFile.type !== "image/jpeg" &&
      selectedFile.type !== "image/png" &&
      selectedFile.type !== "image/webp"
    ) {
      setError("Please upload a valid image file (JPG, PNG, or WebP).");
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  }

  async function handleUpload() {
    if (!file) {
      setError("Please select your college ID card first.");
      return;
    }

    if (!userId) {
      setError("User session not found. Please login again.");
      return;
    }

    setIsUploading(true);
    setError("");
    setMessage("");

    try {
      const fileExtension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${userId}/college-id.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from("student-ids")
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          college_id_url: filePath,
          verification_status: "pending",
        })
        .eq("id", userId);

      if (profileError) {
        throw new Error(profileError.message);
      }

      setStatus("pending");
      setMessage("🎉 College ID uploaded successfully! Our student verification team will approve your access shortly.");
      setFile(null);
      setPreviewUrl(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while uploading your ID."
      );
    } finally {
      setIsUploading(false);
    }
  }

  if (isLoading) {
    return (
      <PageLoader label="Checking verification status..." />
    );
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-8 sm:py-12 selection:bg-accent/20">
      <div className="mx-auto max-w-3xl">
        <PageHeader
          backHref="/"
          backLabel="Back to UniFetch"
          actions={
            <Badge
              tone={
                status === "approved" ? "success" :
                status === "rejected" ? "danger" : "warning"
              }
            >
              STATUS: {status.toUpperCase()}
            </Badge>
          }
        />

        <Card className="mt-8 p-6 sm:p-10">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-tint text-lg">
              🪪
            </span>
            <span className="eyebrow">Community Trust & Safety</span>
          </div>

          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-primary-hover">
            Student ID Verification
          </h1>

          <p className="mt-2 text-sm text-muted">
            UniFetch is an exclusive student-only network. Upload a photo of your physical student ID card to unlock campus package requests and deliveries.
          </p>

          {/* VERIFIED STATE */}
          {status === "approved" && (
            <div className="mt-8 rounded-2xl border border-accent/30 bg-accent-tint p-6 text-center">
              <span className="text-4xl">🎉</span>
              <h2 className="mt-2 font-display text-2xl font-bold text-success">
                You are Verified!
              </h2>
              <p className="mt-2 text-xs text-muted">
                Your college ID has been reviewed and approved. You have full access to request and carry packages across campus.
              </p>
              <Button type="button" onClick={() => router.push("/")} size="lg" className="mt-6">
                Go to UniFetch Campus Dashboard →
              </Button>
            </div>
          )}

          {/* PENDING / REJECTED UPLOAD BOX */}
          {status !== "approved" && (
            <div className="mt-8 space-y-6">
              {/* Guidelines */}
              <div className="rounded-2xl border border-border bg-surface-soft p-5 text-xs text-muted">
                <p className="font-bold text-primary-hover mb-2">Photo Guidelines for Fast Approval:</p>
                <ul className="space-y-1.5 text-muted">
                  <li>• Photo must be well-lit with all text easily readable.</li>
                  <li>• Student name and current academic validity year must be clearly visible.</li>
                  <li>• Accepts JPG, PNG, or WebP (Max 5 MB).</li>
                </ul>
              </div>

              {/* Upload Drop Area */}
              <div>
                <label
                  htmlFor="collegeId"
                  className="field-label"
                >
                  Upload College ID Photo
                </label>

                <input
                  id="collegeId"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="block w-full cursor-pointer rounded-2xl border-2 border-dashed border-border bg-surface-soft p-6 text-xs text-muted file:mr-4 file:rounded-xl file:border-0 file:bg-[var(--color-primary)] file:px-4 file:py-2.5 file:text-xs file:font-bold file:text-white hover:border-primary transition"
                />
              </div>

              {/* Preview Thumbnail */}
              {previewUrl && (
                <div className="rounded-2xl border border-accent/30 bg-primary-tint p-4 flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="ID Preview"
                    className="h-20 w-28 object-cover rounded-xl border border-accent/30"
                  />
                  <div>
                    <p className="text-xs font-bold text-primary-hover">Selected File Ready to Upload</p>
                    <p className="text-[11px] text-muted mt-0.5">{file?.name}</p>
                  </div>
                </div>
              )}

              <Alert tone="error" className="">{error}</Alert>
              <Alert tone="success" className="">{message}</Alert>

              <Button
                type="button"
                onClick={handleUpload}
                disabled={isUploading || !file}
                size="lg"
                className="w-full"
              >
                {isUploading ? "Uploading College ID..." : "Submit ID for Verification 🚀"}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}