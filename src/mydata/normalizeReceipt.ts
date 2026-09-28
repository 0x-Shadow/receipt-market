import { canonicalTokens } from "./normalize";
import { isVatConsistent, vatRateFor } from "./vat";
import { UNIT_LABEL } from "./parseDocument";
import type { MyDataReceipt, NormalizedRow } from "./types";

export function normalizeReceipt(r: MyDataReceipt): NormalizedRow[] {
  const rows: NormalizedRow[] = [];
  const chain = r.issuerName.trim();

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
      chain,
    });
  }

  return rows;
}
