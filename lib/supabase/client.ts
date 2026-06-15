import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  // Surfaced clearly in the browser console if env vars are missing.
  // The app shows a setup notice rather than crashing.
  // eslint-disable-next-line no-console
  console.warn("Orbit: Supabase env vars are not set. See .env.example.");
}

export const supabase = createClient(url ?? "https://placeholder.supabase.co", anon ?? "placeholder-anon-key");
export const supabaseConfigured = Boolean(url && anon);
