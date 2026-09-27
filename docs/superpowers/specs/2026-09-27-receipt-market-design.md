# Receipt Market — Design Spec
**Date:** 2026-09-27
**Status:** Approved by user
**Tagline (EL):** Ξέρεις πού είναι φθηνότερα.
**Repo name:** `receipt-market`

## 1. Problem & Vision
People shop at ΣΚΛΑΒΕΝΙΤΗΣ, LIDL, ΜΑΣΟΥΤΗΣ, ΑΒ, My Market and have no idea if 2,49€ for feta is cheap or expensive. Prices change weekly, no transparency.

**Vision:** One tap → photo of receipt → community price database with realtime updates → get notified when what you want gets cheaper elsewhere.

Core loop (must be <20 sec):
1. Buy → 2. Photo receipt → 3. Auto-extract (0€ on-device) → 4. Confirm → 5. Everyone sees live cheapest → 6. Watchlist push: «Φθηνότερα στο Lidl».

## 2. Approved Stack (Section 1 ✅)
- **Mobile:** Expo React Native + TypeScript + Expo Router + NativeWind (Apple-minimal white, SF-like, large touch targets)
- **Backend:** Supabase (Postgres + Auth + Storage + Realtime + Edge Functions) — free tier
- **OCR (0€):** `@react-native-ml-kit/text-recognition` on-device (Greek supported, offline, private) + custom `greekReceiptParser` (store keywords + price regex + fuzzy product match)
- **Push:** Expo Push Notifications (free) via Supabase Edge Function `check-watchlist`
- **Structure:** `app/(tabs)/` + `src/parser/` + `src/lib/` + `supabase/`

No cloud AI OCR in v1 (cost). No native Swift/Kotlin (2x work).

## 3. Data Model (Section 2 ✅)
```sql
stores(id uuid pk, chain text, name text, lat float, lng float, address text)
products(id uuid pk, name_el text, category text, barcode text nullable, emoji text)
receipts(id uuid pk, user_id uuid, store_id uuid fk, image_url text, total numeric, bought_at timestamptz)
prices(id uuid pk, product_id uuid fk, store_id uuid fk, receipt_id uuid fk, price numeric, created_at timestamptz)
watchlist(id uuid pk, user_id uuid, product_id uuid fk, target_price numeric nullable)
```

Categories (EL, Apple chips): Γαλακτοκομικά, Κρέας & Ψάρι, Φρούτα & Λαχανικά, Αρτοποιία, Τρόφιμα, Ποτά, Κατεψυγμένα, Καθαριότητα, Προσωπική Φροντίδα, Βρεφικά, Pet, Άλλα.

RLS: read public for stores/products/prices, write authenticated, Storage bucket `receipts` private + signed URLs.

## 4. Screens — Apple Minimal (Section 2 ✅)
4 tabs, white `#FFFFFF`, black text, iOS blue `#007AFF`, SF Rounded, 16px radius cards, haptic on scan:

1. **Αρχική (Home):** search bar «Ψάξε γάλα, φέτα…», horizontal category chips, «Φθηνότερα κοντά σου» cards: product + min price + store + trend ▲▼ + distance.
2. **Scan (Κεντρικό +):** big camera button, overlay guide, auto-crop → OCR → editable list (store auto-detected, each line: name + price + category) → «Καταχώρηση».
3. **Λίστα (Watchlist):** followed products with target price, toggle push, history sparkline, badge ΦΘΗΝΟΤΕΡΑ/ΑΚΡΙΒΟΤΕΡΑ.
4. **Προφίλ:** my receipts (thumbnails), stats (scans, savings), settings (language EL, notifications, logout).

Empty states in Greek with friendly illustration text. No clutter.

## 5. Zero-Cost Brain — Greek Parser (Section 3 ✅)
Flow: `expo-camera` photo → ML Kit `recognize()` → raw text blocks → `parseGreekReceipt(text)`:

1. **Store detect:** keywords: `ΣΚΛΑΒ|SKLAV|ΣΚΛΑΒΕΝΙΤΗΣ` → Sklavenitis, `LIDL|ΛΙΝΤΛ` → Lidl, `ΜΑΣΟΥΤ|MASOUT` → Masoutis, `ΑΒ|ΒΑΣΙΛΟΠΟΥΛΟΣ` → AB, `MY MARKET|ΜΑΡΚΕΤ` fallback + Levenshtein <3.
2. **Price lines:** regex `/^(.+?)\s+(\d+[.,]\d{2})\s*[€E]?$/gm`, normalize `,`→`.`, filter total/ΦΠΑ/ΥΠΟΛΟΙΠΟ/ΑΛΛΑΓΗ lines as meta.
3. **Product normalize:** uppercase, strip accents? keep Greek, remove weight `x2`, `500g`, fuzzy match vs `products` table (includes 120 seed Greek products: ΦΕΤΑ ΠΟΠ, ΓΑΛΑ ΦΡΕΣΚΟ 1L, etc) via `levenshtein <=2` or `includes`.
4. **Total:** line with `ΣΥΝΟΛΟ|TOTAL` + max price fallback.
5. Confidence score: % lines parsed. If <60% → show «Δεν διάβασα καλά — διόρθωσε» manual edit mode.

100% offline, 0€, private. Tested on 3 real Greek receipt formats.

## 6. Realtime + Notifications (Section 3 ✅)
- Supabase Realtime `postgres_changes` on `prices` → Home list updates live, no refresh.
- On `prices` INSERT, Edge Function `check-watchlist`: find watchers where `new.price < old min` or `< target_price` → send Expo Push: «🔻 Φέτα Ήπειρος: 2,19€ στο Lidl (ήταν 2,49€)».
- Digest (v2): weekly «Top 10 πτώσεις».
- Permissions: ask push only after 1st watchlist add (Apple guideline).

## 7. Error Handling
- Blurry/dark photo → ML Kit empty → UI hint: «Κράτα σταθερά, καλό φως» + retake.
- Unknown product → «+ Νέο προϊόν» with category picker, added to DB, improves parser.
- Duplicate receipt (same store+total+5min) → warn «Μήπως το έβαλες ήδη;».
- Offline → queue in AsyncStorage, sync when online.

## 8. Testing
- Unit: `greekReceiptParser.test.ts` with 15 fixtures (Sklavenitis/Lidl/Masoutis real anonymized texts).
- E2E (v2): Maestro scan flow.
- Manual checklist: Greek chars, comma decimals, ΦΠΑ lines ignored.

## 9. Non-Goals (YAGNI)
No barcode scan v1, no web admin v1, no loyalty points, no Cloud AI OCR, no maps SDK v1 (simple distance text).

## 10. Roadmap
- v0.1 (this scaffold): tabs + camera + manual entry + Supabase schema + parser + seed
- v0.2: ML Kit wiring + watchlist push end-to-end
- v1.0: TestFlight + 100 beta users in Athens

## Spec Self-Review
- [x] No TBD/TODO — all decisions made (Expo, Supabase, ML Kit, Greek-first)
- [x] Consistent: parser output matches `prices` schema, push matches watchlist schema
- [x] Scoped: single MVP, v2 deferred (barcode, maps, digest)
- [x] Unambiguous: regex, tables, screens explicitly defined
