import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

function supabaseHeaders() {
  return {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };
}

async function supabaseGet(path: string) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, { headers: supabaseHeaders() });
  if (!res.ok) {
    throw new Error(`Supabase GET ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

serve(async (req) => {
  try {
    const body = await req.json();
    const record = body.record ?? body;

    const productId = record.product_id;
    const storeId = record.store_id;
    const price = record.price;

    if (!productId || !storeId || price == null) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing product_id, store_id, or price" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const [products, stores, watchlistRows] = await Promise.all([
      supabaseGet(`products?id=eq.${productId}&select=name_el`),
      supabaseGet(`stores?id=eq.${storeId}&select=chain`),
      supabaseGet(`watchlist?product_id=eq.${productId}&select=user_id&limit=500`),
    ]);

    if (!Array.isArray(products) || products.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: "Product not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    const productName = products[0].name_el;
    const storeChain = Array.isArray(stores) && stores.length > 0 ? stores[0].chain : "άλλο κατάστημα";

    const watchers = Array.isArray(watchlistRows) ? watchlistRows : [];
    if (watchers.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0, watchers: 0 }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const userIds = [...new Set(watchers.map((w: any) => w.user_id))];
    const tokensByUser = new Map<string, string[]>();

    const tokenPromises = userIds.map(async (uid) => {
      try {
        const rows: any[] = await supabaseGet(
          `push_tokens?user_id=eq.${uid}&select=token&order=created_at.desc`,
        );
        if (Array.isArray(rows)) {
          const tokens = rows.map((r: any) => r.token).filter(Boolean);
          if (tokens.length > 0) tokensByUser.set(uid, tokens);
        }
      } catch {
      }
    });

    await Promise.all(tokenPromises);

    const title = `🔻 ${productName}: ${price}€ στο ${storeChain}`;
    let sent = 0;

    const notificationPromises: Promise<void>[] = [];

    for (const w of watchers) {
      const tokens = tokensByUser.get(w.user_id);
      if (!tokens) continue;

      for (const token of tokens) {
        const promise = fetch(EXPO_PUSH_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: token,
            title: title,
            body: title,
            sound: "default",
            data: { product_id: productId, store_id: storeId, price: price },
          }),
        })
          .then(async (res) => {
            if (!res.ok) {
              console.error(`Expo push failed for token ${token}: ${res.status} ${await res.text()}`);
            } else {
              sent++;
            }
          })
          .catch((err) => {
            console.error(`Expo push error for token ${token}: ${err}`);
          });

        notificationPromises.push(promise);
      }
    }

    await Promise.all(notificationPromises);

    return new Response(
      JSON.stringify({ ok: true, sent, watchers: watchers.length }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("check-watchlist error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
