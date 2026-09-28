import { supabase } from "./supabase";

export function formatDrop(name: string, price: number, old: number, store: string): string {
  const f = (n: number) => n.toFixed(2).replace(".", ",");
  return `🔻 ${name}: ${f(price)}€ στο ${store} (ήταν ${f(old)}€)`;
}

let Notifications: any = null;
try {
  Notifications = require("expo-notifications");
} catch {
  Notifications = null;
}

export async function savePushToken(token: string): Promise<void> {
  if (!supabase) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("push_tokens")
    .upsert({ user_id: user.id, token }, { onConflict: "user_id,token" });
}

export async function ensurePushPermission(): Promise<string | null> {
  if (!Notifications) return null;
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return null;
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  await savePushToken(token);
  return token;
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Notifications) return null;
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return null;
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  await savePushToken(token);
  return token;
}

export async function notifyLocal(title: string, body: string): Promise<void> {
  if (!Notifications) return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
}

export async function notifyPriceDrop(name: string, price: number, old: number, store: string) {
  await notifyLocal("Πτώση τιμής", formatDrop(name, price, old, store));
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
