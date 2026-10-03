"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useState } from "react";
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Coins,
  Eye,
  EyeOff,
  User,
  GraduationCap,
  Mail,
  UploadCloud,
  FileImage,
  CheckCircle2,
} from "lucide-react";
import { useSpring, animated } from "@react-spring/web";
import { supabase } from "@/lib/supabase/client";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { Alert } from "../components/ui/Alert";
import { Badge } from "../components/ui/Badge";

const perks = [
  { icon: ShieldCheck, label: "100% student-only community" },
  { icon: Coins, label: "6-digit tamper-proof delivery handshake" },
  { icon: Sparkles, label: "Zero delivery charges between students" },
];

export default function SignupPage() {
  const router = useRouter();

  // Onboarding Step: 1 = Details, 2 = ID Upload, 3 = Account Created
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form Details
  const [fullName, setFullName] = useState("");
  const [college, setCollege] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ID Upload State
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Step 1: Validate details and proceed to ID upload
  function handleDetailsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!fullName.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    if (!college.trim()) {
      setErrorMessage("Please enter your college / university name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid student email address.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    setStep(2);
  }

  // File selection & validation
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setErrorMessage("");
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    // File size check: 5 MB limit
    if (selectedFile.size > 5 * 1024 * 1024) {
      setErrorMessage("File size exceeds 5 MB limit. Please upload a smaller photo.");
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    // File type validation: JPG, JPEG, PNG
    const validMimes = ["image/jpeg", "image/png", "image/jpg"];
    const fileExt = selectedFile.name.split(".").pop()?.toLowerCase();
    const validExts = ["jpg", "jpeg", "png"];

    if (!validMimes.includes(selectedFile.type) && (!fileExt || !validExts.includes(fileExt))) {
      setErrorMessage("Please upload a valid student ID card photo in JPG, JPEG, or PNG format.");
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  }

  // Step 2: Create Account, Upload Student ID, set status to 'id_submitted'
  async function handleFinalSubmit() {
    if (!file) {
      setErrorMessage("Please select your student ID card image before completing registration.");
      return;
    }

    setErrorMessage("");
    setIsLoading(true);

    try {
      // 1. Create account directly via Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim(), college: college.trim() },
        },
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      if (!signUpData.user) {
        throw new Error("Could not create account. Please try again.");
      }

      const userId = signUpData.user.id;

      // 2. Upload student ID card to secure private storage bucket
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${userId}/college-id.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("student-ids")
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        console.warn("Storage upload notice:", uploadError.message);
      }

      // 3. Update profile with college_id_url and 'id_submitted' status
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          college_id_url: filePath,
          verification_status: "id_submitted",
        })
        .eq("id", userId);

      if (profileError) {
        console.warn("Profile update notice:", profileError.message);
      }

      // 4. Registration complete without email link waiting or manual admin approval
      setStep(3);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong during account setup."
      );
    } finally {
      setIsLoading(false);
    }
  }

  // React Spring entrance animations
  const leftPanelSpring = useSpring({
    from: { opacity: 0, transform: "translate3d(-25px, 0, 0)" },
    to: { opacity: 1, transform: "translate3d(0, 0, 0)" },
    config: { tension: 280, friction: 24 },
  });

  const rightPanelSpring = useSpring({
    from: { opacity: 0, transform: "translate3d(25px, 0, 0)" },
    to: { opacity: 1, transform: "translate3d(0, 0, 0)" },
    config: { tension: 280, friction: 24 },
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#05070b] p-4 selection:bg-[#2563eb]/20 sm:p-6 lg:p-8 grid-bg">
      <div className="grid min-h-[640px] w-full max-w-5xl overflow-hidden rounded-[2.5rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] shadow-glow lg:grid-cols-[1fr_1.1fr]">
        
        {/* Left: perks panel */}
        <animated.aside
          style={leftPanelSpring}
          className="relative hidden flex-col justify-between overflow-hidden bg-[#080d16] p-10 text-white lg:flex border-r border-[rgba(255,255,255,0.08)]"
        >
          {/* Subtle blue mesh background glow */}
          <div className="absolute -right-24 -bottom-24 h-80 w-80 rounded-full bg-[#2563eb]/15 blur-3xl pointer-events-none" />

          <Link href="/" className="relative z-10 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white border border-primary/20 shadow-primary">
              <svg className="h-5.5 w-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" />
                <path d="m4.5 7.7 7.5 4.2 7.5-4.2M12 12v9" />
              </svg>
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-white">UniFetch</span>
          </Link>

          <div className="relative z-10 my-auto space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2563eb]/20 bg-[#2563eb]/6 px-4 py-2 text-[9px] font-extrabold uppercase tracking-widest text-[#2563eb] shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              <span>100 starter credits included</span>
            </div>

            <h1 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tighter text-white">
              Join the student peer parcel network.
            </h1>

            <p className="text-xs leading-relaxed text-[#cbd5e1] font-semibold">
              Get gate deliveries brought right to your dorm lobby, or earn credits &amp; cash tips whenever you walk to the gate.
            </p>

            <ul className="space-y-4 pt-2">
              {perks.map((perk) => {
                const IconComp = perk.icon;
                return (
                  <li key={perk.label} className="flex items-center gap-3">
                    <span className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl bg-[#2563eb]/10 text-primary border border-[#2563eb]/20 shadow-sm">
                      <IconComp className="h-4.5 w-4.5 text-[#2563eb]" />
                    </span>
                    <span className="text-[#f9fafb] text-xs font-bold">{perk.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="relative z-10 flex items-center gap-2 text-xs font-bold text-[#cbd5e1] uppercase tracking-wider">
            <ShieldCheck className="h-4.5 w-4.5 text-primary" />
            Campus verified network · Active across dorms
          </div>
        </animated.aside>

        {/* Right: multi-step onboarding */}
        <animated.section
          style={rightPanelSpring}
          className="flex flex-col justify-center p-6 sm:p-12 lg:p-14"
        >
          <div className="mx-auto w-full max-w-md">
            <Link href="/" className="mb-6 flex items-center gap-2.5 text-lg font-bold text-white lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white border border-primary/20 shadow-primary">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" />
                  <path d="m4.5 7.7 7.5 4.2 7.5-4.2M12 12v9" />
                </svg>
              </div>
              <span className="font-display font-bold tracking-tight">UniFetch</span>
            </Link>

            {/* Stepper progress indicator */}
            <div className="flex items-center gap-2 mb-4">
              <span className={`h-1.5 flex-1 rounded-full ${step >= 1 ? "bg-[#2563eb]" : "bg-white/10"}`} />
              <span className={`h-1.5 flex-1 rounded-full ${step >= 2 ? "bg-[#2563eb]" : "bg-white/10"}`} />
              <span className={`h-1.5 flex-1 rounded-full ${step >= 3 ? "bg-[#22c55e]" : "bg-white/10"}`} />
            </div>

            {/* STEP 1: ENTER REQUIRED DETAILS */}
            {step === 1 && (
              <>
                <span className="text-xs font-bold uppercase tracking-widest text-[#2563eb]">Step 1 of 2 · Student registration</span>
                <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tighter text-white">
                  Create your account
                </h2>
                <p className="mt-1 text-xs text-[#cbd5e1] font-semibold">
                  Enter your student credentials to get started with 100 free starter credits.
                </p>

                <form className="mt-6 space-y-4" onSubmit={handleDetailsSubmit} noValidate>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-[38px] h-4 w-4 text-muted" />
                    <Field
                      id="fullName"
                      name="fullName"
                      type="text"
                      required
                      label="Full name"
                      placeholder="e.g. Aarav Sharma"
                      className="pl-10"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  
                  <div className="relative">
                    <GraduationCap className="pointer-events-none absolute left-3.5 top-[38px] h-4.5 w-4.5 text-muted" />
                    <Field
                      id="college"
                      name="college"
                      type="text"
                      required
                      label="College / university"
                      placeholder="e.g. Delhi Technological University"
                      className="pl-10"
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                    />
                  </div>
                  
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-[38px] h-4 w-4 text-muted" />
                    <Field
                      id="email"
                      name="email"
                      type="email"
                      required
                      label="Email address"
                      placeholder="you@college.edu"
                      autoComplete="email"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label htmlFor="password" className="field-label">Password</label>
                      <div className="relative">
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          required
                          placeholder="Min. 6 chars"
                          className="field pr-10 text-xs"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className="field-label">Confirm</label>
                      <div className="relative">
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirm ? "text" : "password"}
                          required
                          placeholder="Repeat password"
                          className="field pr-10 text-xs"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                        >
                          {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {errorMessage && <Alert tone="error">{errorMessage}</Alert>}

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full flex items-center justify-center gap-1.5 transition-transform duration-100 hover:scale-[1.01] active:scale-[0.99] uppercase tracking-wider text-xs py-3.5 mt-2 shadow-glow"
                  >
                    <span>Next: Upload Student ID</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>
              </>
            )}

            {/* STEP 2: UPLOAD STUDENT ID */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-[#2563eb]">Step 2 of 2 · Student ID Verification</span>
                  <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tighter text-white">
                    Upload Student ID
                  </h2>
                  <p className="mt-1 text-xs text-[#cbd5e1] font-semibold">
                    Upload a clear photo of your student ID card (JPG, JPEG, or PNG up to 5MB).
                  </p>
                </div>

                {/* Dropzone */}
                <div>
                  <label htmlFor="studentIdInput" className="field-label text-[10px] font-bold tracking-wider mb-2 uppercase">
                    Student ID Card Photo
                  </label>
                  <div className="relative group rounded-2xl border-2 border-dashed border-[rgba(255,255,255,0.12)] bg-white/3 p-8 text-center transition-all duration-150 hover:border-[#2563eb] hover:bg-[#2563eb]/5">
                    <input
                      id="studentIdInput"
                      type="file"
                      accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <UploadCloud className="h-9 w-9 text-[#cbd5e1] mx-auto mb-2 group-hover:text-primary transition-colors" />
                    <p className="text-xs font-bold text-white">
                      {file ? file.name : "Choose ID card image, or drag & drop here"}
                    </p>
                    <p className="text-[10px] text-[#cbd5e1] mt-1 font-semibold">
                      Accepts JPG, JPEG, PNG (max 5 MB)
                    </p>
                  </div>
                </div>

                {/* Preview Thumbnail */}
                {previewUrl && (
                  <div className="rounded-2xl border border-[#2563eb]/20 bg-[#2563eb]/6 p-3 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Student ID Preview"
                      className="h-14 w-20 object-cover rounded-lg border border-[#2563eb]/20 shadow-glow shrink-0"
                    />
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        <FileImage className="h-4 w-4 text-[#2563eb]" />
                        <span>Ready to upload</span>
                      </p>
                      <p className="text-[10px] text-[#cbd5e1] truncate">{file?.name}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2.5 rounded-2xl border border-[#2563eb]/20 bg-[#2563eb]/6 p-3.5 text-xs text-[#cbd5e1] font-medium">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#2563eb]" />
                  <span>
                    Your ID is stored securely in private storage and associated only with your account.
                  </span>
                </div>

                {errorMessage && <Alert tone="error">{errorMessage}</Alert>}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setErrorMessage(""); }}
                    className="neo-btn-secondary px-5 py-3 text-xs font-bold uppercase tracking-wider"
                  >
                    Back
                  </button>
                  <Button
                    type="button"
                    size="lg"
                    disabled={isLoading || !file}
                    onClick={handleFinalSubmit}
                    className="flex-1 flex items-center justify-center gap-1.5 uppercase tracking-wider text-xs py-3.5 shadow-glow"
                  >
                    <span>{isLoading ? "Creating account…" : "Create Account & Submit ID 🚀"}</span>
                    {!isLoading && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: ACCOUNT CREATED */}
            {step === 3 && (
              <div className="space-y-6 text-center py-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30 mx-auto shadow-glow animate-bounce">
                  <CheckCircle2 className="h-9 w-9" />
                </div>

                <div>
                  <Badge tone="success" className="px-3 py-1 font-bold text-xs uppercase tracking-widest mb-2">
                    ID Submitted
                  </Badge>
                  <h2 className="font-display text-3xl font-extrabold tracking-tighter text-white">
                    Account Created!
                  </h2>
                  <p className="mt-2 text-xs text-[#cbd5e1] font-semibold leading-relaxed max-w-sm mx-auto">
                    Your student ID has been received. You can now explore within-college and outside-campus deliveries right away.
                  </p>
                </div>

                <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-white/3 p-4 text-xs text-left space-y-2 text-[#cbd5e1]">
                  <div className="flex justify-between font-semibold">
                    <span>Student:</span>
                    <span className="text-white font-bold">{fullName}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>College:</span>
                    <span className="text-white font-bold">{college}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Starter Balance:</span>
                    <span className="text-[#22c55e] font-bold">100 Credits</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Onboarding Status:</span>
                    <span className="text-[#60a5fa] font-bold">ID Submitted (Full Access)</span>
                  </div>
                </div>

                <Button
                  type="button"
                  size="lg"
                  onClick={() => {
                    router.push("/");
                    router.refresh();
                  }}
                  className="w-full flex items-center justify-center gap-2 uppercase tracking-wider text-xs py-3.5 shadow-glow"
                >
                  <span>Continue to UniFetch</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {step !== 3 && (
              <p className="mt-6 text-center text-xs text-[#cbd5e1] font-semibold">
                Already registered?{" "}
                <Link href="/login" className="font-bold text-[#2563eb] underline underline-offset-4 hover:text-[#1d4ed8] transition-colors">
                  Sign in here
                </Link>
              </p>
            )}
          </div>
        </animated.section>
      </div>
    </main>
  );
}
