# Contributing (EN/EL welcome 🇬🇷)

Thanks for helping make supermarkets transparent!

## Quick dev loop
1. `npm install` → `cp .env.example .env` → fill Supabase keys
2. `npx expo start`
3. `npm run parse:test` must stay green when touching `src/parser/`

## Parser rules
- 0€ only: no cloud AI calls. On-device + regex + fuzzy.
- Add a fixture in `src/parser/demo.ts` for every new supermarket format.
- Greek receipts use `,` decimals — always normalize.

## PRs
- Small, one feature, Greek or English description OK.
- Include screenshot for UI changes (Apple-minimal white style).
