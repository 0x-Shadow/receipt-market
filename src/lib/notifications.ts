// src/lib/notifications.ts
import * as Notifications from "expo-notifications";
import { supabase } from "./supabase";

export function formatDrop(name: string, price: number, old: number, store: string): string {
  const f = (n: number) => n.toFixed(2).replace(".", ",");
  return `🔻 ${name}: ${f(price)}€ στο ${store} (ήταν ${f(old)}€)`;
}

export async function ensurePushPermission(): Promise<string | null> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return null;
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  return token;
}

export async function toggleWatch(productId: string, targetPrice?: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Login required");
  await ensurePushPermission(); // ask only on first watch
  return supabase.from("watchlist").upsert({ user_id: user.id, product_id: productId, target_price: targetPrice }, { onConflict: "user_id,product_id" });
}
