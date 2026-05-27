import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Supabase env vars not configured.");
    _client = createClient(url, key);
  }
  return _client;
}

export type WaitlistLead = {
  school_name: string;
  contact_name: string;
  role: string;
  student_count: number;
  whatsapp: string;
  email: string;
};
