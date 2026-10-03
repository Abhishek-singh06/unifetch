"use client";

import { useSpring, animated } from "@react-spring/web";
import { ShieldAlert, CreditCard, UserCheck, AlertTriangle, HeartHandshake } from "lucide-react";
import { SidebarShell } from "../components/SidebarShell";

export default function SafetyGuidePage() {
  const pageSpring = useSpring({
    from: { opacity: 0, transform: "translate3d(0, 15px, 0)" },
    to: { opacity: 1, transform: "translate3d(0, 0, 0)" },
    config: { tension: 320, friction: 24 },
  });

  return (
    <SidebarShell>
      <div className="p-6 sm:p-8 lg:p-10 space-y-8 max-w-4xl">
        
        {/* Title Area */}
        <div className="border-b border-[rgba(255,255,255,0.08)] pb-6">
          <span className="text-xs font-bold uppercase tracking-widest text-[#2563eb]">Trust & safety</span>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-white leading-none">
            Safety & Trust Guide
          </h1>
          <p className="mt-2 text-xs text-[#cbd5e1] font-semibold">
            UniFetch is built on community and trust. Please read our guidelines to ensure secure interactions.
          </p>
        </div>

        <animated.div style={pageSpring} className="space-y-6">
          
          {/* Card 1: Before Accepting a Task */}
          <div className="rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-6 bg-[#080d16]/30 space-y-3">
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-[#2563eb]" />
              Before Accepting a Task
            </h2>
            <ul className="text-xs text-[#cbd5e1] font-semibold leading-relaxed list-disc list-inside space-y-2">
              <li><strong>Understand what you are carrying:</strong> Always verify what item is requested. If the description is vague, ask for details.</li>
              <li><strong>No suspicious or prohibited items:</strong> Do not carry illegal substances, weapons, flammable objects, or high-value currency.</li>
              <li><strong>Confirm details:</strong> Agree on gate/hostel pickup locations and timeline beforehand.</li>
            </ul>
          </div>

          {/* Card 2: Payments Security */}
          <div className="rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-6 bg-[#080d16]/30 space-y-3">
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[#2563eb]" />
              Secure Payments
            </h2>
            <ul className="text-xs text-[#cbd5e1] font-semibold leading-relaxed list-disc list-inside space-y-2">
              <li><strong>Within College:</strong> Handled entirely through virtual Credits. No physical cash should change hands.</li>
              <li><strong>Outside Campus:</strong> Uses real INR. Negotiation and payment happen student-to-student. Verify payment receipt before delivering items.</li>
              <li><strong>Credentials:</strong> Never share your passwords, OTP keys, or bank codes with anyone.</li>
            </ul>
          </div>

          {/* Card 3: Personal Safety */}
          <div className="rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-6 bg-[#080d16]/30 space-y-3">
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-[#2563eb]" />
              Personal Safety Guidelines
            </h2>
            <ul className="text-xs text-[#cbd5e1] font-semibold leading-relaxed list-disc list-inside space-y-2">
              <li><strong>Safe Meeting Areas:</strong> Arrange pick-ups and drop-offs in well-lit, public areas around campus or hostel lobbies.</li>
              <li><strong>Trust your instincts:</strong> If a delivery location or request feels unsafe or suspicious, decline the delivery immediately.</li>
              <li><strong>Report/Block:</strong> Use our built-in Report and Block tools to flag unsafe behavior or users to the admin team.</li>
            </ul>
          </div>

          {/* Card 4: Prohibited Items */}
          <div className="rounded-[2rem] border border-dashed border-red-500/20 bg-red-500/3 p-6 space-y-3">
            <h2 className="font-display text-lg font-bold text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Prohibited Items Policy
            </h2>
            <p className="text-xs text-[#cbd5e1] font-semibold leading-relaxed">
              Users must not request, pick up, or drop off any items that are illegal, dangerous, harmful, or restricted by college guidelines. This includes drugs, alcohol, weapons, hazardous materials, and items of extremely high value. Carrying prohibited items will result in immediate permanent deactivation.
            </p>
          </div>

          {/* Card 5: Trust, Reviews, & Moderation */}
          <div className="rounded-[2rem] border border-[rgba(255,255,255,0.08)] p-6 bg-[#080d16]/30 space-y-3">
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <HeartHandshake className="h-5 w-5 text-[#2563eb]" />
              Community Trust & Reviews
            </h2>
            <p className="text-xs text-[#cbd5e1] font-semibold leading-relaxed">
              Review star ratings help verify peer reputation, but should not replace personal safety caution. If another student behaves inappropriately, you can report them for moderator review. Reports are resolved within 24 hours.
            </p>
          </div>

        </animated.div>
      </div>
    </SidebarShell>
  );
}
