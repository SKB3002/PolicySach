// Supabase clients. Stub for M4 (email capture + saved reports).
// Default to process-and-discard: we only persist when the user opts in.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _browser: SupabaseClient | null = null;
export function getSupabaseBrowser(): SupabaseClient {
  if (!_browser) {
    _browser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return _browser;
}

let _server: SupabaseClient | null = null;
export function getSupabaseServer(): SupabaseClient {
  if (!_server) {
    _server = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
  }
  return _server;
}
