import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Row = {
  description: string;
  nameNormalized: string;
  itemCode: string | null;
  price: number;
  qty: number;
  unit: string | null;
  vatRate: number | null;
  chain: string;
};

type Body = {
  receiptHash: string;
  mydataMark: string | null;
  issuerVat: string;
  issuerName: string;
  issueDate: string;
  rows: Row[];
  productOverrides?: Record<string, string>;
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "POST required" });

  const auth = req.headers.get("Authorization");
  if (!auth) return json(401, { error: "missing authorization" });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const caller = createClient(url, serviceKey, {
    global: { headers: { Authorization: auth } },
  });
  const admin = createClient(url, serviceKey);

  const { data: userData, error: userErr } = await caller.auth.getUser();
  if (userErr || !userData.user) return json(401, { error: "invalid session" });
  const userId = userData.user.id;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json(400, { error: "invalid json" });
  }

  if (!body.receiptHash || !Array.isArray(body.rows) || body.rows.length === 0) {
    return json(400, { error: "receiptHash and rows are required" });
  }
  if (body.rows.length > 500) {
    return json(400, { error: "too many rows" });
  }

  const { data: dupe } = await admin
    .from("receipts")
    .select("id")
    .eq("receipt_hash", body.receiptHash)
    .maybeSingle();
  if (dupe) {
    return json(200, { receiptId: dupe.id, duplicate: true, created: 0 });
  }

  let storeId: string | null = null;
  const { data: existingStore } = await admin
    .from("stores")
    .select("id")
    .eq("name", body.issuerName)
    .maybeSingle();

  if (existingStore) {
    storeId = existingStore.id;
  } else {
    const { data: newStore } = await admin
      .from("stores")
      .insert({ chain: body.issuerName, name: body.issuerName })
      .select("id")
      .single();
    storeId = newStore?.id ?? null;
  }
  if (!storeId) return json(500, { error: "could not resolve store" });

  const { data: receipt } = await admin
    .from("receipts")
    .insert({
      user_id: userId,
      store_id: storeId,
      receipt_hash: body.receiptHash,
      mydata_mark: body.mydataMark,
      item_count: body.rows.length,
      bought_at: body.issueDate || null,
    })
    .select("id")
    .single();

  if (!receipt) return json(500, { error: "could not create receipt" });

  let created = 0;

  for (const row of body.rows) {
    let productId: string | null = null;
    let verified = false;

    const override = body.productOverrides?.[row.nameNormalized];
    const lookupName = (override ?? row.nameNormalized).trim();
    if (!lookupName) continue;

    if (row.itemCode) {
      const { data: code } = await admin
        .from("product_codes")
        .select("product_id")
        .eq("chain", row.chain)
        .eq("code", row.itemCode)
        .eq("code_type", "retailer")
        .maybeSingle();
      if (code) {
        productId = code.product_id;
        const { data: p } = await admin
          .from("products")
          .select("verified")
          .eq("id", productId)
          .single();
        verified = p?.verified ?? false;
      }
    }

    if (!productId) {
      const { data: byName } = await admin
        .from("products")
        .select("id, verified")
        .eq("name_normalized", lookupName)
        .is("merged_into", null)
        .maybeSingle();
      if (byName) {
        productId = byName.id;
        verified = byName.verified;
      }
    }

    if (!productId) {
      const { data: made } = await admin
        .from("products")
        .insert({
          name_el: row.description,
          name_normalized: lookupName,
          verified: false,
        })
        .select("id")
        .single();
      productId = made?.id ?? null;
      verified = false;
      if (productId && row.itemCode) {
        await admin.from("product_codes").insert({
          product_id: productId,
          code: row.itemCode,
          code_type: "retailer",
          chain: row.chain,
        });
      }
    }

    await admin.from("receipt_items").insert({
      receipt_id: receipt.id,
      user_id: userId,
      product_id: productId,
      description_raw: row.description,
      qty: row.qty,
      unit_price: row.price,
      line_total: row.price * row.qty,
      vat_rate: row.vatRate,
    });

    if (productId) {
      await admin.from("price_points").insert({
        product_id: productId,
        store_id: storeId,
        price: row.price,
        vat_rate: row.vatRate,
        unit: row.unit,
        source_receipt_id: receipt.id,
      });
      created++;
    }
  }

  return json(200, { receiptId: receipt.id, duplicate: false, created, verified });
});
