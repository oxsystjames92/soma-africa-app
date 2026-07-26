import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!password || !serviceKey || !url) {
    return NextResponse.json(
      { error: "Dashboard is not configured yet." },
      { status: 503 }
    );
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (body.password !== password) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await admin
    .from("leads")
    .select("created_at, school_name, director_name, role, student_count, whatsapp, email")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Leads fetch error:", JSON.stringify(error));
    return NextResponse.json({ error: "Could not load leads." }, { status: 500 });
  }

  return NextResponse.json({ leads: data });
}
