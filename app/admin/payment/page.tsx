"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Upload, Save, Image as ImageIcon } from "lucide-react";
import { useSpring, animated } from "@react-spring/web";
import { supabase } from "@/lib/supabase/client";
import { SidebarShell } from "../../components/SidebarShell";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Alert } from "../../components/ui/Alert";

export default function AdminPaymentSettingsPage() {
  const router = useRouter();

  const [upiId, setUpiId] = useState("");
  const [qrImagePath, setQrImagePath] = useState<string | null>(null);
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function checkAdminAndLoadSettings() {
      setLoading(true);
      setErrorMessage("");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Check role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "admin") {
        router.push("/");
        return;
      }

      // Load current payment settings
      const { data: settings, error } = await supabase
        .from("payment_settings")
        .select("*, profiles:updated_by ( full_name )")
        .eq("id", "00000000-0000-0000-0000-000000000000")
        .maybeSingle();

      if (error) {
        console.error("Error loading payment settings:", error);
        setErrorMessage("Failed to load payment settings.");
      } else if (settings) {
        setUpiId(settings.upi_id);
        setQrImagePath(settings.qr_image_path);
        setLastUpdated(settings.updated_at);
        if (settings.profiles) {
          setUpdatedBy(settings.profiles.full_name);
        }

        // Get public URL for current QR
        if (settings.qr_image_path) {
          const { data } = supabase.storage
            .from("payment-settings")
            .getPublicUrl(settings.qr_image_path);
          setQrPreviewUrl(data.publicUrl);
        }
      }
      setLoading(false);
    }

    checkAdminAndLoadSettings();
  }, [router]);

  async function handleQrUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB) and type
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("File size exceeds 5MB limit.");
      return;
    }
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage("Invalid file type. Only PNG, JPG, and WEBP images are allowed.");
      return;
    }

    setUploading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const filePath = `admin-qr-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-settings")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      setQrImagePath(filePath);

      // Get public URL for preview
      const { data } = supabase.storage
        .from("payment-settings")
        .getPublicUrl(filePath);
      setQrPreviewUrl(data.publicUrl);
      setSuccessMessage("QR Code uploaded to storage successfully.");
    } catch (err) {
      console.error("Error uploading QR:", err);
      setErrorMessage(err instanceof Error ? err.message : "Failed to upload QR code.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveChanges(e: React.FormEvent) {
    e.preventDefault();
    if (!upiId.trim()) {
      setErrorMessage("UPI ID is required.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("payment_settings")
        .upsert({
          id: "00000000-0000-0000-0000-000000000000",
          upi_id: upiId.trim(),
          qr_image_path: qrImagePath,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setSuccessMessage("✓ Payment settings updated successfully.");
      setLastUpdated(new Date().toISOString());

      // Fetch name again for updatedBy
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (profile) {
        setUpdatedBy(profile.full_name);
      }
    } catch (err) {
      console.error("Error saving payment settings:", err);
      setErrorMessage(err instanceof Error ? err.message : "Failed to save payment settings.");
    } finally {
      setSaving(false);
    }
  }

  const formSpring = useSpring({
    from: { opacity: 0, transform: "translate3d(0, 15px, 0)" },
    to: { opacity: 1, transform: "translate3d(0, 0, 0)" },
    config: { tension: 320, friction: 24 },
  });

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05070b]">
        <div className="text-center">
          <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-danger text-white shadow-glow animate-bounce mx-auto">
            <svg className="h-6 w-6 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
          </span>
          <p className="mt-5 text-[10px] font-extrabold tracking-widest text-[#cbd5e1] font-display uppercase">
            Loading Admin Portal...
          </p>
        </div>
      </main>
    );
  }

  return (
    <SidebarShell>
      <div className="p-6 sm:p-8 lg:p-10 space-y-8">
        {/* Title area */}
        <div className="border-b border-[rgba(255,255,255,0.08)] pb-6">
          <span className="text-xs font-bold uppercase tracking-widest text-danger">Admin Portal</span>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-white leading-none">
            Payment Settings
          </h1>
          <p className="mt-2 text-xs text-[#cbd5e1] font-semibold">
            Manage the official UPI ID and QR code used for student Credit purchases.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] items-start">
          {/* Left Form Card */}
          <animated.div style={formSpring}>
            <div className="rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-6 sm:p-8 bg-[#080d16]/40 backdrop-blur-sm">
              <h2 className="font-display text-xl font-bold text-white mb-6">Credit Payment Settings</h2>
              
              <form onSubmit={handleSaveChanges} className="space-y-6">
                
                {/* UPI ID */}
                <Field
                  id="upiId"
                  name="upiId"
                  type="text"
                  required
                  label="UPI ID"
                  placeholder="e.g. unifetch@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                />

                {/* QR Code Upload */}
                <div className="space-y-2">
                  <label className="field-label">QR Code Image</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 px-4.5 py-3 rounded-xl border border-[rgba(255,255,255,0.08)] bg-white/5 hover:bg-white/10 text-xs font-bold text-white cursor-pointer transition-colors">
                      <Upload className="h-4.5 w-4.5 text-danger" />
                      <span>{uploading ? "Uploading..." : "Upload New QR"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleQrUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                    <span className="text-[10px] text-muted font-semibold">Max 5MB (PNG, JPG, WEBP)</span>
                  </div>
                </div>

                {errorMessage && <Alert tone="error">{errorMessage}</Alert>}
                {successMessage && <Alert tone="success">{successMessage}</Alert>}

                <Button
                  type="submit"
                  size="lg"
                  disabled={saving || uploading}
                  className="w-full flex items-center justify-center gap-2 uppercase tracking-wider text-xs font-bold py-3.5 mt-2 bg-danger hover:bg-red-700 text-white border-none shadow-glow-danger"
                >
                  <Save className="h-4.5 w-4.5" />
                  <span>{saving ? "Saving Changes..." : "Save Changes"}</span>
                </Button>
              </form>
            </div>
          </animated.div>

          {/* Right Information & Preview Sidebar */}
          <div className="space-y-6 lg:sticky lg:top-[85px]">
            {/* Live Preview QR */}
            <div className="rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-6 bg-gradient-to-b from-[#080d16] to-[#05070b]/60 shadow-glow relative overflow-hidden">
              <div className="absolute top-[20%] right-[-10%] w-[150px] h-[150px] rounded-full bg-danger/5 blur-2xl pointer-events-none" />
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-danger" />
                <h3 className="font-display font-bold text-white">QR Code Preview</h3>
              </div>
              
              <div className="mt-5 flex justify-center p-6 bg-[#05070b]/80 rounded-2xl border border-[rgba(255,255,255,0.06)] min-h-[220px] items-center">
                {qrPreviewUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={qrPreviewUrl}
                    alt="Current QR Code Preview"
                    className="max-h-[200px] w-auto object-contain rounded-lg border border-[rgba(255,255,255,0.08)] shadow-glow"
                  />
                ) : (
                  <div className="text-center text-muted p-4">
                    <ImageIcon className="h-10 w-10 mx-auto opacity-35 mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-wider">No QR Code Uploaded</p>
                  </div>
                )}
              </div>

              {lastUpdated && (
                <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.04)] text-[10px] text-muted font-bold uppercase tracking-wider space-y-1">
                  <p>Last updated: {new Date(lastUpdated).toLocaleString()}</p>
                  {updatedBy && <p>Updated by: {updatedBy}</p>}
                </div>
              )}
            </div>

            {/* Quick Tips */}
            <div className="rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-6 bg-[#080d16]/30">
              <h4 className="font-display font-bold text-white flex items-center gap-2 border-b border-[rgba(255,255,255,0.08)] pb-3">
                <Info className="h-4 w-4 text-danger" />
                Payment Security Note
              </h4>
              <ul className="mt-4 space-y-3 text-xs text-[#cbd5e1] font-semibold list-disc list-inside">
                <li>Changes made here apply to students instantly.</li>
                <li>QR images are saved in secure Supabase storage.</li>
                <li>All profile edits by non-admins are protected at the database level.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </SidebarShell>
  );
}
