"use client";

import { ChangeEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, UploadCloud, FileImage, ShieldAlert, Clock, ArrowRight, CheckCircle2 } from "lucide-react";
import { useSpring, animated } from "@react-spring/web";
import { supabase } from "@/lib/supabase/client";
import { SidebarShell } from "../components/SidebarShell";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { Badge } from "../components/ui/Badge";
import { PageLoader } from "../components/ui/Spinner";
import { isDemoMode, getDemoUser } from "@/lib/demoSession";

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

      if (isDemoMode()) {
        const demoUser = getDemoUser();
        setUserId(demoUser.id);
        setStatus("id_submitted");
        setIsLoading(false);
        return;
      }

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

    const validMimes = ["image/jpeg", "image/png", "image/jpg"];
    const fileExt = selectedFile.name.split(".").pop()?.toLowerCase();
    const validExts = ["jpg", "jpeg", "png"];

    if (!validMimes.includes(selectedFile.type) && (!fileExt || !validExts.includes(fileExt))) {
      setError("Please upload a valid student ID photo (JPG, JPEG, or PNG).");
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  }

  async function handleUpload() {
    if (!file) {
      setError("Please select your student ID card first.");
      return;
    }

    if (isDemoMode()) {
      setStatus("id_submitted");
      setMessage("🎉 Student ID uploaded in Demo Mode! Simulated full access is active.");
      setFile(null);
      setPreviewUrl(null);
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
          verification_status: "id_submitted",
        })
        .eq("id", userId);

      if (profileError) {
        throw new Error(profileError.message);
      }

      setStatus("id_submitted");
      setMessage("🎉 Student ID submitted successfully! Your account has immediate full access.");
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

  // React Spring transitions for preview panel
  const previewSpring = useSpring({
    opacity: previewUrl ? 1 : 0,
    transform: previewUrl ? "scale(1)" : "scale(0.95)",
    config: { tension: 350, friction: 22 },
  });

  if (isLoading) {
    return (
      <PageLoader label="Checking verification status..." />
    );
  }

  const isVerified = status === "approved" || status === "verified";
  const isSubmitted = status === "submitted" || status === "id_submitted";
  const isVerifiedOrSubmitted = isVerified || isSubmitted;

  return (
    <SidebarShell>
      <div className="p-6 sm:p-8 lg:p-10 space-y-8 max-w-4xl">
        
        {/* Title area */}
        <div className="border-b border-[rgba(255,255,255,0.08)] pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#2563eb]">Community Trust & Safety</span>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-white leading-none">
              Student ID Verification
            </h1>
            <p className="mt-2 text-xs text-[#cbd5e1] font-semibold">
              UniFetch connects verified campus peers. Your student ID is securely stored for identity trust.
            </p>
          </div>

          <Badge
            tone={
              isVerified ? "success" :
              isSubmitted ? "info" :
              status === "rejected" ? "danger" : "warning"
            }
            className="px-4 py-2 font-bold text-xs uppercase tracking-widest border shrink-0"
          >
            Status: {isVerified ? "Verified" : isSubmitted ? "ID Submitted" : status === "rejected" ? "Rejected" : "Pending"}
          </Badge>
        </div>

        <div className="rounded-[2.5rem] border border-[rgba(255,255,255,0.08)] p-6 sm:p-8 bg-[#080d16]/30">
          {/* ID SUBMITTED / APPROVED STATE */}
          {isVerifiedOrSubmitted && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-[#22c55e]/20 bg-[#22c55e]/6 p-8 text-center shadow-glow">
                <CheckCircle2 className="h-16 w-16 text-[#22c55e] mx-auto mb-4 animate-bounce" />
                <h2 className="font-display text-2xl font-bold text-[#22c55e]">
                  {isVerified ? "You are a Verified Student!" : "Student ID Submitted!"}
                </h2>
                <p className="mt-3 text-xs text-[#cbd5e1] font-semibold max-w-md mx-auto leading-relaxed">
                  {isVerified
                    ? "Your student credentials are fully verified. You can create delivery requests, accept deliveries, and participate in peer-to-peer transactions."
                    : "Your student credentials are on file. You have immediate access to explore the marketplace and browse trips while administrative verification completes."}
                </p>

                <div className="mt-6 flex justify-center">
                  <Link
                    href="/"
                    className="neo-btn-primary px-8 py-3 text-xs font-extrabold uppercase tracking-widest shadow-glow inline-flex items-center gap-2"
                  >
                    <span>Enter UniFetch Marketplace</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* Option to re-upload ID if needed */}
              <div className="border-t border-[rgba(255,255,255,0.06)] pt-6">
                <p className="text-xs font-bold text-white mb-2 uppercase tracking-wider">Update Student ID Card</p>
                <p className="text-xs text-[#cbd5e1] mb-4">Need to update your ID photo? Select a new JPG, JPEG, or PNG image below.</p>
              </div>
            </div>
          )}

          {/* PENDING / REJECTED INFO BANNER */}
          {!isVerifiedOrSubmitted && (
            <div className="space-y-6">
              {status === "pending" && (
                <div className="flex items-start gap-3.5 rounded-2xl border border-[#2563eb]/20 bg-[#2563eb]/6 p-5 text-xs text-[#60a5fa] font-bold">
                  <Clock className="h-5.5 w-5.5 shrink-0 text-[#2563eb]" />
                  <div>
                    <p className="font-extrabold text-white">Student ID Required</p>
                    <p className="mt-1 font-semibold text-[#cbd5e1] leading-relaxed">
                      Please upload your college ID card to activate full access to campus requests. Once submitted, access is unlocked immediately.
                    </p>
                  </div>
                </div>
              )}

              {status === "rejected" && (
                <div className="flex items-start gap-3.5 rounded-2xl border border-[#ef4444]/20 bg-[#ef4444]/6 p-5 text-xs text-[#ef4444] font-bold">
                  <ShieldAlert className="h-5.5 w-5.5 shrink-0 text-[#ef4444]" />
                  <div>
                    <p className="font-extrabold">ID Photo Needs Re-submission</p>
                    <p className="mt-1 font-semibold text-[#cbd5e1] leading-relaxed">
                      Your student card photo was unclear. Please upload a clear photo where your student name and college are legible.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Upload Dropzone (for pending, rejected, or re-upload) */}
          <div className="space-y-6 pt-2">
            {/* Guidelines */}
            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#05070b]/60 p-5 text-xs text-[#cbd5e1] font-semibold leading-relaxed">
              <p className="font-bold text-white mb-2.5 uppercase tracking-wider text-[10px]">Photo Requirements:</p>
              <ul className="space-y-2 text-[#cbd5e1]/90">
                <li>• Photo must show your student ID card clearly.</li>
                <li>• Student name and college name must be readable.</li>
                <li>• Accepts JPG, JPEG, or PNG up to 5MB.</li>
              </ul>
            </div>

            {/* Drop area */}
            <div>
              <label htmlFor="collegeId" className="field-label text-[10px] font-bold tracking-wider mb-3.5 uppercase">
                Upload Student ID Card Photo
              </label>
              <div className="relative group rounded-2xl border-2 border-dashed border-[rgba(255,255,255,0.08)] bg-white/3 p-10 text-center transition-all duration-150 hover:border-[#2563eb] hover:bg-[#2563eb]/5">
                <input
                  id="collegeId"
                  type="file"
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadCloud className="h-10 w-10 text-[#cbd5e1] mx-auto mb-3 group-hover:text-primary transition-colors animate-pulse" />
                <p className="text-xs font-bold text-white">
                  {file ? file.name : "Drag and drop your ID card image here, or click to browse"}
                </p>
                <p className="text-[10px] text-[#cbd5e1] mt-1.5 font-semibold">JPG, JPEG, PNG up to 5MB</p>
              </div>
            </div>

            {/* Preview Thumbnail */}
            {previewUrl && (
              <animated.div style={previewSpring} className="rounded-2xl border border-[#2563eb]/20 bg-[#2563eb]/6 p-4.5 flex items-center gap-4.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="ID Card Thumbnail"
                  className="h-16 w-24 object-cover rounded-lg border border-[#2563eb]/20 shadow-glow"
                />
                <div>
                  <p className="text-xs font-extrabold text-white flex items-center gap-2">
                    <FileImage className="h-4.5 w-4.5 text-[#2563eb]" />
                    Ready to Submit
                  </p>
                  <p className="text-[10px] text-[#cbd5e1] mt-1 font-mono truncate max-w-[240px]">{file?.name}</p>
                </div>
              </animated.div>
            )}

            {error && <Alert tone="error">{error}</Alert>}
            {message && <Alert tone="success">{message}</Alert>}

            <Button
              type="button"
              onClick={handleUpload}
              disabled={isUploading || !file}
              className="w-full flex items-center justify-center gap-1.5 uppercase tracking-wider text-xs font-bold py-3.5 mt-2 shadow-glow"
            >
              <span>{isUploading ? "Uploading file..." : "Submit Student ID 🚀"}</span>
            </Button>
          </div>
        </div>
      </div>
    </SidebarShell>
  );
}