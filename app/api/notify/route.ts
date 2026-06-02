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

  const phone  = process.env.NOTIFY_PHONE;
  const apiKey = process.env.CALLMEBOT_API_KEY;

  if (!phone || !apiKey) {
    console.warn("WhatsApp notify: NOTIFY_PHONE or CALLMEBOT_API_KEY not set");
    return NextResponse.json({ ok: true });
  }

  const lines = [
    "🎉 New Soma Africa lead!",
    `School: ${r.school_name}`,
    `Director: ${r.director_name} (${r.role})`,
    `Students: ${r.student_count}`,
    `WhatsApp: ${r.whatsapp}`,
    r.email ? `Email: ${r.email}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(lines)}&apikey=${apiKey}`;

  try {
    await fetch(url);
  } catch (err) {
    console.error("CallMeBot error:", err);
  }

  return NextResponse.json({ ok: true });
}
