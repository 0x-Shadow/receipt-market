import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { receiptHash } from "./receiptHash";
import { normalizeReceipt } from "./normalizeReceipt";
import { parseDocument } from "./parseDocument";

const xml = readFileSync(
  join(__dirname, "fixtures", "synthetic-supermarket.xml"),
  "utf8",
);

describe("receiptHash", () => {
  it("is a hex sha256", async () => {
    await expect(receiptHash(parseDocument(xml))).resolves.toMatch(/^[0-9a-f]{64}$/);
  });

  it("is stable for the same document", async () => {
    const a = await receiptHash(parseDocument(xml));
    const b = await receiptHash(parseDocument(xml));
    expect(a).toBe(b);
  });

  it("changes when the receipt changes", async () => {
    const a = await receiptHash(parseDocument(xml));
    const b = await receiptHash(parseDocument(xml.replace("4821", "4822")));
    expect(a).not.toBe(b);
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
    expect(rows[0].nameNormalized).toBe("400 g ποπ φετα");
  });

  it("drops lines whose vat arithmetic does not check out", () => {
    const bad = xml.replace(
      "<vatAmount>0.57</vatAmount>",
      "<vatAmount>9.99</vatAmount>",
    );
    expect(normalizeReceipt(parseDocument(bad))).toHaveLength(1);
  });

  it("drops lines with no usable price", () => {
    const bad = xml.replace("<netValue>4.35</netValue>", "<netValue>0</netValue>");
    expect(normalizeReceipt(parseDocument(bad)).every((r) => r.price > 0)).toBe(true);
  });

  it("never emits a consumer identifier", () => {
    const json = JSON.stringify(rows);
    expect(json).not.toContain("999999999");
    expect(json).not.toContain("ΑΝΩΝΥΜΟΣ");
  });
});
