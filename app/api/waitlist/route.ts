import { NextRequest, NextResponse } from "next/server";
import { getSupabase, WaitlistLead } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const lead: WaitlistLead = {
      school_name: body.school_name?.trim(),
      contact_name: body.contact_name?.trim(),
      role: body.role,
      student_count: Number(body.student_count),
      whatsapp: body.whatsapp?.trim(),
      email: body.email?.trim().toLowerCase(),
    };

    if (
      !lead.school_name ||
      !lead.contact_name ||
      !lead.role ||
      !lead.student_count ||
      !lead.whatsapp ||
      !lead.email
    ) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(lead.email)) {
      return NextResponse.json(
        { error: "Invalid email address." },
        { status: 400 }
      );
    }

    const { error } = await getSupabase().from("waitlist_leads").insert([lead]);

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Could not save your submission. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Waitlist API error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
