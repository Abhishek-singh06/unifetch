"use client";

import { useEffect, useState } from "react";
import { Coins, ShieldCheck, CreditCard, CheckCircle, Upload, Clock, XCircle, Info } from "lucide-react";
import { useSpring, animated } from "@react-spring/web";
import { supabase } from "@/lib/supabase/client";
import { SidebarShell } from "../components/SidebarShell";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { CREDIT_PRICING_PACKAGES, ADMIN_UPI_ID, ADMIN_UPI_NAME } from "@/lib/config";

type CreditPurchase = {
  id: string;
  credits: number;
  amount: number;
  payment_reference: string;
  payment_proof_url: string | null;
  status: "pending" | "completed" | "rejected";
  rejection_reason: string | null;
  created_at: string;
};

export default function BuyCreditsPage() {
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [purchasing, setPurchasing] = useState<boolean>(false);
  const [selectedPackage, setSelectedPackage] = useState<number>(0); // Index of CREDIT_PRICING_PACKAGES
  const [paymentRef, setPaymentRef] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  
  const [purchases, setPurchases] = useState<CreditPurchase[]>([]);
  const [message, setMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get current credits
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .single();

    if (profile) {
      setCredits(profile.credits || 0);
    }

    // Get past purchases
    const { data: purchasesData } = await supabase
      .from("credit_purchases")
      .select("*")
      .order("created_at", { ascending: false });

    if (purchasesData) {
      setPurchases(purchasesData);
    }
    setLoading(false);
  }

  useEffect(() => {
    void (async () => {
      await loadData();
    })();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setFilePreview(URL.createObjectURL(selected));
    }
  };

  async function handleBuyCredits(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setErrorMessage("");
    
    if (!paymentRef.trim()) {
      setErrorMessage("Please enter the UPI Transaction Reference ID / UTR.");
      return;
    }

    setPurchasing(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setErrorMessage("Please sign in to buy credits.");
      setPurchasing(false);
      return;
    }

    const pkg = CREDIT_PRICING_PACKAGES[selectedPackage];

    try {
      let proofUrlPath = null;

      // Upload file if selected
      if (file) {
        const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const filePath = `${user.id}/receipt-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("payment-proofs")
          .upload(filePath, file, {
            upsert: true,
            contentType: file.type,
          });

        if (uploadError) {
          throw new Error("Failed to upload screenshot: " + uploadError.message);
        }
        proofUrlPath = filePath;
      }

      // Call Supabase RPC buy_credits
      const { data: success, error: rpcError } = await supabase.rpc("buy_credits", {
        p_credits: pkg.credits,
        p_payment_reference: paymentRef.trim(),
        p_payment_proof_url: proofUrlPath
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      if (success) {
        setMessage("🎉 Payment details submitted successfully! Your request is pending admin verification.");
        setPaymentRef("");
        setFile(null);
        setFilePreview(null);
        // Reload data
        loadData();
      } else {
        throw new Error("Unable to log your purchase request.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      console.error(err);
      setErrorMessage(message);
    } finally {
      setPurchasing(false);
    }
  }

  const pageSpring = useSpring({
    from: { opacity: 0, transform: "translate3d(0, 15px, 0)" },
    to: { opacity: 1, transform: "translate3d(0, 0, 0)" },
    config: { tension: 320, friction: 24 },
  });

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05070b]">
        <div className="text-center">
          <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-glow animate-bounce mx-auto">
            <svg className="h-6 w-6 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
          </span>
          <p className="mt-5 text-[10px] font-extrabold tracking-widest text-[#cbd5e1] font-display uppercase">
            Loading Wallet...
          </p>
        </div>
      </main>
    );
  }

  const activePackage = CREDIT_PRICING_PACKAGES[selectedPackage];
  const upiUrl = `upi://pay?pa=${ADMIN_UPI_ID}&pn=${encodeURIComponent(ADMIN_UPI_NAME)}&cu=INR&am=${activePackage.price}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;

  return (
    <SidebarShell>
      <div className="p-6 sm:p-8 lg:p-10 space-y-8">
        
        {/* Title area */}
        <div className="border-b border-[rgba(255,255,255,0.08)] pb-6">
          <span className="text-xs font-bold uppercase tracking-widest text-[#2563eb]">UniFetch Credits</span>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-white leading-none">
            Buy Credits
          </h1>
          <p className="mt-2 text-xs text-[#cbd5e1] font-semibold">
            Get Within-Campus deliveries without carrying parcels. Purchase credits securely.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] items-start">
          {/* Left Form Card */}
          <animated.div style={pageSpring} className="space-y-8">
            <div className="rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-6 sm:p-8 bg-[#080d16]/40 backdrop-blur-sm space-y-6">
              
              {/* Balance Card */}
              <div className="rounded-2xl border border-[#2563eb]/25 bg-[#2563eb]/6 p-6 flex items-center justify-between shadow-glow">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-glow">
                    <Coins className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#cbd5e1] block">Current Wallet Balance</span>
                    <span className="font-display font-black text-2.5xl text-white mt-1">{credits} Credits</span>
                  </div>
                </div>
              </div>

              {/* Selection packages */}
              <div className="space-y-4">
                <label className="field-label font-extrabold text-[10px] text-[#cbd5e1] tracking-wider uppercase">
                  1. Select Credits Package
                </label>
                <div className="grid gap-4 sm:grid-cols-3">
                  {CREDIT_PRICING_PACKAGES.map((pkg, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedPackage(idx);
                        setMessage("");
                        setErrorMessage("");
                      }}
                      className={`flex flex-col items-center justify-center rounded-2xl p-5 text-center transition-all duration-150 border-2 ${
                        selectedPackage === idx
                          ? "border-[#2563eb] bg-[#2563eb]/10 text-white shadow-glow"
                          : "border-[rgba(255,255,255,0.08)] bg-white/5 text-[#cbd5e1] hover:border-[#2563eb]/30 hover:text-white"
                      }`}
                    >
                      <span className="text-xl mb-1">🪙</span>
                      <span className="text-sm font-bold block">{pkg.credits} Credits</span>
                      <span className="text-[10px] font-semibold text-muted block mt-1.5 bg-white/5 px-2 py-0.5 rounded-full">
                        ₹{pkg.price}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pay QR Block */}
              <div className="border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 bg-[#03060c] flex flex-col sm:flex-row items-center gap-6">
                <div className="bg-white p-3 rounded-2xl shrink-0 shadow-lg">
                  <img src={qrCodeUrl} alt="UPI Payment QR Code" className="w-[180px] h-[180px]" />
                </div>
                <div className="space-y-3 text-center sm:text-left">
                  <span className="text-[9px] font-extrabold tracking-widest text-[#2563eb] uppercase block">2. Scan and Pay</span>
                  <h4 className="font-display font-bold text-white text-lg">Pay exactly ₹{activePackage.price}</h4>
                  <p className="text-xs text-[#cbd5e1] font-medium leading-relaxed max-w-[280px]">
                    Use any UPI App (GPay, PhonePe, Paytm, etc.) to scan the QR and complete your payment to the site admin.
                  </p>
                  <div className="pt-2">
                    <span className="text-[8px] font-bold text-muted block uppercase">UPI ID</span>
                    <span className="font-mono text-xs font-bold text-white bg-white/5 px-3 py-1.5 rounded-lg select-all border border-white/5 mt-1 block w-fit mx-auto sm:mx-0">
                      {ADMIN_UPI_ID}
                    </span>
                  </div>
                </div>
              </div>

              {/* Verification Form */}
              <form onSubmit={handleBuyCredits} className="space-y-5 pt-2">
                <span className="text-[9px] font-extrabold tracking-widest text-[#2563eb] uppercase block">3. Submit Payment Verification</span>
                
                <div className="space-y-2">
                  <label className="field-label font-bold text-[10px] text-[#cbd5e1] uppercase">
                    UPI Transaction ID / Ref No / UTR <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter 12-digit UPI reference number"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    className="w-full rounded-xl bg-white/5 border border-[rgba(255,255,255,0.08)] px-4 py-3 text-xs text-white placeholder-muted focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="field-label font-bold text-[10px] text-[#cbd5e1] uppercase">
                    Upload Payment Screenshot <span className="text-[#888]">(Optional)</span>
                  </label>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <label className="flex items-center gap-2 border border-dashed border-[rgba(255,255,255,0.15)] bg-white/5 hover:bg-white/8 transition duration-200 text-white rounded-xl px-5 py-3 cursor-pointer text-xs font-bold w-full sm:w-auto text-center justify-center">
                      <Upload className="h-4.5 w-4.5 text-primary" />
                      Choose File
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    {file && (
                      <span className="text-xs font-semibold text-white truncate max-w-[200px]">
                        {file.name}
                      </span>
                    )}
                  </div>
                  {filePreview && (
                    <div className="mt-3 p-2 bg-[#03060c] border border-white/5 rounded-xl max-w-[200px]">
                      <img src={filePreview} alt="Screenshot Preview" className="rounded-lg object-contain w-full h-[120px]" />
                    </div>
                  )}
                </div>

                {errorMessage && <Alert tone="error">{errorMessage}</Alert>}
                {message && <Alert tone="success">{message}</Alert>}

                <Button
                  type="submit"
                  size="lg"
                  disabled={purchasing}
                  className="w-full flex items-center justify-center gap-2 uppercase tracking-wider text-xs font-bold py-3.5 shadow-glow"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>{purchasing ? "Submitting Request..." : `Submit Verification`}</span>
                </Button>
              </form>

            </div>

            {/* Purchase History Queue */}
            <div className="rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-6 sm:p-8 bg-[#080d16]/30 backdrop-blur-sm space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h3 className="font-display font-bold text-white text-lg">Purchase History</h3>
                <span className="text-[9px] font-extrabold tracking-widest text-[#2563eb] uppercase bg-[#2563eb]/10 px-3 py-1 rounded-full">
                  {purchases.length} Transactions
                </span>
              </div>

              {purchases.length === 0 ? (
                <div className="text-center py-8">
                  <Coins className="h-8 w-8 text-muted mx-auto opacity-30 mb-2" />
                  <p className="text-xs text-[#cbd5e1] font-semibold">No transactions yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {purchases.map((p) => (
                    <div key={p.id} className="border border-white/5 rounded-2xl p-5 bg-[#03060c]/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-white">🪙 {p.credits} Credits</span>
                          <span className="text-[10px] font-bold text-muted bg-white/5 px-2 py-0.5 rounded-md">₹{p.amount}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold text-[#cbd5e1] block">
                            UTR: <span className="font-mono text-white font-bold select-all">{p.payment_reference}</span>
                          </span>
                          <span className="text-[9px] text-[#cbd5e1] font-semibold block">
                            Submitted on {new Date(p.created_at).toLocaleString()}
                          </span>
                        </div>
                        
                        {p.rejection_reason && (
                          <div className="text-xs font-semibold text-[#ef4444] bg-[#ef4444]/10 p-2.5 rounded-xl border border-[#ef4444]/15 mt-1 flex items-start gap-2">
                            <Info className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>Reason: {p.rejection_reason}</span>
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 flex items-center">
                        {p.status === "pending" && (
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="flex items-center gap-1 text-[10px] font-bold text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/20 px-3 py-1 rounded-full uppercase tracking-wider">
                              <Clock className="h-3 w-3" />
                              Pending
                            </span>
                            <span className="text-[9px] text-muted font-semibold max-w-[200px] text-right block">
                              Payment submitted. Waiting for admin verification.
                            </span>
                          </div>
                        )}
                        {p.status === "completed" && (
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="flex items-center gap-1 text-[10px] font-bold text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/20 px-3 py-1 rounded-full uppercase tracking-wider">
                              <CheckCircle className="h-3 w-3" />
                              Completed
                            </span>
                            <span className="text-[9px] text-muted font-semibold max-w-[200px] text-right block">
                              Payment verified. Credits have been added.
                            </span>
                          </div>
                        )}
                        {p.status === "rejected" && (
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="flex items-center gap-1 text-[10px] font-bold text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 px-3 py-1 rounded-full uppercase tracking-wider">
                              <XCircle className="h-3 w-3" />
                              Rejected
                            </span>
                            <span className="text-[9px] text-muted font-semibold max-w-[200px] text-right block">
                              Payment could not be verified.
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </animated.div>

          {/* Right Information Sidebar */}
          <div className="space-y-6 lg:sticky lg:top-[85px]">
            {/* Rates card */}
            <div className="rounded-[2rem] border border-[#2563eb]/25 p-6 bg-gradient-to-b from-[#080d16] to-[#05070b]/60 shadow-glow relative overflow-hidden">
              <div className="absolute top-[20%] right-[-10%] w-[150px] h-[150px] rounded-full bg-[#2563eb]/8 blur-2xl pointer-events-none" />
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h3 className="font-display font-bold text-white">
                  Credit Rules & Pricing
                </h3>
              </div>
              <ul className="mt-4 space-y-3.5 text-xs text-[#cbd5e1] font-semibold">
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="h-4.5 w-4.5 text-[#2563eb] shrink-0 mt-0.5" />
                  <span>100 Credits cost exactly ₹10 (standard campus conversion rate).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="h-4.5 w-4.5 text-[#2563eb] shrink-0 mt-0.5" />
                  <span>Creating a within-campus request costs 50 credits (deducted instantly).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="h-4.5 w-4.5 text-[#2563eb] shrink-0 mt-0.5" />
                  <span>Completing a within-campus carry task earns you +35 credits.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </SidebarShell>
  );
}
