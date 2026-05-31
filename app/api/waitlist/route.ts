import { NextRequest, NextResponse } from "next/server";
import { getSupabase, Lead } from "@/lib/supabase";

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

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Waitlist API error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
