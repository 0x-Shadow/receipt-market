import { createClient, type SupabaseClient, type Session, type User } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) console.warn("⚠️ Missing EXPO_PUBLIC_SUPABASE_URL / ANON_KEY — copy .env.example to .env");

export const supabase: SupabaseClient | null =
  url && anon ? createClient(url, anon) : null;

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error("Supabase not configured — add .env");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signUp(email: string, password: string) {
  if (!supabase) throw new Error("Supabase not configured — add .env");
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setUser(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    if (!supabase) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  return { user, loading, refresh };
}
