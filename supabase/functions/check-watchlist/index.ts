import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
serve(async (req) => {
  const { record } = await req.json();
  const msg = `🔻 Νέα τιμή: ${record?.price}€ (product ${record?.product_id})`;
  // TODO v1.1: lookup watchers + call https://exp.host/--/api/v2/push/send
  return new Response(JSON.stringify({ ok: true, price_id: record?.id, msg }), { headers: { "Content-Type": "application/json" } });
});
