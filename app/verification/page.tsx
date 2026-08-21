"use client";

import { ChangeEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

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
    loadProfile();
  }, []);

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
        .from("college-ids")
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
      <main className="min-h-screen bg-[#f8f7f2] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-3 border-[#d8e8de] border-t-[#0f4c3a]" />
          <p className="mt-3 text-xs font-semibold text-[#577568]">Checking verification status...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f7f2] px-5 py-8 text-[#0c1c15] sm:px-8 sm:py-12 selection:bg-[#10b981]/20">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-[#0f4c3a]">
            <span>← Back to UniFetch</span>
          </Link>

          <span
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${
              status === "verified"
                ? "bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]"
                : status === "rejected"
                ? "bg-[#fff5f5] text-[#991b1b] border border-[#fecaca]"
                : "bg-[#fffbeb] text-[#92400e] border border-[#fde68a]"
            }`}
          >
            STATUS: {status.toUpperCase()}
          </span>
        </div>

        <div className="mt-8 rounded-3xl border border-[#e2dcd0] bg-white p-6 shadow-xl shadow-[#0c241b]/5 sm:p-10">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ecfdf5] text-lg">
              🪪
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-[#0f4c3a]">
              Community Trust & Safety
            </span>
          </div>

          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-[#081e15]">
            Student ID Verification
          </h1>

          <p className="mt-2 text-sm text-[#5c7a6e]">
            UniFetch is an exclusive student-only network. Upload a photo of your physical student ID card to unlock campus package requests and deliveries.
          </p>

          {/* VERIFIED STATE */}
          {status === "verified" && (
            <div className="mt-8 rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] p-6 text-center">
              <span className="text-4xl">🎉</span>
              <h2 className="mt-2 font-display text-2xl font-bold text-[#065f46]">
                You are Verified!
              </h2>
              <p className="mt-2 text-xs text-[#2c7a5c]">
                Your college ID has been reviewed and approved. You have full access to request and carry packages across campus.
              </p>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="mt-6 rounded-2xl bg-[#0f4c3a] px-7 py-3.5 text-xs font-bold text-white shadow-md shadow-[#0f4c3a]/20 hover:bg-[#093326] transition"
              >
                Go to UniFetch Campus Dashboard →
              </button>
            </div>
          )}

          {/* PENDING / REJECTED UPLOAD BOX */}
          {status !== "verified" && (
            <div className="mt-8 space-y-6">
              {/* Guidelines */}
              <div className="rounded-2xl bg-[#fbfaf6] border border-[#ebe5d8] p-5 text-xs text-[#4d6b5e]">
                <p className="font-bold text-[#0c241b] mb-2">Photo Guidelines for Fast Approval:</p>
                <ul className="space-y-1.5 text-[#5e7c6f]">
                  <li>• Photo must be well-lit with all text easily readable.</li>
                  <li>• Student name and current academic validity year must be clearly visible.</li>
                  <li>• Accepts JPG, PNG, or WebP (Max 5 MB).</li>
                </ul>
              </div>

              {/* Upload Drop Area */}
              <div>
                <label
                  htmlFor="collegeId"
                  className="block text-xs font-bold uppercase tracking-wider text-[#496a5d] mb-2"
                >
                  Upload College ID Photo
                </label>

                <input
                  id="collegeId"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="block w-full cursor-pointer rounded-2xl border-2 border-dashed border-[#cbdad2] bg-[#fdfdfb] p-6 text-xs text-[#527163] file:mr-4 file:rounded-xl file:border-0 file:bg-[#0f4c3a] file:px-4 file:py-2.5 file:text-xs file:font-bold file:text-white hover:border-[#0f4c3a] transition"
                />
              </div>

              {/* Preview Thumbnail */}
              {previewUrl && (
                <div className="rounded-2xl border border-[#d6ecdf] bg-[#f4fbf7] p-4 flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="ID Preview"
                    className="h-20 w-28 object-cover rounded-xl border border-[#bbf7d0]"
                  />
                  <div>
                    <p className="text-xs font-bold text-[#0f4c3a]">Selected File Ready to Upload</p>
                    <p className="text-[11px] text-[#557868] mt-0.5">{file?.name}</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-[#fecaca] bg-[#fff5f5] p-4 text-xs font-semibold text-[#991b1b]">
                  {error}
                </div>
              )}

              {message && (
                <div className="rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] p-4 text-xs font-semibold text-[#065f46]">
                  {message}
                </div>
              )}

              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading || !file}
                className="w-full rounded-2xl bg-[#0f4c3a] py-4 text-sm font-bold text-white shadow-xl shadow-[#0f4c3a]/20 transition hover:bg-[#093326] hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUploading ? "Uploading College ID..." : "Submit ID for Verification 🚀"}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}