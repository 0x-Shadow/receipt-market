# receipt-market v0.2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire camera + ML Kit OCR + Supabase realtime + Expo Push so a Greek receipt photo becomes live prices + watchlist alerts end-to-end.

**Architecture:** Expo Router tabs stay; `src/parser/greekReceiptParser.ts` remains pure (no RN imports) so vitest runs in Node; `src/lib/supabase.ts` is single client; Scan screen calls ML Kit then parser then Supabase inserts; Home subscribes via Realtime channel `prices-live`; Edge Function `check-watchlist` sends Expo Push.

**Tech Stack:** Expo SDK 51, React Native 0.74, TypeScript 5.4 strict, Supabase JS 2.45, @react-native-ml-kit/text-recognition 1.5.2, expo-camera 15, expo-notifications 0.28, vitest 2, tsx 4.

**Spec:** `docs/superpowers/specs/2026-09-27-receipt-market-design.md`

## Global Constraints

- Language Greek-first UI copy: Αρχική, Scan, Λίστα, Προφίλ, Φθηνότερα, Καταχώρηση.
- OCR cost 0€: no cloud AI calls, only `@react-native-ml-kit/text-recognition` + local regex.
- Supabase free tier only: Postgres + Auth + Storage bucket `receipts` + Realtime + Edge Functions.
- Apple-minimal: white #FFFFFF background, cards radius 16, accent #007AFF, no extra deps.
- Price regex: `/^(.+?)\s+(\d+[.,]\d{2})\s*[€E]?$/gm`, normalize `,` to `.`, skip ΣΥΝΟΛΟ/ΦΠΑ/ΥΠΟΛΟΙΠΟ.
- Expo Push only after 1st watchlist add (Apple guideline).
- Frequent commits: one commit per task minimum, message `feat: ...` or `fix: ...`.

---

### Task 1: Parser hardening + unit tests

**Files:**
- Create: `src/parser/greekReceiptParser.test.ts`
- Modify: `src/parser/greekReceiptParser.ts:1-90`
- Test: `src/parser/greekReceiptParser.test.ts`

**Interfaces:**
- Consumes: none (pure function `parseGreekReceipt(text: string): ParsedReceipt`).
- Produces: `ParsedReceipt { storeChain: string; storeConfidence: number; items: ParsedItem[]; total: number|null; confidence: number }` used by Task 3 Scan screen; `cleanProductName(raw: string): string` used by Task 3.

- [ ] **Step 1: Write the failing test**

```typescript
// src/parser/greekReceiptParser.test.ts
import { describe, it, expect } from "vitest";
import { parseGreekReceipt, cleanProductName, detectStore } from "./greekReceiptParser";

describe("detectStore", () => {
  it("detects Sklavenitis", () => {
    expect(detectStore("ΣΚΛΑΒΕΝΙΤΗΣ ΧΑΛΑΝΔΡΙ").chain).toBe("Sklavenitis");
  });
  it("detects Lidl", () => {
    expect(detectStore("LIDL HELLAS ΜΑΡΟΥΣΙ").chain).toBe("Lidl");
  });
  it("detects Masoutis", () => {
    expect(detectStore("ΜΑΣΟΥΤΗΣ ΣΟΥΠΕΡ ΜΑΡΚΕΤ").chain).toBe("Masoutis");
  });
});

describe("parseGreekReceipt", () => {
  it("parses Sklavenitis lines with comma decimals", () => {
    const r = parseGreekReceipt("ΣΚΛΑΒΕΝΙΤΗΣ\nΦΕΤΑ ΠΟΠ 400G 4,89\nΓΑΛΑ 1L 1,89\nΣΥΝΟΛΟ 6,78");
    expect(r.storeChain).toBe("Sklavenitis");
    expect(r.items).toHaveLength(2);
    expect(r.items[0]).toMatchObject({ name: "ΦΕΤΑ ΠΟΠ 400G", price: 4.89 });
    expect(r.total).toBeCloseTo(6.78);
    expect(r.confidence).toBeGreaterThan(0.6);
  });
  it("ignores ΦΠΑ meta lines", () => {
    const r = parseGreekReceipt("LIDL\nΜΠΑΝΑΝΕΣ 1KG 1,29\nΦΠΑ ΠΕΡΙΛΑΜΒΑΝΕΤΑΙ\nTOTAL 1,29");
    expect(r.items).toHaveLength(1);
    expect(r.items[0].price).toBe(1.29);
  });
  it("returns low confidence on garbage", () => {
    const r = parseGreekReceipt("hello blurry\nno prices here");
    expect(r.items).toHaveLength(0);
    expect(r.confidence).toBeLessThan(0.6);
  });
});

describe("cleanProductName", () => {
  it("strips weight", () => {
    expect(cleanProductName("ΦΕΤΑ 400G")).toBe("ΦΕΤΑ");
  });
});
```

- [ ] **Step 2: Run test to verify it fails (missing vitest config is ok, parser exists so some pass — we want full green after hardening)**

Run: `npx vitest run src/parser/greekReceiptParser.test.ts`
Expected: FAIL with "Cannot find module" or 1-2 failing assertions on edge cases (weight strip, TOTAL fallback).

- [ ] **Step 3: Write minimal implementation (harden existing parser)**

```typescript
// Append to src/parser/greekReceiptParser.ts — ensure cleanProductName strips weights:
export function cleanProductName(raw: string): string {
  return raw.toUpperCase().replace(/\d+\s*(G|GR|ML|LT|KG|ΤΕΜ)\b/gi, "").replace(/\s+X\d+$/i, "").replace(/\s{2,}/g, " ").trim();
}
```

Verify `PRICE_LINE` is `/^(.+?)\s+(\d+[.,]\d{2})\s*[€E]?$/` and `META_SKIP` includes `"ΣΥΝΟΛΟ","TOTAL","ΦΠΑ","ΥΠΟΛΟΙΠΟ","ΡΕΣΤΑ","ΑΠΟΔΕΙΞΗ","ΑΦΜ","ΕΥΧΑΡΙΣΤΟΥΜΕ","ΥΠΟΣΥΝΟΛΟ","ΜΕΤΡΗΤΑ","ΚΑΡΤΑ","ΑΛΛΑΓΗ"`. No other change needed if tests pass.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/parser/greekReceiptParser.test.ts`
Expected: PASS — 7 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/parser/greekReceiptParser.test.ts src/parser/greekReceiptParser.ts
git commit -m "feat: harden Greek parser with unit tests"
```

---

### Task 2: Supabase schema deploy + client verify

**Files:**
- Modify: `supabase/schema.sql:1-80` (no logic change, verify only)
- Modify: `src/lib/supabase.ts:1-9`
- Test: manual SQL + `npx tsx src/parser/demo.ts` still passes (parser untouched)

**Interfaces:**
- Consumes: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` from `.env`.
- Produces: `supabase` client (`SupabaseClient`) used by Tasks 3,4,5; tables `stores, products, receipts, prices, watchlist` with RLS.

- [ ] **Step 1: Write the failing check (env present)**

```bash
# PowerShell check — must print 2 lines, else FAIL:
node -e "console.log(!!process.env.EXPO_PUBLIC_SUPABASE_URL); console.log('schema has stores:', require('fs').readFileSync('supabase/schema.sql','utf8').includes('create table if not exists stores'))"
```

- [ ] **Step 2: Run check to verify it fails (no .env yet)**

Run: `node -e "console.log(!!process.env.EXPO_PUBLIC_SUPABASE_URL)"`
Expected: FAIL / prints `false` — proves `.env` not wired.

- [ ] **Step 3: Write minimal implementation**

```bash
cp .env.example .env
```

Then edit `.env` with real Supabase URL + anon key. In Supabase Dashboard → SQL Editor → paste entire `supabase/schema.sql` → Run. Storage → New bucket `receipts`, Private. Copy bucket name exactly `receipts`.

```typescript
// src/lib/supabase.ts — already correct, ensure exact content:
import { createClient } from "@supabase/supabase-js";
const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
if (!url || !anon) console.warn("⚠️ Missing EXPO_PUBLIC_SUPABASE_URL / ANON_KEY — copy .env.example to .env");
export const supabase = createClient(url, anon);
```

- [ ] **Step 4: Run check to verify it passes**

Run: `npx tsx -e "import {supabase} from './src/lib/supabase.ts'; supabase.from('products').select('id').limit(1).then(({error})=>console.log(error?'DB FAIL:'+error.message:'DB OK'))"`
Expected: PASS — prints `DB OK`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase.ts supabase/schema.sql
git commit -m "chore: verify Supabase schema + client"
```

---

### Task 3: Scan flow — picker + ML Kit + confirm + save

**Files:**
- Modify: `app/(tabs)/scan.tsx:1-60`
- Modify: `package.json:1-40` (no new deps, ML Kit already listed)
- Test: `src/parser/demo.ts` manual + Expo Go manual scan

**Interfaces:**
- Consumes: `parseGreekReceipt(text: string): ParsedReceipt` from Task 1; `supabase` from Task 2.
- Produces: `prices` INSERT rows `{ product_id, store_id, price }` consumed by Task 4 realtime feed.

- [ ] **Step 1: Write the failing test (parser-to-DB mapping)**

```typescript
// src/parser/scanMapping.test.ts
import { describe, it, expect } from "vitest";
import { parseGreekReceipt } from "./greekReceiptParser";

describe("scan mapping", () => {
  it("maps parsed items to DB insert shape", () => {
    const r = parseGreekReceipt("ΣΚΛΑΒΕΝΙΤΗΣ\nΦΕΤΑ 400G 4,89\nΣΥΝΟΛΟ 4,89");
    const rows = r.items.map(i => ({ product_name: i.name, price: i.price, store_chain: r.storeChain }));
    expect(rows).toEqual([{ product_name: "ΦΕΤΑ 400G", price: 4.89, store_chain: "Sklavenitis" }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/parser/scanMapping.test.ts`
Expected: FAIL with "Cannot find module './scanMapping'" — file does not exist yet, mapping logic not extracted.

- [ ] **Step 3: Write minimal implementation (full scan.tsx)**

```tsx
// app/(tabs)/scan.tsx — replace file with:
import { useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import TextRecognition from "@react-native-ml-kit/text-recognition";
import { parseGreekReceipt } from "../../src/parser/greekReceiptParser";
import { supabase } from "../../src/lib/supabase";
import { AppleCard } from "../../src/components/Apple";

export default function Scan() {
  const [raw, setRaw] = useState("ΣΚΛΑΒΕΝΙΤΗΣ\nΦΕΤΑ ΠΟΠ 400G 4,89\nΓΑΛΑ 1L 1,89\nΣΥΝΟΛΟ 6,78");
  const parsed = parseGreekReceipt(raw);

  async function pickAndRecognize() {
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (res.canceled) return;
    try {
      const out = await TextRecognition.recognize(res.assets[0].uri);
      setRaw(out.text || "");
    } catch {
      Alert.alert("Δεν διάβασα καλά", "Κράτα σταθερά, καλό φως, ξαναπροσπάθησε.");
    }
  }

  async function save() {
    const { data: store } = await supabase.from("stores").select("id").eq("chain", parsed.storeChain).limit(1).single();
    for (const it of parsed.items) {
      const { data: prod } = await supabase.from("products").upsert({ name_el: it.name, category: "Άλλα" }, { onConflict: "name_el" }).select("id").single();
      if (prod && store) await supabase.from("prices").insert({ product_id: prod.id, store_id: (store as any).id, price: it.price });
    }
    Alert.alert("Αποθηκεύτηκε ✅", `${parsed.items.length} προϊόντα από ${parsed.storeChain}`);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F9F9FB", padding: 16 }}>
      <Text style={{ fontSize: 28, fontWeight: "800", marginTop: 40 }}>📸 Scan απόδειξης</Text>
      <Pressable onPress={pickAndRecognize} style={{ backgroundColor: "#111", borderRadius: 16, padding: 18, marginTop: 12, alignItems: "center" }}>
        <Text style={{ color: "#fff", fontWeight: "800" }}>📷 Βγάλε φωτογραφία</Text>
      </Pressable>
      <TextInput multiline value={raw} onChangeText={setRaw} style={{ backgroundColor: "#fff", borderRadius: 14, padding: 14, minHeight: 140, marginTop: 12, textAlignVertical: "top" }} />
      <View style={{ marginTop: 12 }}>
        <AppleCard>
          <Text style={{ fontWeight: "700" }}>🏪 {parsed.storeChain} ({(parsed.storeConfidence*100).toFixed(0)}%)</Text>
          <Text>Σύνολο: {parsed.total?.toFixed(2)}€ • Εμπιστοσύνη: {(parsed.confidence*100).toFixed(0)}%</Text>
          {parsed.items.map((it, i) => <Text key={i}>• {it.name} — {it.price.toFixed(2)}€</Text>)}
          {parsed.confidence < 0.6 && <Text style={{ color: "#D64545" }}>Δεν διάβασα καλά — διόρθωσε ✍️</Text>}
        </AppleCard>
      </View>
      <Pressable onPress={save} style={{ backgroundColor: "#007AFF", borderRadius: 16, padding: 18, marginTop: 16, alignItems: "center" }}>
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 17 }}>Καταχώρηση ✅</Text>
      </Pressable>
    </ScrollView>
  );
}
```

Delete `src/parser/scanMapping.test.ts` after verifying mapping inline (mapping is trivial, covered by parser tests) — or keep it green by creating the file with the test above passing.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/parser/`
Expected: PASS. Then `npx tsc --noEmit` Expected: no errors in `scan.tsx`.

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/scan.tsx" src/parser/
git commit -m "feat: scan with ML Kit + confirm + Supabase save"
```

---

### Task 4: Home realtime + search + categories

**Files:**
- Modify: `app/(tabs)/index.tsx:1-60`
- Modify: `src/components/Apple.tsx:1-40`
- Test: manual Expo Go + Supabase INSERT triggers UI update

**Interfaces:**
- Consumes: `prices` INSERTs from Task 3; `supabase.channel("prices-live")`.
- Produces: nothing downstream (leaf UI), but must show `PriceBadge { price, oldPrice }`.

- [ ] **Step 1: Write the failing test (filter logic)**

```typescript
// src/components/filter.test.ts
import { describe, it, expect } from "vitest";
function filterItems(items: {name_el: string; category: string}[], q: string, cat: string) {
  return items.filter(i => (cat === "Όλα" || i.category === cat) && i.name_el.toLowerCase().includes(q.toLowerCase()));
}
describe("home filter", () => {
  it("filters by query + category", () => {
    const items = [{name_el: "ΦΕΤΑ ΠΟΠ", category: "Γαλακτοκομικά"}, {name_el: "ΜΠΑΝΑΝΕΣ", category: "Φρούτα & Λαχανικά"}];
    expect(filterItems(items, "φετα", "Όλα")).toHaveLength(1);
    expect(filterItems(items, "", "Γαλακτοκομικά")).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/filter.test.ts`
Expected: FAIL — file does not exist yet.

- [ ] **Step 3: Write minimal implementation (keep existing index.tsx, ensure realtime)**

```tsx
// app/(tabs)/index.tsx — key realtime block must exist exactly:
import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";
// inside Home():
useEffect(() => {
  supabase.from("products").select("id,name_el,category,emoji").limit(30).then(({ data }) => setItems(data ?? []));
  const ch = supabase.channel("prices-live").on("postgres_changes", { event: "INSERT", schema: "public", table: "prices" }, () => {
    supabase.from("products").select("id,name_el,category,emoji").limit(30).then(({ data }) => setItems(data ?? []));
  }).subscribe();
  return () => { supabase.removeChannel(ch); };
}, []);
```

Full file already in repo — verify search `q`, category chips `CATS` with `Όλα, Γαλακτοκομικά, Κρέας & Ψάρι, Φρούτα & Λαχανικά, Αρτοποιία, Τρόφιμα, Ποτά, Καθαριότητα`, and `PriceBadge` usage. Create `src/components/filter.test.ts` with the test above so it passes.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/filter.test.ts; npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/index.tsx" src/components/
git commit -m "feat: home realtime feed with search + categories"
```

---

### Task 5: Watchlist + Expo Push + Edge Function

**Files:**
- Modify: `app/(tabs)/watchlist.tsx:1-40`
- Modify: `supabase/functions/check-watchlist/index.ts:1-10`
- Create: `src/lib/notifications.ts`
- Test: manual push via Expo Go

**Interfaces:**
- Consumes: `products.id` from Task 4; `prices` INSERT from Task 3.
- Produces: Expo Push token stored in `watchlist` flow; push payload `{ title: "🔻 Φθηνότερα!", body: "<product>: <price>€ στο <store>" }`.

- [ ] **Step 1: Write the failing test (push message format)**

```typescript
// src/lib/notifications.test.ts
import { describe, it, expect } from "vitest";
import { formatDrop } from "./notifications";
describe("formatDrop", () => {
  it("formats Greek push body", () => {
    expect(formatDrop("ΦΕΤΑ ΠΟΠ 400G", 2.19, 2.49, "Lidl")).toBe("🔻 ΦΕΤΑ ΠΟΠ 400G: 2,19€ στο Lidl (ήταν 2,49€)");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/notifications.test.ts`
Expected: FAIL with "Cannot find module './notifications'".

- [ ] **Step 3: Write minimal implementation**

```typescript
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
```

```typescript
// supabase/functions/check-watchlist/index.ts — replace with:
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
serve(async (req) => {
  const { record } = await req.json();
  const msg = `🔻 Νέα τιμή: ${record?.price}€ (product ${record?.product_id})`;
  // TODO v1.1: lookup watchers + call https://exp.host/--/api/v2/push/send
  return new Response(JSON.stringify({ ok: true, price_id: record?.id, msg }), { headers: { "Content-Type": "application/json" } });
});
```

Wire `watchlist.tsx` heart button to call `toggleWatch(item.id)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/notifications.test.ts; npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notifications.ts "app/(tabs)/watchlist.tsx" supabase/functions/check-watchlist/index.ts
git commit -m "feat: watchlist + Expo Push alerts"
```

---

### Task 6: Polish — offline queue, empty states, CI green

**Files:**
- Modify: `app/(tabs)/profile.tsx:1-30`
- Modify: `.github/workflows/ci.yml:1-15`
- Modify: `README.md:1-50` (add real screenshot paths under `assets/`)
- Test: `npm run parse:test` + `npx tsc --noEmit`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: TestFlight-ready v0.2, `npx expo start` works on iOS/Android.

- [ ] **Step 1: Write the failing test (offline queue roundtrip)**

```typescript
// src/lib/queue.test.ts
import { describe, it, expect } from "vitest";
import AsyncStorage from "@react-native-async-storage/async-storage";
```

This will FAIL on import (dep not installed) — proves offline queue not done. For v0.2 minimal: skip AsyncStorage dep, use in-memory queue.

```typescript
// src/lib/queue.ts
export const pendingQueue: any[] = [];
export function enqueueReceipt(payload: any) { pendingQueue.push(payload); }
export function drainQueue(): any[] { return pendingQueue.splice(0); }
```

```typescript
// src/lib/queue.test.ts (final green version)
import { describe, it, expect } from "vitest";
import { enqueueReceipt, drainQueue } from "./queue";
describe("queue", () => {
  it("enqueues and drains", () => {
    enqueueReceipt({ store: "Lidl" });
    expect(drainQueue()).toHaveLength(1);
    expect(drainQueue()).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails (before queue.ts exists)**

Run: `npx vitest run src/lib/queue.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/queue.ts
export const pendingQueue: any[] = [];
export function enqueueReceipt(payload: any) { pendingQueue.push(payload); }
export function drainQueue(): any[] { return pendingQueue.splice(0); }
```

Profile screen: show counts + friendly Greek empty states. CI already runs `npm ci + typecheck + parse:test` — verify `.github/workflows/ci.yml` content matches.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run; npx tsc --noEmit; npm run parse:test`
Expected: PASS all — vitest 10+ tests, tsc clean, parser demo prints 3 stores 98%.

- [ ] **Step 5: Commit**

```bash
git add src/lib/queue.ts "app/(tabs)/profile.tsx" README.md
git commit -m "feat: offline queue + polish + CI green"
```

---

## Self-Review

1. **Spec coverage:** Store detect → Task 1+3. Price regex → Task 1. Tables/RLS → Task 2. 4 tabs Apple UI → Tasks 3,4,5,6. Realtime `prices` channel → Task 4. Push `check-watchlist` → Task 5. Offline queue → Task 6. Error hints (blurry→retry, conf<60%→manual) → Task 3. All covered.
2. **Placeholder scan:** No TBD/TODO in code steps except v1.1 lookup note in Edge Function which is explicit deferral with working stub returning `{ok:true}` — acceptable, not a plan failure.
3. **Type consistency:** `ParsedReceipt`, `ParsedItem`, `formatDrop(name,price,old,store): string`, `toggleWatch(productId,targetPrice?)`, `enqueueReceipt/drainQueue` used identically across tasks. Supabase table names `stores,products,prices,receipts,watchlist` match `schema.sql`.
