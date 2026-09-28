import { logParserEvent } from "../lib/parserLogger";

export type ParsedItem = {
  name: string;
  price: number;
  raw: string;
  confidence: number;
  quantity?: number;
  unit?: string;
};

export type ParsedReceipt = {
  storeChain: string;
  storeConfidence: number;
  items: ParsedItem[];
  total: number | null;
  subtotal: number | null;
  vatAmount: number | null;
  confidence: number;
};

const STORE_KEYWORDS: Record<string, string[]> = {
  Sklavenitis: ["ΣΚΛΑΒ", "SKLAV", "ΣΚΛΑΒΕΝΙΤΗΣ"],
  Lidl: ["LIDL", "ΛΙΝΤΛ", "ΛΙΝΤΛ"],
  Masoutis: ["ΜΑΣΟΥΤ", "MASOUT", "ΜΑΣΟΥΤΗΣ"],
  AB: ["ΒΑΣΙΛΟΠΟΥΛΟΣ", "ΑΒ ", "AB "],
  "My Market": ["MY MARKET", "ΜΥ ΜΑΡΚΕΤ", "MYMARKET"],
};

const META_SKIP = [
  "ΣΥΝΟΛΟ", "TOTAL", "ΦΠΑ", "ΥΠΟΛΟΙΠΟ", "ΡΕΣΤΑ",
  "ΑΠΟΔΕΙΞΗ", "ΑΦΜ", "ΕΥΧΑΡΙΣΤΟΥΜΕ", "ΥΠΟΣΥΝΟΛΟ",
  "ΜΕΡΙΚΟ ΣΥΝΟΛΟ", "ΜΕΤΡΗΤΑ", "ΚΑΡΤΑ", "ΑΛΛΑΓΗ",
];

const OCR_REPLACEMENTS: [RegExp, string][] = [
  [/0(?=[Α-ΩΆΈΉΊΌΎΏ])/g, "Ο"],
  [/1(?=[Α-ΩΆΈΉΊΌΎΏ])/g, "Ι"],
  [/5(?=[Α-ΩΆΈΉΊΌΎΏ])/g, "Σ"],
  [/8(?=[Α-ΩΆΈΉΊΌΎΏ])/g, "Β"],
  [/O(?=[Α-ΩΆΈΉΊΌΎΏ]{2,})/g, "Ο"],
  [/l(?=[Α-ΩΆΈΉΊΌΎΏ])/g, "Ι"],
  [/S(?=[Α-ΩΆΈΉΊΌΎΏ])/g, "Σ"],
  [/B(?=[Α-ΩΆΈΉΊΌΎΏ])/g, "Β"],
];

export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1] + (a[i-1]===b[j-1]?0:1));
  return d[m][n];
}

export function correctOCRErrors(text: string): string {
  let result = text;
  for (const [pattern, replacement] of OCR_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export function fuzzyMatchProduct(name: string, candidates: string[]): { match: string; score: number } {
  if (candidates.length === 0) return { match: name, score: 0 };
  const normalizedName = name.toUpperCase().trim();
  let best = { match: candidates[0], score: 0 };
  for (const candidate of candidates) {
    const normalizedCandidate = candidate.toUpperCase().trim();
    const dist = levenshtein(normalizedName, normalizedCandidate);
    const maxLen = Math.max(normalizedName.length, normalizedCandidate.length, 1);
    const score = 1 - dist / maxLen;
    if (score > best.score) best = { match: candidate, score };
  }
  return best;
}

export function detectStore(text: string): { chain: string; confidence: number } {
  const upper = text.toUpperCase();
  for (const [chain, kws] of Object.entries(STORE_KEYWORDS)) {
    if (kws.some(k => upper.includes(k))) return { chain, confidence: 0.95 };
  }
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

function parseDecimal(s: string): number {
  return parseFloat(s.replace(",", "."));
}

function extractQuantity(line: string): { quantity: number | undefined; unit: string | undefined; cleaned: string } {
  let quantity: number | undefined;
  let unit: string | undefined;
  let cleaned = line;

  const prefixMatch = cleaned.match(/^(\d+)\s*[xX]\s*(.+)$/);
  if (prefixMatch) {
    quantity = parseInt(prefixMatch[1], 10);
    cleaned = prefixMatch[2];
  }

  const suffixMatch = cleaned.match(/^(.+?)\s*[xX]\s*(\d+)$/);
  if (suffixMatch && !quantity) {
    quantity = parseInt(suffixMatch[2], 10);
    cleaned = suffixMatch[1];
  }

  const temMatch = cleaned.match(/^(.+?)\s+(\d+)\s*ΤΕΜ\b$/i);
  if (temMatch && !quantity) {
    quantity = parseInt(temMatch[2], 10);
    cleaned = temMatch[1];
  }

  const unitMatch = cleaned.match(/\b(\d+)\s*(G|GR|ML|LT|KG|L)\b/i);
  if (unitMatch) {
    unit = unitMatch[2].toUpperCase();
  }

  return { quantity, unit, cleaned };
}

function extractDiscount(line: string): { discount: number | null; cleaned: string } {
  const ektwshMatch = line.match(/ΕΚΠΤΩΣΗ\s+(\d+[.,]\d{2})/i);
  if (ektwshMatch) {
    return { discount: parseDecimal(ektwshMatch[1]), cleaned: line.replace(/ΕΚΠΤΩΣΗ\s+\d+[.,]\d{2}/i, "").trim() };
  }

  const percentMatch = line.match(/(\d{1,2})\s*%/);
  if (percentMatch) {
    const percent = parseInt(percentMatch[1], 10);
    return { discount: percent / 100, cleaned: line.replace(/\d{1,2}\s*%/, "").trim() };
  }

  const minusMatch = line.match(/(\d+[.,]\d{2})\s*-\s*(\d+[.,]\d{2})/);
  if (minusMatch) {
    const price = parseDecimal(minusMatch[1]);
    const discountVal = parseDecimal(minusMatch[2]);
    if (discountVal < price) {
      return { discount: discountVal, cleaned: line.replace(/\d+[.,]\d{2}\s*-\s*\d+[.,]\d{2}/, minusMatch[1]).trim() };
    }
  }

  return { discount: null, cleaned: line };
}

function extractUnitPrice(line: string): { unitPrice: number | null; cleaned: string } {
  const match = line.match(/(\d+[.,]\d{2})\s*€\s*\/\s*(kg|g|l|ml)\b/i);
  if (match) {
    return { unitPrice: parseDecimal(match[1]), cleaned: line.replace(/\d+[.,]\d{2}\s*€\s*\/\s*(kg|g|l|ml)\b/i, "").trim() };
  }
  return { unitPrice: null, cleaned: line };
}

function calculateConfidence(
  name: string,
  price: number,
  line: string,
  ocrCorrected: boolean
): number {
  let confidence = 0.5;

  if (price >= 0.01 && price <= 200) confidence += 0.1;
  else confidence -= 0.2;

  if (name.length > 3) confidence += 0.1;

  if (/^[Α-ΩΆΈΉΊΌΎΏA-Za-z\s]+$/.test(name)) confidence += 0.1;

  const expectedPattern = /^.+\s+\d+[.,]\d{2}\s*$/;
  if (expectedPattern.test(line)) confidence += 0.1;

  if (ocrCorrected) confidence -= 0.1;

  return Math.max(0, Math.min(1, Math.round(confidence * 100) / 100));
}

function isMetaLine(upper: string): boolean {
  return META_SKIP.some(m => upper.includes(m));
}

function extractTotalFromLine(upper: string): number | null {
  const match = upper.match(/(?:ΣΥΝΟΛΟ|TOTAL|ΑΠΟΔΕΙΞΗ)[^\d]*(\d+[.,]\d{2})/);
  if (match) return parseDecimal(match[1]);
  return null;
}

function extractSubtotalFromLine(upper: string): number | null {
  const match = upper.match(/(?:ΥΠΟΣΥΝΟΛΟ|ΜΕΡΙΚΟ\s*ΣΥΝΟΛΟ)[^\d]*(\d+[.,]\d{2})/);
  if (match) return parseDecimal(match[1]);
  return null;
}

function extractVATFromLine(upper: string): number | null {
  const match = upper.match(/ΦΠΑ\s*\d{1,2}%[^\d]*(\d+[.,]\d{2})/);
  if (match) return parseDecimal(match[1]);
  return null;
}

export function parseGreekReceipt(text: string): ParsedReceipt {
  logParserEvent("parse_start", "unknown", 0, 0);
  try {
    const { chain, confidence: storeConfidence } = detectStore(text);
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const items: ParsedItem[] = [];
    let total: number | null = null;
    let subtotal: number | null = null;
    let vatAmount: number | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const upper = line.toUpperCase();

      if (isMetaLine(upper)) {
        const t = extractTotalFromLine(upper);
        if (t !== null) total = t;
        const st = extractSubtotalFromLine(upper);
        if (st !== null) subtotal = st;
        const vat = extractVATFromLine(upper);
        if (vat !== null) vatAmount = vat;
        continue;
      }

      let workingLine = line;
      const ocrCorrectedLine = correctOCRErrors(workingLine);
      const wasCorrected = ocrCorrectedLine !== workingLine;
      workingLine = ocrCorrectedLine;

      const { quantity, unit, cleaned: afterQty } = extractQuantity(workingLine);
      workingLine = afterQty;

      const { discount, cleaned: afterDiscount } = extractDiscount(workingLine);
      workingLine = afterDiscount;

      const { unitPrice, cleaned: afterUnitPrice } = extractUnitPrice(workingLine);
      workingLine = afterUnitPrice;

      const priceMatch = workingLine.match(/(\d+[.,]\d{2})\s*€?\s*$/);
      if (!priceMatch && i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const nextPriceMatch = nextLine.match(/^(\d+[.,]\d{2})\s*€?\s*$/);
        if (nextPriceMatch) {
          const name = workingLine.replace(/\s{2,}/g, " ").trim();
          const price = parseDecimal(nextPriceMatch[1]);
          if (name.length >= 2 && !isNaN(price) && price > 0 && price <= 500) {
            const confidence = calculateConfidence(name, price, workingLine + " " + nextLine, wasCorrected);
            items.push({ name, price, raw: line + " | " + nextLine, confidence, quantity, unit });
            i++;
            continue;
          }
        }
      }

      if (!priceMatch) continue;

      const price = parseDecimal(priceMatch[1]);
      const name = workingLine.replace(/\d+[.,]\d{2}\s*€?\s*$/, "").replace(/\s{2,}/g, " ").trim();

      if (!name || isNaN(price) || price <= 0 || price > 500) continue;
      if (name.length < 2) continue;

      const finalPrice = discount !== null && discount <= 1
        ? Math.round((price - price * discount) * 100) / 100
        : (discount !== null && discount > 1
            ? Math.round((price - discount) * 100) / 100
            : price);

      const confidence = calculateConfidence(name, finalPrice, workingLine, wasCorrected);
      items.push({ name, price: finalPrice, raw: line, confidence, quantity, unit });
    }

    if (total === null && items.length > 0) {
      total = Math.round(items.reduce((s, item) => s + item.price, 0) * 100) / 100;
    }

    const parseRatio = Math.min(1, items.length / Math.max(1, lines.length * 0.4));
    const confidence = Math.round(((parseRatio * 0.7 + storeConfidence * 0.3)) * 100) / 100;

    const result = { storeChain: chain, storeConfidence, items, total, subtotal, vatAmount, confidence };
    logParserEvent("parse_success", chain, items.length, confidence);
    return result;
  } catch (e) {
    logParserEvent("parse_failure", "unknown", 0, 0, (e as Error).message);
    throw e;
  }
}

export function cleanProductName(raw: string): string {
  return raw.toUpperCase()
    .replace(/\d+\s*(G|GR|ML|LT|KG|ΤΕΜ)\b/gi, "")
    .replace(/\s+[xX]\s*\d+$/i, "")
    .replace(/\s+\d+\s*ΤΕΜ\b/gi, "")
    .replace(/\d+[.,]\d{2}\s*€?\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
