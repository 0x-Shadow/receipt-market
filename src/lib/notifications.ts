import { supabase } from "./supabase";

export function formatDrop(name: string, price: number, old: number, store: string): string {
  const f = (n: number) => n.toFixed(2).replace(".", ",");
  return `🔻 ${name}: ${f(price)}€ στο ${store} (ήταν ${f(old)}€)`;
}

// expo-notifications remote push was removed from Expo Go in SDK 53+.
// Load it defensively so the app still runs in Expo Go; push works in dev builds.
let Notifications: any = null;
try {
  Notifications = require("expo-notifications");
} catch {
  Notifications = null;
}

export async function ensurePushPermission(): Promise<string | null> {
  if (!Notifications) return null;
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return null;
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  return token;
}

export async function toggleWatch(productId: string, targetPrice?: number) {
  if (!supabase) throw new Error("Supabase not configured — add .env");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Login required");
  await ensurePushPermission();
  return supabase
    .from("watchlist")
    .upsert(
      { user_id: user.id, product_id: productId, target_price: targetPrice },
      { onConflict: "user_id,product_id" }
    );
}
