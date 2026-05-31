import { NextRequest, NextResponse } from "next/server";
import { getSupabase, WaitlistLead } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const lead: WaitlistLead = {
      contact_name:  String(body.contact_name  ?? "").trim(),
      school_name:   String(body.school_name   ?? "").trim(),
      role:          String(body.role          ?? "").trim(),
      student_count: String(body.student_count ?? "").trim(),
      whatsapp:      String(body.whatsapp      ?? "").trim(),
      email:         String(body.email         ?? "").toLowerCase().trim(),
    };

    if (
      !lead.contact_name ||
      !lead.school_name  ||
      !lead.role         ||
      !lead.student_count||
      !lead.whatsapp     ||
      !lead.email
    ) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
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
