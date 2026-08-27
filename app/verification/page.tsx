"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, UploadCloud, FileImage, ShieldAlert, Clock } from "lucide-react";
import { useSpring, animated } from "@react-spring/web";
import { supabase } from "@/lib/supabase/client";
import { SidebarShell } from "../components/SidebarShell";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { Badge } from "../components/ui/Badge";
import { PageLoader } from "../components/ui/Spinner";

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
              UniFetch is an exclusive campus community. Verify your student credentials below.
            </p>
          </div>

          <Badge
            tone={
              status === "approved" ? "success" :
              status === "rejected" ? "danger" : "warning"
            }
            className="px-4 py-2 font-bold text-xs uppercase tracking-widest border shrink-0"
          >
            Status: {status}
          </Badge>
        </div>

        <div className="rounded-[2.5rem] border border-[rgba(255,255,255,0.08)] p-6 sm:p-8 bg-[#080d16]/30">
          {/* VERIFIED STATE */}
          {status === "approved" && (
            <div className="rounded-2xl border border-[#22c55e]/20 bg-[#22c55e]/6 p-8 text-center shadow-glow">
              <ShieldCheck className="h-16 w-16 text-[#22c55e] mx-auto mb-4 animate-bounce" />
              <h2 className="font-display text-2xl font-bold text-[#22c55e]">
                You are verified student!
              </h2>
              <p className="mt-3 text-xs text-[#cbd5e1] font-semibold max-w-md mx-auto leading-relaxed">
                Your ID has been checked and approved by the admin verification team. You have full access to campus requests.
              </p>
            </div>
          )}

          {/* PENDING / REJECTED UPLOAD BOX */}
          {status !== "approved" && (
            <div className="space-y-6">
              {status === "pending" && (
                <div className="flex items-start gap-3.5 rounded-2xl border border-[#eab308]/20 bg-[#eab308]/6 p-5 text-xs text-[#eab308] font-bold">
                  <Clock className="h-5.5 w-5.5 shrink-0 text-[#eab308]" />
                  <div>
                    <p className="font-extrabold">Review In Progress</p>
                    <p className="mt-1 font-semibold text-[#cbd5e1] leading-relaxed">We are currently verifying your student identity card. Access will be unlocked immediately upon approval.</p>
                  </div>
                </div>
              )}

              {status === "rejected" && (
                <div className="flex items-start gap-3.5 rounded-2xl border border-[#ef4444]/20 bg-[#ef4444]/6 p-5 text-xs text-[#ef4444] font-bold">
                  <ShieldAlert className="h-5.5 w-5.5 shrink-0 text-[#ef4444]" />
                  <div>
                    <p className="font-extrabold">Verification Rejected</p>
                    <p className="mt-1 font-semibold text-[#cbd5e1] leading-relaxed">Your student card photo was rejected. Please re-upload a clear image containing readable text and valid dates.</p>
                  </div>
                </div>
              )}

              {/* Guidelines */}
              <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#05070b]/60 p-5 text-xs text-[#cbd5e1] font-semibold leading-relaxed">
                <p className="font-bold text-white mb-2.5 uppercase tracking-wider text-[10px]">Photo Requirements:</p>
                <ul className="space-y-2 text-[#cbd5e1]/90">
                  <li>• Photo must show your student ID card clearly.</li>
                  <li>• Student name and academic validity year must be legible.</li>
                  <li>• Accepts JPEG, PNG, or WebP up to 5MB size.</li>
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
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <UploadCloud className="h-10 w-10 text-[#cbd5e1] mx-auto mb-3 group-hover:text-primary transition-colors animate-pulse" />
                  <p className="text-xs font-bold text-white">
                    {file ? file.name : "Drag and drop your ID card image here, or click to browse"}
                  </p>
                  <p className="text-[10px] text-[#cbd5e1] mt-1.5 font-semibold">JPEG, PNG, WebP up to 5MB</p>
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
                      Thumbnail Selected
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
                <span>{isUploading ? "Uploading file..." : "Submit for Student Verification 🚀"}</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </SidebarShell>
  );
}