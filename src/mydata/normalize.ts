const UNIT_MAP: Record<string, string> = {
  l: "l", lt: "l", lit: "l", λ: "l", λιτρο: "l", λιτρα: "l", λίτρο: "l", λίτρα: "l",
  kg: "kg", κιλο: "kg", κιλά: "kg", κιλό: "kg", κιλ: "kg",
  g: "g", gr: "g", γρ: "g", γραμ: "g", γραμμ: "g", γραμματια: "g", γραμμάτια: "g",
  ml: "ml", χιλ: "ml",
  pcs: "pcs", τεμ: "pcs", τεμάχια: "pcs", τεμάχιο: "pcs", τμχ: "pcs",
};

const NOISE = new Set([
  "αβ", "αββα", "αββας", "βασιλοπουλος", "βασιλοπουλου",
  "λιδλ", "σκλαβενιτης", "σκλαβενίτης",
  "masoutis", "mymarket", "k-market", "kmarket",
  "the", "και", "το", "του", "της", "με", "απο",
]);

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const QTY_UNIT = /^(\d+(?:[.,]\d+)?)([^\W\d_]+)$/u;

function canonicalToken(token: string): string[] {
  const m = QTY_UNIT.exec(token);
  if (m) {
    return [m[1].replace(",", "."), UNIT_MAP[m[2]] ?? m[2]];
  }
  return [UNIT_MAP[token] ?? token];
}

export function normalizeDescription(input: string): string {
  return stripAccents(input)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.]/gu, " ")
    .replace(/\./g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .flatMap(canonicalToken)
    .filter((t) => !NOISE.has(t))
    .join(" ");
}

export function canonicalTokens(input: string): string {
  return normalizeDescription(input).split(" ").filter(Boolean).sort().join(" ");
}
