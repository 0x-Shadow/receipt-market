// Supabase Edge Function: check-watchlist
// Trigger: on prices INSERT → find watchers → send Expo Push.
// Deploy: supabase functions deploy check-watchlist
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { record } = await req.json(); // new price row
  // 1. find min price per product, 2. find watchlist where target_price >= record.price
  // 3. send via Expo Push API https://exp.host/--/api/v2/push/send
  return new Response(JSON.stringify({ ok: true, price_id: record?.id }), { headers: { "Content-Type": "application/json" } });
});
