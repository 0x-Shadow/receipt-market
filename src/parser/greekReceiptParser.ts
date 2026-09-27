// Zero-cost Greek receipt brain — 0€, offline, private.
// Input: raw OCR text from ML Kit. Output: structured receipt.
// Handles ΣΚΛΑΒΕΝΙΤΗΣ / LIDL / ΜΑΣΟΥΤΗΣ / ΑΒ / My Market formats.

export type ParsedItem = { name: string; price: number; raw: string };
export type ParsedReceipt = {
  storeChain: string;
  storeConfidence: number;
  items: ParsedItem[];
  total: number | null;
  confidence: number;
};

const STORE_KEYWORDS: Record<string, string[]> = {
  Sklavenitis: ["ΣΚΛΑΒ", "SKLAV", "ΣΚΛΑΒΕΝΙΤΗΣ"],
  Lidl: ["LIDL", "ΛΙΝΤΛ", "ΛΙΝΤΛ"],
  Masoutis: ["ΜΑΣΟΥΤ", "MASOUT", "ΜΑΣΟΥΤΗΣ"],
  AB: ["ΒΑΣΙΛΟΠΟΥΛΟΣ", "ΑΒ ", "AB "],
  "My Market": ["MY MARKET", "ΜΥ ΜΑΡΚΕΤ", "MYMARKET"],
};

const META_SKIP = ["ΣΥΝΟΛΟ", "TOTAL", "ΦΠΑ", "ΥΠΟΛΟΙΠΟ", "ΡΕΣΤΑ", "ΑΠΟΔΕΙΞΗ", "ΑΦΜ", "ΕΥΧΑΡΙΣΤΟΥΜΕ", "ΥΠΟΣΥΝΟΛΟ", "ΜΕΤΡΗΤΑ", "ΚΑΡΤΑ", "ΑΛΛΑΓΗ"];

export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1] + (a[i-1]===b[j-1]?0:1));
  return d[m][n];
}

export function detectStore(text: string): { chain: string; confidence: number } {
  const upper = text.toUpperCase();
  for (const [chain, kws] of Object.entries(STORE_KEYWORDS)) {
    if (kws.some(k => upper.includes(k))) return { chain, confidence: 0.95 };
  }
  // fuzzy fallback: best keyword distance
  let best = { chain: "Άγνωστο", dist: 99 };
  for (const [chain, kws] of Object.entries(STORE_KEYWORDS))
    for (const k of kws) {
      const words = upper.split(/\s+/);
      for (const w of words) {
        const d = levenshtein(w, k);
        if (d < best.dist) best = { chain, dist: d };
      }
    }
  if (best.dist <= 2) return { chain: best.chain, confidence: 0.6 };
  return { chain: "Άγνωστο", confidence: 0 };
}

const PRICE_LINE = /^(.+?)\s+(\d+[.,]\d{2})\s*[€E]?$/;

export function parseGreekReceipt(text: string): ParsedReceipt {
  const { chain, confidence: storeConfidence } = detectStore(text);
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const items: ParsedItem[] = [];
  let total: number | null = null;

  for (const line of lines) {
    const upper = line.toUpperCase();
    if (META_SKIP.some(m => upper.includes(m))) {
      const totalMatch = upper.match(/(ΣΥΝΟΛΟ|TOTAL)[^\d]*(\d+[.,]\d{2})/);
      if (totalMatch) total = parseFloat(totalMatch[2].replace(",", "."));
      continue;
    }
    const m = line.match(PRICE_LINE);
    if (!m) continue;
    const name = m[1].replace(/\s{2,}/g, " ").trim();
    const price = parseFloat(m[2].replace(",", "."));
    if (!name || isNaN(price) || price <= 0 || price > 500) continue;
    if (name.length < 2) continue;
    items.push({ name, price, raw: line });
  }

  if (total === null && items.length > 0) {
    // fallback: max single price is NOT total — leave null, UI sums
    total = Math.round(items.reduce((s, i) => s + i.price, 0) * 100) / 100;
  }

  const parseRatio = Math.min(1, items.length / Math.max(1, lines.length * 0.4));
  const confidence = Math.round(((parseRatio * 0.7 + storeConfidence * 0.3)) * 100) / 100;

  return { storeChain: chain, storeConfidence, items, total, confidence };
}

export function cleanProductName(raw: string): string {
  return raw.toUpperCase().replace(/\d+\s*(G|GR|ML|LT|KG|ΤΕΜ)\b/gi, "").replace(/\s+X\d+$/i, "").replace(/\s{2,}/g, " ").trim();
}
