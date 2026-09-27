import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) console.warn("⚠️ Missing EXPO_PUBLIC_SUPABASE_URL / ANON_KEY — copy .env.example to .env");

export const supabase: SupabaseClient | null =
  url && anon ? createClient(url, anon) : null;
