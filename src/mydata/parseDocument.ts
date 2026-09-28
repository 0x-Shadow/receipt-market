import { XMLParser } from "fast-xml-parser";
import type { MyDataLine, MyDataReceipt } from "./types";

export const UNIT_LABEL: Record<number, string> = { 1: "pcs", 2: "kg", 3: "lt" };

const asArray = <T,>(v: T | T[] | undefined | null): T[] =>
  v === undefined || v === null ? [] : Array.isArray(v) ? v : [v];

const asString = (v: unknown): string | null => {
  if (v === undefined || v === null) return null;
  if (typeof v === "object" && "#text" in (v as Record<string, unknown>)) {
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
    trimValues: true,
  });

  const doc = parser.parse(xml) as Record<string, any>;

  const invoices = asArray<Record<string, any>>(doc?.InvoicesDoc?.invoice);
  if (invoices.length === 0) {
    throw new Error("myDATA: no invoice element found");
  }

  const inv = invoices[0];
  const rawLines = asArray<Record<string, any>>(
    inv?.invoiceDetails ?? inv?.invoiceLines,
  );
  if (rawLines.length === 0) {
    throw new Error("myDATA: no invoice line items found");
  }

  const lines: MyDataLine[] = rawLines.map((r) => ({
    lineNumber: asNumber(r.lineNumber, 0),
    description: asString(r.lineComments) ?? asString(r.itemDescr) ?? "",
    netValue: asNumber(r.netValue, 0),
    quantity: asNumber(r.quantity, 1),
    vatCategory: asNumber(r.vatCategory, 8),
    vatAmount: asNumber(r.vatAmount, 0),
    itemCode: asString(r.itemCode),
    taricNo: asString(r.TaricNo),
    measurementUnit:
      r.measurementUnit === undefined ? null : asNumber(r.measurementUnit, 1),
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
