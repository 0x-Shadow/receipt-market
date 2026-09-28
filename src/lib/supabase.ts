import { createClient, type SupabaseClient, type Session, type User } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { polyfillWebCrypto } from "expo-standard-web-crypto";
import { ensureWebCrypto } from "./webcrypto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

polyfillWebCrypto();
ensureWebCrypto();

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) console.warn("⚠️ Missing EXPO_PUBLIC_SUPABASE_URL / ANON_KEY — copy .env.example to .env");

WebBrowser.maybeCompleteAuthSession();

export const supabase: SupabaseClient | null =
  url && anon
    ? createClient(url, anon, {
        auth: {
          flowType: "pkce",
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error("Supabase not configured — add .env");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signUp(email: string, password: string, name?: string): Promise<{ needsEmailConfirmation: boolean }> {
  if (!supabase) throw new Error("Supabase not configured — add .env");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: name ? { data: { name } } : undefined,
  });
  if (error) throw error;
  return { needsEmailConfirmation: data.session === null };
}

export async function signInWithGoogle(): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured — add .env");

  const redirectTo = Linking.createURL("auth/callback");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error("Δεν ήταν δυνατή η έναρξη της σύνδεσης με Google");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === "cancel") return;
  if (result.type !== "success") throw new Error("Η σύνδεση με Google απέτυχε");

  const code = new URL(result.url).searchParams.get("code");
  if (!code) throw new Error("Λείπει ο κωδικός επιβεβαίωσης στο redirect του Google");

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
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
