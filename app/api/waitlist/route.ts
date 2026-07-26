import { NextRequest, NextResponse } from "next/server";
import { getSupabase, Lead } from "@/lib/supabase";

async function sendWelcomeEmail(lead: Lead) {
  const firstName = lead.director_name.split(" ")[0];
  const annual = Math.round(lead.student_count * 8000 * 0.35 * 10);
  const fmt = "UGX " + annual.toLocaleString("en-US");

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [lead.email],
      subject: `${firstName}, your founding spot request is in ✓`,
      html: `
<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;background:#0D0D0D;color:#F5F0E8;border-radius:12px;overflow:hidden">
  <div style="height:6px;background:#E5A019"></div>
  <div style="padding:36px 32px">
    <div style="color:#E5A019;font-size:13px;letter-spacing:3px;font-weight:bold;margin-bottom:20px">SOMA AFRICA</div>
    <h1 style="font-size:26px;line-height:1.25;margin:0 0 18px">You're on the waitlist, ${firstName}.</h1>
    <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:rgba(245,240,232,0.75);margin:0 0 18px">
      <strong style="color:#F5F0E8">${lead.school_name}</strong> is now in line for one of the
      <strong style="color:#E5A019"> 2 remaining founding school spots</strong>.
    </p>
    <div style="background:rgba(229,160,25,0.08);border:1px solid rgba(229,160,25,0.25);border-radius:10px;padding:18px 20px;margin:0 0 22px">
      <div style="font-family:Arial,sans-serif;font-size:13px;color:rgba(245,240,232,0.6);margin-bottom:6px">At the 35% founding rate, ${lead.student_count.toLocaleString("en-US")} students could earn your school</div>
      <div style="font-size:24px;font-weight:bold;color:#E5A019">${fmt} / year</div>
    </div>
    <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:rgba(245,240,232,0.75);margin:0 0 24px">
      <strong style="color:#F5F0E8">What happens next:</strong> we will reach out on WhatsApp
      within 24 hours to confirm your spot and walk you through onboarding. No commitment until
      you have seen everything.
    </p>
    <a href="https://wa.me/256782086950?text=${encodeURIComponent(`Hi, I'm ${firstName} from ${lead.school_name} — just joined the Soma Africa waitlist.`)}"
       style="display:inline-block;background:#E5A019;color:#0D0D0D;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;padding:14px 28px;border-radius:8px;text-decoration:none">
      Chat with us on WhatsApp now →
    </a>
    <p style="font-family:Arial,sans-serif;font-size:12px;color:rgba(245,240,232,0.4);margin:28px 0 0">
      Soma Africa · Built in Uganda · soma-africa.com
    </p>
  </div>
</div>`,
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const lead: Lead = {
      school_name:   String(body.school_name   ?? "").trim(),
      director_name: String(body.director_name ?? "").trim(),
      role:          String(body.role          ?? "").trim(),
      student_count: Number(body.student_count) || 0,
      whatsapp:      String(body.whatsapp      ?? "").trim(),
      email:         body.email ? String(body.email).toLowerCase().trim() : null,
    };

    if (
      !lead.school_name   ||
      !lead.director_name ||
      !lead.role          ||
      lead.student_count < 1 ||
      !lead.whatsapp
    ) {
      return NextResponse.json(
        { error: "All required fields must be filled." },
        { status: 400 }
      );
    }

    const { error } = await getSupabase()
      .from("leads")
      .insert([lead]);

    if (error) {
      // Duplicate WhatsApp — already on the waitlist, treat as success
      if (error.code === "23505") {
        return NextResponse.json({ success: true });
      }

      console.error("Supabase insert error:", JSON.stringify(error));
      return NextResponse.json(
        { error: "Could not save your submission. Please try again." },
        { status: 500 }
      );
    }

    // Welcome email to the lead — requires a Resend-verified domain sender
    if (lead.email && process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
      try {
        await sendWelcomeEmail(lead);
      } catch (err) {
        console.error("Welcome email error:", err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Waitlist API error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
