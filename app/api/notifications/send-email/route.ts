import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: NextRequest) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM || "onboarding@resend.dev";

  // 1. If Resend is not configured, exit gracefully without error
  if (!resendApiKey) {
    return NextResponse.json({ success: true, message: "Resend not configured, email skipped." });
  }

  try {
    const { notificationId } = await req.json();
    if (!notificationId) {
      return NextResponse.json({ error: "Missing notificationId" }, { status: 400 });
    }

    // Initialize Supabase Server Client to verify user session
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
    
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return req.cookies.getAll().map((cookie) => ({
            name: cookie.name,
            value: cookie.value,
          }));
        },
        setAll(_cookiesToSet) {
          // Read-only context
        },
      },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the notification and verify ownership
    const { data: notification, error: notifError } = await supabase
      .from("notifications")
      .select("*, profiles:user_id ( email, full_name )")
      .eq("id", notificationId)
      .eq("user_id", user.id)
      .single();

    if (notifError || !notification) {
      return NextResponse.json({ error: "Notification not found or unauthorized" }, { status: 404 });
    }

    const recipientEmail = notification.profiles?.email;
    const recipientName = notification.profiles?.full_name || "Student";

    if (!recipientEmail) {
      return NextResponse.json({ success: true, message: "Recipient has no email address configured." });
    }

    // Send transactional email calling the Resend API directly
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: `UniFetch <${emailFrom}>`,
        to: [recipientEmail],
        subject: `UniFetch — ${notification.title}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #2563eb; font-size: 20px; font-weight: bold; margin-bottom: 15px;">UniFetch</h2>
            <p style="font-size: 14px; color: #1e293b; font-weight: 600;">Hi ${recipientName},</p>
            <p style="font-size: 14px; color: #334155; line-height: 1.5; margin-bottom: 20px;">
              ${notification.message}
            </p>
            ${
              notification.link
                ? `<a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}${notification.link}" 
                      style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; font-size: 12px; font-weight: bold; text-decoration: none; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.05em;">
                     View Task
                   </a>`
                : ""
            }
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
            <p style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;">
              UniFetch — Need It? Ask Someone Who’s Going.
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Resend API HTTP Error:", errText);
      return NextResponse.json({ error: errText }, { status: response.status });
    }

    return NextResponse.json({ success: true, message: "Email notification sent successfully." });
  } catch (err) {
    console.error("Email send handler crash:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to process request" }, { status: 500 });
  }
}
