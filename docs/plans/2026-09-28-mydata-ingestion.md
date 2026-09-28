# myDATA Ingestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use galyarder-framework:subagent-driven-development (recommended) or galyarder-framework:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A user scans a Greek receipt's myDATA QR, sees the real line items, corrects any bad product match, and saves it — which writes an exact, anonymous price point that a product page can then display as "cheapest store right now".

**Architecture:** The document is fetched and parsed **on the device**; only normalized rows cross the wire, so the fiscal document never reaches our infrastructure. A Supabase Edge Function is the trust boundary that validates rows, dedups by receipt hash, resolves or creates canonical products, and writes. Public prices are readable only through a view that omits every user identifier, which makes the privacy rule a schema property rather than a convention.

**Tech Stack:** Expo SDK 57 / React Native (Hermes), expo-camera, expo-crypto, `@react-native-ml-kit/text-recognition` (OCR fallback only), Supabase (Postgres + RLS + Edge Functions, Deno), TypeScript, Vitest, `fast-xml-parser` (new, pure JS, RN-safe).

**Spec:** `docs/specs/2026-09-28-mydata-price-intelligence-design.md`

**Scope note:** This plan is the ingestion vertical slice only. The incentive surfaces (private receipt history, product search/add, alerts, merge-review admin) are a second plan, deliberately, so this one ends with working, testable software.

---

## Critical context for the implementer

**Real myDATA field names** (verified against the official ΑΑΔΕ API documentation). Do not substitute guessed names:

- Line array is **`invoiceDetails`**, NOT `invoiceLines`.
- Line price is **`netValue`** (net, before VAT). There is no `lineNetAmount`.
- VAT is **`vatCategory`**, an integer category 1–8, NOT a rate. Map:
  `1→13, 2→9, 3→5, 4→0, 5→4, 6→0, 7→0, 8→0`. `vatAmount` is the computed tax and is used only to cross-check.
- Description is **`lineComments`** (primary; Greek retail ERPs put the product name there). `itemDescr` is the fallback and is usually only present on tax-free documents.
- Product code is **`itemCode`**, max 10 characters. **It is not an EAN barcode.**
- **`TaricNo`** is an HS commodity code, not a consumer barcode.
- **`lineBarcode` does not exist.** Do not write code that reads it.
- Document root: `InvoicesDoc` → `invoice[]` → `issuer` (`vatNumber`, `name`, `branch`), `counterpart`, `invoiceHeader` (`issueDate`, `series`, `aa`, `invoiceType`, `currency`), `invoiceDetails[]`, `mark`, `uid`.
- **`counterpart.vatNumber` is the literal `999999999` on B2C retail receipts.** Retail receipts carry no consumer identifier. Discard it regardless.

**VAT self-check invariant** (proves the line is well-formed): `vatAmount` must equal `round(netValue * rate, 2)` for categories 1, 2, 3, 5. Categories 4, 6, 7, 8 are zero-rated, so `vatAmount` must be 0. A line failing this is dropped, not guessed.

---

## File structure

| File | Responsibility |
|---|---|
| `src/mydata/vat.ts` | `vatCategory` → rate lookup, and the `vatAmount` consistency check. Pure. |
| `src/mydata/normalize.ts` | Greek description normalization + unit canonicalization. Pure. |
| `src/mydata/types.ts` | `MyDataLine`, `MyDataReceipt`, `NormalizedRow` types. |
| `src/mydata/parseDocument.ts` | XML string → `MyDataReceipt`. Tolerates the line array being `invoiceDetails` or `invoiceLines`. |
| `src/mydata/normalizeReceipt.ts` | `MyDataReceipt` → `NormalizedRow[]` (what gets sent). Pure. |
| `src/mydata/receiptHash.ts` | Deterministic dedup hash. Pure. |
| `src/mydata/fixtures/*.xml` | Captured documents. One synthetic to start; real ones land in Task 0. |
| `supabase/migrations/0002_mydata.sql` | Schema: new columns, tables, view, RLS. |
| `supabase/functions/ingest-receipt/index.ts` | Trust boundary: validate, dedup, resolve products, write. |
| `app/(tabs)/scan.tsx` | Adds QR mode that fetches, parses, lets the user correct, then calls the function. |
| `app/product/[id].tsx` | Public price page: latest price per store, cheapest highlighted, last-updated. |

**Boundary rule:** everything under `src/mydata/` except `parseDocument.ts`'s caller is pure and unit-tested. The parser is the only module that touches the network, and it returns a string — so it is trivially fixture-tested.

---

### Task 0: Feasibility spike — is the URL publicly fetchable?

This is first because if it fails, Tasks 2–7 collapse to a server-side fetch and the privacy claim changes. Do not skip it.

**Files:**
- Create: `docs/spike/2026-09-28-mydata-url-feasibility.md`

- [ ] **Step 1: Obtain one real receipt URL**

Ask the user for a photo of a real Greek receipt showing the QR code, or the URL text. A pharmacy or hardware receipt is more valuable than a supermarket one because it proves the non-supermarket claim.

- [ ] **Step 2: Fetch it with no headers at all**

```bash
curl -sS -o /tmp/mydata.xml -w "http=%{http_code} type=%{content_type} size=%{size_download}\n" "PASTE_URL_HERE"
```

Expected: `http=200` and an XML `content_type`.

- [ ] **Step 3: Fetch the detailed variant**

The detailed format is the same URL with `/myDATA` appended (per the ΑΑΔΕ spec, `downloadingInvoiceUrl` + `/myDATA` returns `InvoicesDoc_detailed`).

```bash
curl -sS -o /tmp/mydata_detail.xml "PASTE_URL_HERE/mydata"
```

- [ ] **Step 4: Verify the required fields are present**

```bash
grep -o -E "<(invoiceDetails|invoiceLines)>|<netValue>[0-9.]+|<itemCode>[^<]*|<lineComments>[^<]*|<vatCategory>[0-9]" /tmp/mydata_detail.xml | head -40
```

Expected: line elements plus at least one `netValue`, one `itemCode`, and one `vatCategory`. If `lineComments` is absent, the provider is not populating product names — record that, it is a product blocker.

- [ ] **Step 5: Record the verdict**

Write to `docs/spike/2026-09-28-mydata-url-feasibility.md`:

```markdown
# myDATA downloadingInvoiceUrl feasibility

Date: 2026-09-28
Provider: <name from the receipt>
Plain fetch: <200/403/redirect>
/myDATA variant: <200/403/redirect>
Line array element: <invoiceDetails|invoiceLines>
Has lineComments: <yes|no>
Has itemCode: <yes|no>
Has TaricNo: <yes|no>
counterpart.vatNumber: <value>

## Verdict
<PUBLIC — proceed with on-device fetch | RESTRICTED — fall back to server-side fetch, revise D5 | NO-DATA — document unusable, pivot>
```

- [ ] **Step 6: Commit the spike**

```bash
git add docs/spike/
git commit -m "Spike: verify myDATA downloadingInvoiceUrl is publicly fetchable"
```

**Gate:** if the verdict is `RESTRICTED`, stop and revise the spec's D5 before continuing. If `NO-DATA`, stop entirely — the product has no input.

---

### Task 1: VAT mapping and the consistency check

**Files:**
- Create: `src/mydata/vat.ts`
- Test: `src/mydata/vat.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/mydata/vat.test.ts
import { describe, it, expect } from "vitest";
import { vatRateFor, isVatConsistent } from "./vat";

describe("vatRateFor", () => {
  it("maps standard Greek VAT categories to rates", () => {
    expect(vatRateFor(1)).toBe(13);
    expect(vatRateFor(2)).toBe(9);
    expect(vatRateFor(3)).toBe(5);
    expect(vatRateFor(5)).toBe(4);
  });

  it("treats exempt categories as zero-rated", () => {
    expect(vatRateFor(4)).toBe(0);
    expect(vatRateFor(6)).toBe(0);
    expect(vatRateFor(7)).toBe(0);
    expect(vatRateFor(8)).toBe(0);
  });

  it("returns null for an unknown category rather than guessing", () => {
    expect(vatRateFor(99)).toBeNull();
  });
});

describe("isVatConsistent", () => {
  it("accepts a 13% line", () => {
    expect(isVatConsistent(1, 4.35, 0.57)).toBe(true);
  });

  it("rejects a 13% line whose vatAmount does not match", () => {
    expect(isVatConsistent(1, 4.35, 0.9)).toBe(false);
  });

  it("accepts a zero-rated line with no tax", () => {
    expect(isVatConsistent(7, 12.0, 0)).toBe(true);
  });

  it("rejects a zero-rated line that claims tax", () => {
    expect(isVatConsistent(7, 12.0, 1.5)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/mydata/vat.test.ts`
Expected: FAIL — `Cannot find module './vat'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/mydata/vat.ts
const RATES: Record<number, number> = { 1: 13, 2: 9, 3: 5, 4: 0, 5: 4, 6: 0, 7: 0, 8: 0 };

export function vatRateFor(category: number): number | null {
  return Object.prototype.hasOwnProperty.call(RATES, category) ? RATES[category] : null;
}

export function isVatConsistent(category: number, netValue: number, vatAmount: number): boolean {
  const rate = vatRateFor(category);
  if (rate === null) return false;
  const expected = Math.round(netValue * (rate / 100) * 100) / 100;
  return Math.abs(expected - vatAmount) < 0.02;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/mydata/vat.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/mydata/vat.ts src/mydata/vat.test.ts
git commit -m "Add myDATA VAT category mapping with consistency check"
```

---

### Task 2: Description normalization

**Files:**
- Create: `src/mydata/normalize.ts`
- Test: `src/mydata/normalize.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/mydata/normalize.test.ts
import { describe, it, expect } from "vitest";
import { normalizeDescription, canonicalTokens } from "./normalize";

describe("normalizeDescription", () => {
  it("strips case, accents and punctuation", () => {
    expect(normalizeDescription("ΦΕΤΑ ΠΟΠ 400G")).toBe("φετα ποπ 400g");
  });

  it("canonicalizes greek unit abbreviations", () => {
    expect(normalizeDescription("ΓΑΛΑ 1L")).toBe(normalizeDescription("ΓΑΛΑ 1 ΛΙΤΡΟ"));
  });

  it("removes common retail noise", () => {
    expect(normalizeDescription("ΝΤΟΜΑΤΕΣ 1KG  ΑΒ")).toBe(
      normalizeDescription("ΝΤΟΜΑΤΕΣ 1 KG"),
    );
  });

  it("keeps pack sizes distinct", () => {
    expect(normalizeDescription("ΓΑΛΑ 1L")).not.toBe(normalizeDescription("ΓΑΛΑ 2L"));
  });
});

describe("canonicalTokens", () => {
  it("sorts tokens so word order does not matter", () => {
    expect(canonicalTokens("ΦΕΤΑ ΠΟΠ")).toBe(canonicalTokens("ΠΟΠ ΦΕΤΑ"));
  });

  it("distinguishes different products", () => {
    expect(canonicalTokens("ΓΑΛΑ 1L")).not.toBe(canonicalTokens("ΓΑΛΑ 2L"));
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/mydata/normalize.test.ts`
Expected: FAIL — `Cannot find module './normalize'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/mydata/normalize.ts
const UNIT_MAP: Record<string, string> = {
  l: "l", lt: "l", lit: "l", λ: "l", λιτρο: "l", λιτρα: "l", λίτρο: "l",
  kg: "kg", κιλο: "kg", κιλά: "kg", κιλό: "kg",
  g: "g", gr: "g", γρ: "g", γραμ: "g", γραμμ: "g", γραμματια: "g",
  ml: "ml", χιλ: "ml", ml: "ml",
  pcs: "pcs", τεμ: "pcs", τεμάχια: "pcs", τμχ: "pcs",
};

const NOISE = new Set([
  "αβ", "αββα", "αββας", "βασιλοπουλος", "βασιλοπουλου", "λιδλ", "σκλαβενιτης",
  "masoutis", "mymarket", "k-market", "the", "και", "το", "η", "ο", "του", "της",
]);

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeDescription(input: string): string {
  return stripAccents(input)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.]/gu, " ")
    .replace(/\./g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => UNIT_MAP[t] ?? t)
    .filter((t) => !NOISE.has(t))
    .join(" ");
}

export function canonicalTokens(input: string): string {
  return normalizeDescription(input).split(" ").filter(Boolean).sort().join(" ");
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/mydata/normalize.test.ts`
Expected: PASS, 6 tests. If the noise-removal case fails, inspect which token differs and add it to `NOISE`.

- [ ] **Step 5: Commit**

```bash
git add src/mydata/normalize.ts src/mydata/normalize.test.ts
git commit -m "Add Greek receipt description normalization"
```

---

### Task 3: XML parsing

**Files:**
- Modify: `package.json` (add `fast-xml-parser`)
- Create: `src/mydata/types.ts`
- Create: `src/mydata/parseDocument.ts`
- Create: `src/mydata/fixtures/synthetic-supermarket.xml`
- Test: `src/mydata/parseDocument.test.ts`

- [ ] **Step 1: Install the parser**

```bash
npm install fast-xml-parser
```

If npm 11 rejects install scripts, add to `package.json`:
```json
"allowScripts": { "esbuild": true, "expo-crypto": true, "fast-xml-parser": true }
```
then re-run `npm install`.

- [ ] **Step 2: Write the synthetic fixture**

`fast-xml-parser` with `ignoreAttributes: false` needs a realistic root. Create
`src/mydata/fixtures/synthetic-supermarket.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<InvoicesDoc xmlns="http://www.aade.gr/myDATA/invoice/v1.0">
  <invoice>
    <issuer>
      <vatNumber>094014201</vatNumber>
      <name>ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ</name>
      <branch>1</branch>
    </issuer>
    <counterpart>
      <vatNumber>999999999</vatNumber>
      <name>ΑΝΩΝΥΜΟΣ ΠΕΛΑΤΗ</name>
    </counterpart>
    <invoiceHeader>
      <series>ΤΔΑ-1001</series>
      <aa>4821</aa>
      <invoiceType>1.1</invoiceType>
      <currency>EUR</currency>
      <issueDate>2026-09-27</issueDate>
    </invoiceHeader>
    <invoiceDetails>
      <lineNumber>1</lineNumber>
      <quantity>1</quantity>
      <netValue>4.35</netValue>
      <vatCategory>1</vatCategory>
      <vatAmount>0.57</vatAmount>
      <itemCode>5901234123456</itemCode>
      <lineComments>ΦΕΤΑ ΠΟΠ 400G</lineComments>
    </invoiceDetails>
    <invoiceDetails>
      <lineNumber>2</lineNumber>
      <quantity>2</quantity>
      <netValue>3.00</netValue>
      <vatCategory>1</vatCategory>
      <vatAmount>0.39</vatAmount>
      <itemCode>5909876543210</itemCode>
      <lineComments>ΓΑΛΑ 1L</lineComments>
    </invoiceDetails>
    <mark>400000123456789</mark>
  </invoice>
</InvoicesDoc>
```

Note the second line has `quantity 2` and `netValue 3.00`, so the unit price is
`1.50`. That is the case Task 5 must get right.

- [ ] **Step 3: Write the failing test**

```ts
// src/mydata/parseDocument.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseDocument } from "./parseDocument";

const fixture = (name: string) =>
  readFileSync(join(__dirname, "fixtures", name), "utf8");

describe("parseDocument", () => {
  it("parses issuer, header and mark", () => {
    const r = parseDocument(fixture("synthetic-supermarket.xml"));
    expect(r.issuerVat).toBe("094014201");
    expect(r.issuerName).toBe("ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ");
    expect(r.issueDate).toBe("2026-09-27");
    expect(r.series).toBe("ΤΔΑ-1001");
    expect(r.aa).toBe("4821");
    expect(r.mark).toBe("400000123456789");
  });

  it("parses every line", () => {
    const r = parseDocument(fixture("synthetic-supermarket.xml"));
    expect(r.lines).toHaveLength(2);
    expect(r.lines[0].description).toBe("ΦΕΤΑ ΠΟΠ 400G");
    expect(r.lines[0].netValue).toBe(4.35);
    expect(r.lines[0].vatCategory).toBe(1);
    expect(r.lines[0].itemCode).toBe("5901234123456");
  });

  it("accepts a document whose line array is named invoiceLines", () => {
    const alt = fixture("synthetic-supermarket.xml")
      .replace(/invoiceDetails/g, "invoiceLines");
    const r = parseDocument(alt);
    expect(r.lines).toHaveLength(2);
  });

  it("throws on a document with no lines", () => {
    expect(() => parseDocument("<InvoicesDoc><invoice/></InvoicesDoc>")).toThrow();
  });

  it("throws on unparseable input", () => {
    expect(() => parseDocument("not xml at all <<<")).toThrow();
  });
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `npx vitest run src/mydata/parseDocument.test.ts`
Expected: FAIL — `Cannot find module './parseDocument'`.

- [ ] **Step 5: Write the types**

```ts
// src/mydata/types.ts
export type MyDataLine = {
  lineNumber: number;
  description: string;
  netValue: number;
  quantity: number;
  vatCategory: number;
  vatAmount: number;
  itemCode: string | null;
  taricNo: string | null;
  measurementUnit: number | null;
};

export type MyDataReceipt = {
  issuerVat: string;
  issuerName: string;
  issueDate: string;
  series: string;
  aa: string;
  mark: string | null;
  currency: string;
  lines: MyDataLine[];
};

export type NormalizedRow = {
  description: string;
  nameNormalized: string;
  itemCode: string | null;
  price: number;
  qty: number;
  unit: string | null;
  vatRate: number | null;
  chain: string;
};
```

- [ ] **Step 6: Write the parser**

```ts
// src/mydata/parseDocument.ts
import { XMLParser } from "fast-xml-parser";
import type { MyDataLine, MyDataReceipt } from "./types";

const UNIT_LABEL: Record<number, string> = { 1: "pcs", 2: "kg", 3: "lt" };

const asArray = <T,>(v: T | T[] | undefined): T[] =>
  v === undefined ? [] : Array.isArray(v) ? v : [v];

const asString = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === "object" && v !== null && "#text" in (v as Record<string, unknown>)) {
    return String((v as Record<string, unknown>)["#text"]);
  }
  return String(v);
};

const asNumber = (v: unknown, fallback: number): number => {
  const n = Number(asString(v));
  return Number.isFinite(n) ? n : fallback;
};

export function parseDocument(xml: string): MyDataReceipt {
  const parser = new XMLParser({
    ignoreAttributes: true,
    removeNSPrefix: true,
    parseTagValue: false,
  });

  const doc = parser.parse(xml) as Record<string, any>;
  const invoices = asArray(doc?.InvoicesDoc?.invoice);
  if (invoices.length === 0) throw new Error("myDATA: no invoice element found");

  const inv = invoices[0];
  const rawLines = asArray(inv?.invoiceDetails ?? inv?.invoiceLines);
  if (rawLines.length === 0) throw new Error("myDATA: no invoice line items found");

  const lines: MyDataLine[] = rawLines.map((r: Record<string, any>) => ({
    lineNumber: asNumber(r.lineNumber, 0),
    description: asString(r.lineComments) ?? asString(r.itemDescr) ?? "",
    netValue: asNumber(r.netValue, 0),
    quantity: asNumber(r.quantity, 1),
    vatCategory: asNumber(r.vatCategory, 8),
    vatAmount: asNumber(r.vatAmount, 0),
    itemCode: asString(r.itemCode),
    taricNo: asString(r.TaricNo),
    measurementUnit: r.measurementUnit === undefined ? null : asNumber(r.measurementUnit, 1),
  }));

  return {
    issuerVat: asString(inv?.issuer?.vatNumber) ?? "",
    issuerName: asString(inv?.issuer?.name) ?? "",
    issueDate: asString(inv?.invoiceHeader?.issueDate) ?? "",
    series: asString(inv?.invoiceHeader?.series) ?? "",
    aa: asString(inv?.invoiceHeader?.aa) ?? "",
    mark: asString(inv.mark),
    currency: asString(inv?.invoiceHeader?.currency) ?? "EUR",
    lines,
  };
}

export { UNIT_LABEL };
```

- [ ] **Step 7: Run it to verify it passes**

Run: `npx vitest run src/mydata/parseDocument.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/mydata/
git commit -m "Parse myDATA document into typed line items"
```

---

### Task 4: Schema migration

**Files:**
- Create: `supabase/migrations/0002_mydata.sql`

- [ ] **Step 1: Write the migration**

```sql
-- myDATA ingestion: canonical products, private receipts, public price points.

alter table products
  add column if not exists verified boolean not null default false,
  add column if not exists brand text,
  add column if not exists size_value numeric,
  add column if not exists size_unit text,
  add column if not exists name_normalized text,
  add column if not exists taric text,
  add column if not exists merged_into uuid references products(id);

create index if not exists products_name_normalized_idx
  on products (name_normalized);

create table if not exists product_codes (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  code text not null,
  code_type text not null check (code_type in ('ean','retailer')),
  chain text,
  created_at timestamptz default now(),
  unique (chain, code, code_type)
);

create table if not exists receipts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid references stores(id) on delete set null,
  receipt_hash text not null unique,
  mydata_mark text,
  item_count int,
  bought_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists receipt_items (
  id uuid primary key default uuid_generate_v4(),
  receipt_id uuid not null references receipts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  description_raw text not null,
  qty numeric,
  unit_price numeric,
  line_total numeric,
  vat_rate numeric,
  created_at timestamptz default now()
);

create table if not exists price_points (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  price numeric not null,
  vat_rate numeric,
  unit text,
  source_receipt_id uuid references receipts(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists price_points_lookup
  on price_points (product_id, store_id, created_at desc);

-- The only object the client may read for prices. Omits user_id and
-- source_receipt_id by construction, and hides unverified products.
drop view if exists public.product_price_latest;
create view public.product_price_latest
with (security_invoker = true) as
select distinct on (pp.product_id, pp.store_id)
  pp.product_id, pp.store_id, pp.price, pp.vat_rate, pp.unit,
  pp.created_at as observed_at
from price_points pp
join products p on p.id = pp.product_id
where p.merged_into is null and p.verified
order by pp.product_id, pp.store_id, pp.created_at desc;

alter table products enable row level security;
alter table product_codes enable row level security;
alter table receipts enable row level security;
alter table receipt_items enable row level security;
alter table price_points enable row level security;

drop policy if exists "public read products" on products;
create policy "public read products" on products for select using (true);
drop policy if exists "public read product_codes" on product_codes;
create policy "public read product_codes" on product_codes for select using (true);
drop policy if exists "authenticated insert products" on products;
create policy "authenticated insert products" on products for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "own receipts" on receipts;
create policy "own receipts" on receipts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own receipt_items" on receipt_items;
create policy "own receipt_items" on receipt_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "public read price_points" on price_points;
create policy "public read price_points" on price_points for select using (true);
drop policy if exists "authenticated insert price_points" on price_points;
create policy "authenticated insert price_points" on price_points for insert
  with check (auth.role() = 'authenticated');
```

- [ ] **Step 2: Apply it**

Run: `npx supabase db push`
Expected: `Applying migration 0002_mydata.sql...` and `Finished supabase db push.`

If it prompts for a database password you do not have, run the file in the Supabase
SQL editor instead and record that in the commit message.

- [ ] **Step 3: Verify the anonymity rule holds**

Run a query that must return **zero** columns relating to users:

```sql
select column_name from information_schema.columns
where table_name = 'product_price_latest';
```

Expected exactly: `product_id, store_id, price, vat_rate, unit, observed_at`.
If `user_id` or `source_receipt_id` appear, the view is wrong — fix it before continuing.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0002_mydata.sql
git commit -m "Add myDATA schema: product codes, private receipts, public price points"
```

---

### Task 5: Receipt hash and normalization to rows

**Files:**
- Create: `src/mydata/receiptHash.ts`
- Create: `src/mydata/normalizeReceipt.ts`
- Test: `src/mydata/normalizeReceipt.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/mydata/normalizeReceipt.test.ts
import { describe, it, expect } from "vitest";
import { receiptHash } from "./receiptHash";
import { normalizeReceipt } from "./normalizeReceipt";
import { parseDocument } from "./parseDocument";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const xml = readFileSync(join(__dirname, "fixtures", "synthetic-supermarket.xml"), "utf8");

describe("receiptHash", () => {
  it("is stable for the same document", () => {
    const a = receiptHash(parseDocument(xml));
    const b = receiptHash(parseDocument(xml));
    expect(a).toBe(b);
  });

  it("changes when the receipt changes", () => {
    const a = receiptHash(parseDocument(xml));
    const b = receiptHash(parseDocument(xml.replace("4821", "4822")));
    expect(a).not.toBe(b);
  });

  it("is a hex sha256", () => {
    expect(receiptHash(parseDocument(xml))).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("normalizeReceipt", () => {
  const rows = normalizeReceipt(parseDocument(xml));

  it("emits one row per line", () => {
    expect(rows).toHaveLength(2);
  });

  it("uses the raw net value as price when quantity is 1", () => {
    expect(rows[0].price).toBe(4.35);
  });

  it("divides net value by quantity to get a comparable unit price", () => {
    expect(rows[1].price).toBe(1.5);
  });

  it("derives the vat rate from the category", () => {
    expect(rows[0].vatRate).toBe(13);
  });

  it("keeps the retailer item code and the chain", () => {
    expect(rows[0].itemCode).toBe("5901234123456");
    expect(rows[0].chain).toBe("ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ");
  });

  it("normalizes the description", () => {
    expect(rows[0].nameNormalized).toBe("φετα ποπ 400g");
  });

  it("drops lines whose vat arithmetic does not check out", () => {
    const bad = xml.replace("<vatAmount>0.57</vatAmount>", "<vatAmount>9.99</vatAmount>");
    expect(normalizeReceipt(parseDocument(bad))).toHaveLength(1);
  });

  it("drops lines with no usable price", () => {
    const bad = xml.replace("<netValue>4.35</netValue>", "<netValue>0</netValue>");
    expect(normalizeReceipt(parseDocument(bad)).every((r) => r.price > 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/mydata/normalizeReceipt.test.ts`
Expected: FAIL — `Cannot find module './receiptHash'`.

- [ ] **Step 3: Write the hash**

`expo-crypto` is a native module and unavailable in a plain Node test run, so the
hash must use WebCrypto, which Node 18+ provides globally.

```ts
// src/mydata/receiptHash.ts
import type { MyDataReceipt } from "./types";

export async function receiptHash(r: MyDataReceipt): Promise<string> {
  const material = [r.issuerVat, r.issueDate, r.series, r.aa, r.mark ?? ""].join("|");
  const bytes = new TextEncoder().encode(material);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
```

Update the test's `expect(a).toBe(b)` calls to `await`, and add `async` to those
`it` callbacks.

- [ ] **Step 4: Write the normalizer**

```ts
// src/mydata/normalizeReceipt.ts
import { canonicalTokens, normalizeDescription } from "./normalize";
import { isVatConsistent, vatRateFor } from "./vat";
import { UNIT_LABEL } from "./parseDocument";
import type { MyDataReceipt, NormalizedRow } from "./types";

export function normalizeReceipt(r: MyDataReceipt): NormalizedRow[] {
  const rows: NormalizedRow[] = [];

  for (const line of r.lines) {
    if (!isVatConsistent(line.vatCategory, line.netValue, line.vatAmount)) continue;

    const qty = line.quantity > 0 ? line.quantity : 1;
    const price = Math.round((line.netValue / qty) * 100) / 100;
    if (price <= 0) continue;

    const description = line.description.trim();
    if (!description) continue;

    rows.push({
      description,
      nameNormalized: canonicalTokens(description),
      itemCode: line.itemCode,
      price,
      qty,
      unit:
        line.measurementUnit !== null
          ? UNIT_LABEL[line.measurementUnit] ?? null
          : null,
      vatRate: vatRateFor(line.vatCategory),
      chain: r.issuerName.trim(),
    });
  }

  return rows;
}

export { normalizeDescription };
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npx vitest run src/mydata/normalizeReceipt.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 6: Commit**

```bash
git add src/mydata/receiptHash.ts src/mydata/normalizeReceipt.ts src/mydata/normalizeReceipt.test.ts
git commit -m "Normalize myDATA receipts into anonymous price rows"
```

---

### Task 6: Ingest edge function

**Files:**
- Create: `supabase/functions/ingest-receipt/index.ts`

- [ ] **Step 1: Write the function**

```ts
// supabase/functions/ingest-receipt/index.ts
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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return json(401, { error: "invalid session" });
  const userId = userData.user.id;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json(400, { error: "invalid json" });
  }

  if (!body.receiptHash || !body.rows?.length) {
    return json(400, { error: "receiptHash and rows are required" });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: dupe } = await admin
    .from("receipts")
    .select("id")
    .eq("receipt_hash", body.receiptHash)
    .maybeSingle();
  if (dupe) return json(200, { receiptId: dupe.id, duplicate: true, created: 0 });

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
    const lookupName = override ?? row.nameNormalized;

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
      const { data: created1 } = await admin
        .from("products")
        .insert({
          name_el: row.description,
          name_normalized: lookupName,
          verified: false,
        })
        .select("id")
        .single();
      productId = created1?.id ?? null;
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

  return json(200, { receiptId: receipt.id, duplicate: false, created });
});
```

- [ ] **Step 2: Deploy it**

Run: `npx supabase functions deploy ingest-receipt --no-verify-jwt`
Expected: `Deployed Functions on project uoajjlkuihplzzilechd: ingest-receipt`

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/ingest-receipt/
git commit -m "Add ingest-receipt edge function as the trust boundary"
```

---

### Task 7: Wire QR scanning into the scan screen

**Files:**
- Modify: `app/(tabs)/scan.tsx`

- [ ] **Step 1: Add a `qr` mode alongside `barcodeMode`**

Rename the existing `barcodeMode` state to `cameraMode` with values
`"receipt" | "barcode" | "qr"`, keeping the current receipt and barcode behaviour
intact. The `CameraView` stays a single instance (this is what fixed the dead
camera) and receives:

```tsx
<CameraView
  style={{ flex: 1 }}
  facing="back"
  flash={flash ? "on" : "off"}
  ref={camRef}
  barcodeScannerSettings={cameraMode === "barcode" ? BARCODE_SETTINGS : undefined}
  onBarcodeScanned={cameraMode === "barcode" ? handleBarcodeScan : undefined}
  onBarcodeScannedQR={
    cameraMode === "qr"
      ? (e) => void handleQr(e.data)
      : undefined
  }
/>
```

If `onBarcodeScannedQR` is not in the installed `expo-camera` version, use the
single `onBarcodeScanned` and switch on `result.type === "qr"`. Check the installed
version's types before writing this step.

- [ ] **Step 2: Add the QR handler**

```tsx
const [pendingRows, setPendingRows] = useState<NormalizedRow[] | null>(null);
const [saving, setSaving] = useState(false);

async function handleQr(data: string) {
  if (!/^https?:\/\//i.test(data)) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  setBusy(true);
  try {
    const detailUrl = data.replace(/\/+$/, "") + "/myDATA";
    const res = await fetch(detailUrl);
    if (!res.ok) throw new Error(`http ${res.status}`);
    const xml = await res.text();
    const receipt = parseDocument(xml);
    const rows = normalizeReceipt(receipt);
    if (rows.length === 0) throw new Error("no usable lines");
    setReceiptMeta({
      hash: await receiptHash(receipt),
      mark: receipt.mark,
      issuerVat: receipt.issuerVat,
      issuerName: receipt.issuerName,
      issueDate: receipt.issueDate,
    });
    setPendingRows(rows);
    setCameraMode("receipt");
  } catch (e) {
    logError(e as Error, { context: "mydata_fetch" });
    Alert.alert(
      "Δεν μπόρεσα να διαβάσω το QR",
      "Δοκίμασε φωτογραφία της απόδειξης ή κάνε εισαγωγή από τη συλλογή.",
    );
  } finally {
    setBusy(false);
  }
}
```

- [ ] **Step 3: Add the correction + save screen**

Render `pendingRows` as an editable list: each row shows the parsed description,
price, and a `TextInput` letting the user fix the description before saving. Then:

```tsx
async function saveMyDataReceipt() {
  if (!pendingRows || !receiptMeta) return;
  setSaving(true);
  try {
    const res = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ingest-receipt`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...receiptMeta,
          rows: pendingRows,
          productOverrides: buildOverrides(pendingRows),
        }),
      },
    );
    const out = await res.json();
    if (!res.ok) throw new Error(out.error ?? "save failed");
    setPendingRows(null);
    Alert.alert(
      out.duplicate ? "Ήταν ήδη αποθηκευμένη" : "Αποθηκεύτηκε",
      out.duplicate ? "Αυτή η απόδειξη υπάρχει ήδη στο ιστορικό σου." : `${out.created} τιμές προστέθηκαν.`,
    );
  } catch (e) {
    logError(e as Error, { context: "mydata_save" });
    Alert.alert("Κάτι πήγε στραβά", "Έλεγξε το internet και ξαναπροσπάθησε.");
  } finally {
    setSaving(false);
  }
}
```

- [ ] **Step 4: Typecheck and test**

Run: `npx tsc --noEmit && npx vitest run`
Expected: `tsc` exit 0, 147 + 26 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/\(tabs\)/scan.tsx
git commit -m "Scan myDATA receipt QR with match correction before saving"
```

---

### Task 8: Public product price page

**Files:**
- Create: `app/product/[id].tsx`

- [ ] **Step 1: Write the page**

```tsx
import { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../src/lib/supabase";
import { C, AppleCard } from "../../src/components/Apple";

type Quote = { store_id: string; store_name: string; chain: string; price: number; observed_at: string };

export default function ProductPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!id) return;
    void (async () => {
      const { data: product } = await supabase
        .from("products")
        .select("name_el")
        .eq("id", id)
        .single();
      setName(product?.name_el ?? "");

      const { data: rows } = await supabase
        .from("product_price_latest")
        .select("store_id, price, observed_at, stores!inner(name, chain)")
        .eq("product_id", id);

      const mapped: Quote[] = (rows ?? []).map((r: any) => ({
        store_id: r.store_id,
        store_name: r.stores?.name ?? "",
        chain: r.stores?.chain ?? "",
        price: Number(r.price),
        observed_at: r.observed_at,
      }));
      mapped.sort((a, b) => a.price - b.price);
      setQuotes(mapped);
    })();
  }, [id]);

  if (!quotes) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingTop: 70, paddingBottom: 130 }}>
      <Text style={styles.title}>{name}</Text>

      {quotes.length === 0 ? (
        <Text style={styles.empty}>Δεν υπάρχει ακόμη τιμή για αυτό το προϊόν.</Text>
      ) : (
        quotes.map((q, i) => (
          <AppleCard key={q.store_id} style={{ marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Ionicons name={i === 0 ? "trophy" : "storefront-outline"} size={20} color={i === 0 ? C.green : C.sub} />
            <View style={{ flex: 1 }}>
              <Text style={styles.store}>{q.store_name}</Text>
              <Text style={styles.updated}>
                {new Date(q.observed_at).toLocaleDateString("el-GR")}
              </Text>
            </View>
            <Text style={styles.price}>{q.price.toFixed(2).replace(".", ",")}€</Text>
          </AppleCard>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 26, fontWeight: "800", marginBottom: 16, letterSpacing: -0.4 },
  empty: { fontSize: 15, color: C.sub },
  store: { fontSize: 15, fontWeight: "700" },
  updated: { fontSize: 12, color: C.sub, marginTop: 2 },
  price: { fontSize: 17, fontWeight: "800" },
});
```

- [ ] **Step 2: Typecheck and test**

Run: `npx tsc --noEmit && npx vitest run`
Expected: exit 0, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/product/
git commit -m "Add public product price page with cheapest store and last update"
```

---

### Task 9: End-to-end verification on device

This task is not optional. The project's history is a long record of "it typechecks"
being mistaken for "it works" — a dead camera shipped that way, and a barcode button
that silently did nothing.

**Files:**
- Create: `docs/verification/2026-09-28-mydata-e2e.md`

- [ ] **Step 1: Reconnect the device**

```bash
adb kill-server; adb start-server; adb devices
```

If the device is still absent, stop and report — do not mark this task complete.

- [ ] **Step 2: Verify the full flow by hand**

With the app on a real device: scan a myDATA receipt QR → confirm the parsed lines
appear → correct one description → save → open the product page → confirm the price
appears with the correct store and a "last updated" date.

- [ ] **Step 3: Verify the anonymity rule end to end**

Run in the Supabase SQL editor:

```sql
select column_name from information_schema.columns
where table_name = 'product_price_latest';
```

Confirm no `user_id` and no `source_receipt_id`. Then confirm the client cannot read
`price_points` rows it did not create:

```sql
-- as an authenticated non-inserting role this must fail
select * from price_points;
```

- [ ] **Step 4: Verify dedup**

Scan the same receipt twice. Expected: the second attempt reports
"Ήταν ήδη αποθηκευμένη" and creates no new `price_points` rows:

```sql
select count(*) from price_points where source_receipt_id is not null;
```

The count must not increase.

- [ ] **Step 5: Record the evidence**

Write the observed results, screenshots and queries to
`docs/verification/2026-09-28-mydata-e2e.md`, then commit:

```bash
git add docs/verification/
git commit -m "Verify myDATA ingestion end to end on device"
```

---

## Self-review against the spec

| Spec requirement | Task |
|---|---|
| D1 extract-and-discard (no AFM, name, totals, document) | 4, 5, 6 — only normalized rows are stored; `counterpart` is never read |
| D1 caveat: residual is behavioural data | 4 — the public view is the enforcement point |
| D2 exact last price, anonymous | 4, 6, 8 — `distinct on ... order by created_at desc`, no user columns |
| D3 chain-scoped code, conservative description match | 2, 5, 6 — `itemCode` first, exact normalized match only |
| D4 incentive | Deferred to the second plan, as scoped |
| D5 on-device parse, server validates | 3, 6, 7 |
| §5 field mapping incl. VAT lookup | 1, 3, 5 |
| §7 surfaces | 8 (product page); receipt history and search deferred |
| §8 failure handling incl. OCR fallback | 7 — Alert offering photo/gallery, existing OCR path intact |
| §9 feasibility risk | Task 0, gated |
| §10 testing | 1, 2, 3, 5 unit tests; 4 RLS check; 9 e2e |

**Known gaps, stated rather than hidden:** the second plan (private receipt history,
product search/add, alerts, merge-review) is not in this document. That is the scope
split, not an oversight.
