import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Verify Supabase webhook secret to prevent abuse
  const secret = req.headers.get("x-webhook-secret");
  if (!secret || secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { record?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const r = body.record;
  if (!r) return NextResponse.json({ ok: true });

  const lines = [
    "🎉 New Soma Africa lead!",
    `School: ${r.school_name}`,
    `Director: ${r.director_name} (${r.role})`,
    `Students: ${r.student_count}`,
    `WhatsApp: ${r.whatsapp}`,
    r.email ? `Email: ${r.email}` : null,
  ].filter(Boolean);

  // ── Email via Resend ──────────────────────────────────────────
  const resendKey   = process.env.RESEND_API_KEY;
  const notifyEmail = process.env.NOTIFY_EMAIL;

  if (resendKey && notifyEmail) {
    try {
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Soma Africa <onboarding@resend.dev>",
          to:   [notifyEmail],
          subject: `New lead: ${r.school_name}`,
          html: `<pre style="font-family:sans-serif;font-size:15px;line-height:1.7">${lines.join("\n")}</pre>`,
        }),
      });
      const resendBody = await resendRes.json();
      if (!resendRes.ok) {
        console.error("Resend rejected email:", JSON.stringify(resendBody));
      } else {
        console.log("Resend email sent:", resendBody.id);
      }
    } catch (err) {
      console.error("Resend error:", err);
    }
  } else {
    console.warn("Email notify: RESEND_API_KEY or NOTIFY_EMAIL not set");
  }

  // ── WhatsApp via CallMeBot (optional) ─────────────────────────
  const phone      = process.env.NOTIFY_PHONE;
  const callmeKey  = process.env.CALLMEBOT_API_KEY;

  if (phone && callmeKey) {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(lines.join("\n"))}&apikey=${callmeKey}`;
    try {
      await fetch(url);
    } catch (err) {
      console.error("CallMeBot error:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
