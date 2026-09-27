# 🧾 receipt-market
### Ξέρεις πού είναι φθηνότερα.

> Snap your supermarket receipt → build a live community price map for Greece → get notified when what you love gets cheaper.

People who shop at **ΣΚΛΑΒΕΝΙΤΗΣ • LIDL • ΜΑΣΟΥΤΗΣ • ΑΒ • My Market** take a photo of their receipt. The app extracts store, products & prices (100% free on-device AI), saves them to a realtime database, and notifies you when prices drop elsewhere.

[![Expo](https://img.shields.io/badge/Expo-React_Native-black?logo=expo)](https://expo.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-green?logo=supabase)](https://supabase.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Cost](https://img.shields.io/badge/OCR_cost-0€-brightgreen.svg)]()
[![Language](https://img.shields.io/badge/lang-Ελληνικά-blue.svg)]()

---

## ✨ Features

| | |
|---|---|
| 📸 **10-sec scan** | Photo → auto store + products + prices, you just confirm |
| 🧠 **0€ smart parser** | On-device ML Kit + custom Greek regex, no API key, offline, private |
| 📡 **Realtime prices** | Supabase Realtime — cheapest near you updates live |
| 🔔 **Watchlist push** | Follow Φέτα, Γάλα… → «🔻 Φθηνότερα στο Lidl: 2,19€» |
| 🍎 **Apple-minimal UI** | White, SF-style, 4 tabs, categories, huge camera button |
| 🇬🇷 **Greek-first** | Categories, stores, receipts all in Ελληνικά |

### Tabs
1. **Αρχική** — search + categories (Γαλακτοκομικά, Κρέας, Λαχανικά…) + «Φθηνότερα κοντά σου»
2. **Scan** — big camera button with receipt guide
3. **Λίστα** — your watchlist with ΦΘΗΝΟΤΕΡΑ / ΑΚΡΙΒΟΤΕΡΑ badges
4. **Προφίλ** — my receipts, savings, settings

## 🌐 Landing Page

A live marketing page with an interactive phone mockup: [`landing/index.html`](landing/index.html) — open in any browser, no build step.

## 🏗️ Tech Stack

- **Mobile:** Expo SDK 51 • React Native • TypeScript • Expo Router • NativeWind
- **Backend:** Supabase (Postgres + Auth + Storage + Realtime + Edge Functions)
- **OCR:** `@react-native-ml-kit/text-recognition` (free, on-device, Greek) + `src/parser/greekReceiptParser.ts`
- **Push:** Expo Notifications (free)
- **Cost:** **0€/month** on free tiers 🎉

```
app/(tabs)/          → 4 Apple-minimal screens
src/parser/          → zero-cost Greek receipt brain
src/lib/supabase.ts  → realtime client
src/components/      → Apple cards, chips, price badges
supabase/schema.sql  → tables + RLS + seed (120 Greek products)
supabase/functions/check-watchlist → push on price drop
```

## 🚀 Quick Start (5 min)

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/receipt-market.git
cd receipt-market

# 2. Install
npm install

# 3. Supabase (free)
# - Create project at supabase.com
# - SQL Editor → paste supabase/schema.sql → Run
# - Storage → create bucket `receipts` (private)
# - Copy URL + anon key

# 4. Env
cp .env.example .env
# Edit .env:
# EXPO_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
# EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# 5. Run
npx expo start
# Press `i` (iOS) / `a` (Android) / scan QR with Expo Go
```

### Test the parser (no phone needed)
```bash
npm run parse:test
# parses 3 real Greek receipt formats → JSON
```

## 🧠 How the 0€ OCR works

No OpenAI. No Google Cloud bill.

```
Photo → ML Kit text (on-device) → greekReceiptParser():
  1. Store detect: ΣΚΛΑΒ / LIDL / ΜΑΣΟΥΤ / ΑΒ keywords + fuzzy
  2. Price lines: /^(.+?)\s+(\d+[.,]\d{2})\s*[€]?$/gm
  3. Skip: ΣΥΝΟΛΟ, ΦΠΑ, ΥΠΟΛΟΙΠΟ, ΑΠΟΔΕΙΞΗ as meta
  4. Fuzzy-match ΦΕΤΑ/ΓΑΛΑ vs products table
  5. Confidence % → if <60% ask manual fix
```

See [`src/parser/greekReceiptParser.ts`](src/parser/greekReceiptParser.ts) + [`docs/superpowers/specs/2026-09-27-receipt-market-design.md`](docs/superpowers/specs/2026-09-27-receipt-market-design.md).

## 📊 Database

`stores` → `products` → `prices` ← `receipts`, `watchlist`. Realtime on `prices`. RLS: public read, auth write. Seed includes Sklavenitis / Lidl / Masoutis + 120 products.

## 🔔 Notifications

`prices` INSERT → Edge Function `check-watchlist` → Expo Push to watchers. Example: «🔻 Γάλα ΔΕΛΤΑ 1L: 1,89€ στο Μασούτης (ήταν 2,10€)».

## 🗺️ Roadmap

- [x] v0.1 scaffold + parser + schema + Apple UI
- [ ] v0.2 ML Kit wiring + push end-to-end
- [ ] v1.0 TestFlight Athens beta (100 users)
- [ ] v1.1 barcode, maps, weekly digest

## 🤝 Contributing

PRs welcome! See [CONTRIBUTING.md](CONTRIBUTING.md). Greek issues OK. Please add a receipt fixture when touching the parser.

## 📄 License

MIT © receipt-market contributors — see [LICENSE](LICENSE).

---
Made with ❤️ in Greece. If this saves you money at the supermarket, give it a ⭐.
