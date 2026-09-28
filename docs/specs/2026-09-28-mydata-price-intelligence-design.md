# myDATA Price Intelligence — Design

**Date:** 2026-09-28
**Status:** Draft for review
**Supersedes:** the OCR-first approach in `docs/superpowers/specs/2026-09-27-receipt-market-design.md`

---

## 1. Problem

Greek receipts are now official `myDATA` e-documents, mandatory for **every** Greek
business, not only supermarkets. Each carries a QR whose `downloadingInvoiceUrl`
resolves to a machine-readable document. Fetched with the `/myDATA` suffix it
returns the **detailed** format: every line item with the retailer's item code,
TARIC code, and description, plus VAT and discounts.

This means price data no longer has to be guessed from pixels. `myDATA` gives exact,
structured line items. That changes the product from "a receipt photo scanner" into
"a price database nobody's API can supply".

The catch that defines this whole design: we do **not** get to be a mirror of
`myDATA`. Retailers' APIs are closed, incomplete, and often unpublished. The only
honest source of what people actually paid is receipts themselves. So the data must
be crowd-collected, and the privacy model is not a footnote to that — it is the
constraint the schema is built around.

## 2. Locked decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | **Extract-and-discard** | Store only `(product, price, store, date, qty, unit, VAT)`. Discard AFM, customer name, totals, full line text, and the raw document. |
| D2 | **Exact last price**, anonymous | Public price is the most recent real observation, not a blurred average. Protected by an anonymity rule, not by coarsening. |
| D3 | **Chain-scoped code first, description as fallback** | Corrected: myDATA lines carry no EAN (see §5). A line resolves via `itemCode` within its chain, else via normalized description. Low confidence creates an *unverified* product needing human merge. |
| D4 | **Private history + alerts as the incentive** | Users get their own permanent receipt/price record and drop alerts. Public price graph is the side effect. |
| D5 | **On-device parse, server validates** | The fiscal document never reaches our infrastructure. A Supabase Edge Function is the trust boundary. |

### D1 corrected: minimizing data is not the same as having no personal data

`store + date + product` is a behavioural trace. It can expose a medical purchase,
a pharmacy habit, or a pregnancy. Retaining less sharply reduces what we must
protect; it does not make the residue harmless. Consequence: the anonymity rule
below is enforced **in the schema**, not by developer discipline, and there is
deliberately no "submitted by" surface anywhere in v1 or v2.

### D2's anonymity rule

> A price row is an anonymous fact about a store, never a statement about a person.

`"Lidl: φέτα 4,89€"` is a fact any shopper can verify by walking in. The risk lives
entirely in the *link* between a price and a person, so that link is never exposed.
Enforced by serving prices only through a view that omits `user_id` and
`source_receipt_id`. A price only one person in Greece has ever observed remains
theoretically traceable — accepted, as with any crowdsourced dataset — but no
per-contributor view, list, or badge will be built.

## 3. Architecture

```
┌─ phone ─────────────────────────┐      ┌─ Supabase ───────────────┐
│ 1. scan QR / paste URL          │      │                          │
│ 2. GET url + "/myDATA"          │      │ 5. validate rows         │
│    (document never leaves)      │      │ 6. dedup by receipt_hash │
│ 3. parse → line items           │─────▶│ 7. resolve/create product│
│ 4. POST normalized rows         │      │ 8. write price_points    │
└─────────────────────────────────┘      │ 9. private receipt+items │
                                         └──────────────────────────┘
```

The document is fetched and parsed on the device. Only normalized rows cross the
wire. The Edge Function never sees an AFM because it never sees a document.

**Why D5 over pure on-device (A):** product merging, dedup, and rate limiting all
need one central place to be consistent. Parsing — the part that breaks when a
provider changes a schema — stays on-device for D1, and its aggregated failures
are visible in the function's error metrics.

**Known trade-off:** on-device parsing means a parser bug reaches every user at
once and cannot be hotfixed. Mitigation: the parser is a pure module with fixture
tests against captured real documents, and the phone reports a parse-failure
counter so a bad provider schema is detectable within minutes.

## 4. Data model

Migrations extend the existing `supabase/schema.sql`. All statements idempotent.

```sql
-- Canonical product. `verified` false = awaiting human merge.
alter table products
  add column if not exists verified boolean not null default false,
  add column if not exists brand text,
  add column if not exists size_value numeric,
  add column if not exists size_unit text,
  add column if not exists name_normalized text,
  add column if not exists taric text,
  add column if not exists merged_into uuid references products(id);

-- Retailer codes. One product may carry many, one per chain. myDATA itemCode is
-- max 10 chars and is NOT an EAN; `code_type='retailer'` is the only kind
-- receipts produce today. 'ean' is reserved for user-scanned product barcodes.
create table if not exists product_codes (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  code text not null,
  code_type text not null check (code_type in ('ean','retailer')),
  chain text,
  created_at timestamptz default now(),
  unique (chain, code, code_type)
);

-- Private, per-user receipt record. No totals, no AFM, no document.
create table if not exists receipts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid references stores(id) on delete set null,
  receipt_hash text not null unique,   -- dedup; not reversible to the document
  mydata_mark text,
  item_count int,
  bought_at timestamptz,
  created_at timestamptz default now()
);

-- Private line items, for the user's own history view.
create table if not exists receipt_items (
  id uuid primary key default uuid_generate_v4(),
  receipt_id uuid not null references receipts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  description_raw text not null,       -- the retailer's own wording, private
  qty numeric,
  unit_price numeric,
  line_total numeric,
  vat_rate numeric,
  created_at timestamptz default now()
);

-- Public aggregate: one row per observed price.
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

-- D2's anonymity rule, enforced by the only object the client may read.
-- Also enforces D3: unverified products never appear in public comparison.
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
```

`product_price_latest` deliberately omits `user_id` and `source_receipt_id`. There is
no public view that exposes either, so D2 is a schema property rather than a
convention someone can break by accident. The `p.verified` filter is what keeps
unverified products out of public comparison, per D3.

`price_points` supersedes the existing `prices` table. The legacy OCR path writes
to `price_points` too, so both ingestion routes feed one graph; `prices` is left in
place, unreferenced, and dropped in a later migration once nothing reads it.

RLS: `receipts` and `receipt_items` are owner-only (`auth.uid() = user_id`).
`price_points` are insert-only for authenticated users; `product_price_latest` is
public read. `products` and `product_codes` are public read, authenticated write.

## 5. myDATA extraction

For each line in the detailed document, map:

| myDATA field | Destination |
|---|---|
| `invoiceDetails[]` | the line array (note: **not** `invoiceLines`) |
| `lineComments` | description — **primary** source; Greek retail ERPs put the product name here |
| `itemDescr` | description fallback; only populated for special tax-free documents |
| `itemCode` (max 10 chars) | `product_codes(code, code_type='retailer', chain)` |
| `TaricNo` (max 10 chars) | `products.taric` — an HS code, useful for category, **not** a consumer barcode |
| `netValue` | `price` — net line value, the comparable figure. VAT is uniform across Greek retailers, and gross figures across different VAT categories mislead. UI shows both: "4,89€ · 5,13€ με ΦΠΑ". |
| `quantity` + `measurementUnit` | `qty`, `unit`. `measurementUnit` is an int (1/2/3), mapped to a label. Unit price = `netValue / quantity` when quantity > 1. |
| `vatCategory` | `vat_rate` **via lookup** — it is a category, not a rate: 1→13%, 2→9%, 3→5%, 4→0%, 5→4%, 6→0%, 7→0%, 8→no VAT. |
| `vatAmount` | cross-check only; a mismatch with the category means a malformed line, which is rejected |
| `issuer.vatNumber` + `issuer.name` | resolve or create `stores` |
| `invoiceHeader.issueDate` | `bought_at` |
| `invoiceHeader.series` + `aa` | `receipt_hash` input |
| `mark` | `receipts.mydata_mark` |
| `counterpart.vatNumber` | **discarded.** For B2C retail receipts this is the literal `999999999` |
| `uid`, `authenticationCode` | discarded — not needed, and `uid` is a service-computed identifier |

`receipt_hash` = SHA-256 over `(issuer VAT, issueDate, series, aa, mark)`. This
dedups re-scans without storing anything that identifies the document. It is a
one-way hash of already-public fields, not of the receipt.

### Correction: receipt lines carry no EAN barcode

The documented `InvoiceRowType` has `itemCode` (10 chars) and `TaricNo` (10 chars).
Neither is an EAN-13. **There is no `lineBarcode` field.** An earlier draft of this
spec assumed one; that was wrong.

Consequence for D3: the barcode-first strategy applies to the *user scanning a
product in a shop*, not to receipt ingestion. A receipt line can only be identified
by a chain-scoped `itemCode` or by its normalized description. Price history is
therefore built from description matching, which is the fragile path — so the
unverified queue and human merge in D3 carry more weight than originally planned,
and every chain's own code is preserved precisely so merging is possible later.

## 6. Product identity (D3)

1. Line has an `itemCode` → look up `product_codes(chain, code, 'retailer')` →
   exact hit, done. This is the reliable path and covers repeat purchases from the
   same chain.
2. Else normalize the description (from `lineComments`, falling back to
   `itemDescr`): strip accents, case, punctuation, common retail noise, and
   canonicalize units. Query `products.name_normalized`.
3. Merge only on an **exact** match of the normalized string, or when the token
   sets are identical after unit canonicalization (e.g. `γαλα 1l` ≡ `γαλα φρεσκο 1 lt`).
   Anything fuzzier than that — partial token overlap, different pack sizes, brand
   variants — creates a new unverified product rather than guessing. A wrong merge
   silently corrupts a price series forever; a missed merge is recoverable by a
   human in seconds. Deliberately biased toward false negatives.
4. No/weak match → create `products(verified = false)` and index it for merge review.

When a new line creates an unverified product, its `itemCode` is still recorded
against that product for its chain. So the *second* receipt from the same chain
resolves exactly at step 1, and a human only has to reconcile across chains once.

`products(verified = false)` is a real state, not a placeholder. Unverified
products are excluded from public price comparison until merged, so a bad early
match cannot poison the graph. Merging sets `merged_into` and repoints
`price_points`/`receipt_items`; it never deletes, so history survives.

## 7. Product surfaces

1. **Scan receipt** — QR or URL; shows parsed lines, lets the user correct a match
   before saving. Correction is the highest-value human signal in the system.
2. **My receipts** (private) — the user's own receipt list, the D4 incentive.
3. **Product page** — current price, cheapest store right now, price history chart
   (`last updated` timestamp shown explicitly, per the requirement), and other
   users' matching lines for this product.
4. **Product search + add** — search the catalog, add a product, watch it.
5. **Alerts** — existing `watchlist` + `check-watchlist` edge function, now fed by
   real price points instead of nothing.

## 8. Failure handling

| Case | Behaviour |
|---|---|
| `downloadingInvoiceUrl` unreachable / needs auth | Reject with a clear message; **fall back to the existing OCR path**, never a silent dead end. |
| Unparseable / unexpected schema | Report parse failure, store nothing, ask for a photo and use OCR. |
| Duplicate scan | `receipt_hash` unique → "already added", link to the existing receipt. |
| Unknown retailer chain | Create `stores` on the fly from the issuer's VAT number. |
| Product match rejected by user | Trust the user; write the correction and re-run step 4. |

The OCR path stays in the codebase for v1. It is the fallback that keeps the app
useful when a provider's URL is not publicly fetchable — which is the single
largest unknown in this design.

## 9. Feasibility risk — read this before building

**Unverified:** that `downloadingInvoiceUrl` is fetchable **without credentials**.
It is issued by the *retailer's* provider (Prosapis, Epsilon, Peoples), not by
ΑΑΔΕ. If any provider requires a `Referer` or session cookie, on-device fetch
fails where a server-side fetch succeeds, and D5 collapses to approach B — which
means the fiscal document transits our infrastructure and the D1 privacy claim
must be weakened in the spec.

**Task 0 of the implementation plan is a spike to settle this:** take one real
receipt QR, `curl` the URL with no headers, and confirm the `/myDATA` variant
returns the detailed document. Every downstream decision depends on it, and it is
cheap. Do not build ingestion before the spike passes.

## 10. Testing

- **Parser (pure, high coverage):** fixtures from real captured documents —
  supermarket, pharmacy, hardware, fuel. Assert field mapping, VAT extraction,
  net-vs-gross preference, and that a malformed document throws rather than
  half-populating.
- **Normalization:** Greek accent/case stripping, unit canonicalization
  (`1L`/`1 λ`, `400G`/`400 γρ`), noise removal, and the known trap cases
  (different pack sizes must not merge).
- **Merge logic:** barcode hit, retailer-code hit, confident name match, and
  deliberately ambiguous pairs that must land in the unverified queue.
- **RLS:** a user can never read another user's `receipts` or `receipt_items`.
  The public view must not expose `user_id` or `source_receipt_id`.
- **End-to-end on device:** scan → parse → correct a match → save → product page
  shows the price → alert fires. The last mile is what has repeatedly been
  unverified in this project, so it is explicitly part of the plan.

## 11. Out of scope for v1

- Per-contributor views, badges, leaderboards (forbidden by D2's rule)
- Store APIs, scrapers, or any retailer feed
- Receipt totals, split payments, returns, or refunds
- The `DeliveryNote`/Group-QR flows (real, but a separate spec)
- Cashback, offers, or loyalty integration
- Greek-language OCR improvements (fallback path only)
