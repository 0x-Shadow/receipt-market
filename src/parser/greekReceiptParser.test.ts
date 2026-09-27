import { describe, it, expect } from "vitest";
import { parseGreekReceipt, cleanProductName, detectStore, levenshtein } from "./greekReceiptParser";
import { fixtures } from "./fixtures";

function normalize(s: string): string {
  return s.toUpperCase().replace(/\s+/g, " ").trim();
}

function fuzzyMatch(expectedName: string, parsedName: string): boolean {
  const e = normalize(expectedName);
  const p = normalize(parsedName);
  if (p.includes(e) || e.includes(p)) return true;
  return levenshtein(e, p) <= Math.max(1, Math.floor(e.length * 0.2));
}

describe("detectStore", () => {
  it("detects Sklavenitis", () => { expect(detectStore("ΣΚΛΑΒΕΝΙΤΗΣ ΧΑΛΑΝΔΡΙ").chain).toBe("Sklavenitis"); });
  it("detects Lidl", () => { expect(detectStore("LIDL HELLAS ΜΑΡΟΥΣΙ").chain).toBe("Lidl"); });
  it("detects Masoutis", () => { expect(detectStore("ΜΑΣΟΥΤΗΣ ΣΟΥΠΕΡ ΜΑΡΚΕΤ").chain).toBe("Masoutis"); });
  it("detects AB", () => { expect(detectStore("ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ").chain).toBe("AB"); });
  it("detects My Market", () => { expect(detectStore("MY MARKET ΑΘΗΝΑ").chain).toBe("My Market"); });
});

describe("parseGreekReceipt", () => {
  it("parses Sklavenitis lines with comma decimals", () => {
    const r = parseGreekReceipt("ΣΚΛΑΒΕΝΙΤΗΣ\nΦΕΤΑ ΠΟΠ 400G 4,89\nΓΑΛΑ 1L 1,89\nΣΥΝΟΛΟ 6,78");
    expect(r.storeChain).toBe("Sklavenitis");
    expect(r.items).toHaveLength(2);
    expect(r.items[0]).toMatchObject({ name: "ΦΕΤΑ ΠΟΠ 400G", price: 4.89 });
    expect(r.total).toBeCloseTo(6.78);
    expect(r.confidence).toBeGreaterThan(0.6);
  });
  it("ignores ΦΠΑ meta lines", () => {
    const r = parseGreekReceipt("LIDL\nΜΠΑΝΑΝΕΣ 1KG 1,29\nΦΠΑ ΠΕΡΙΛΑΜΒΑΝΕΤΑΙ\nTOTAL 1,29");
    expect(r.items).toHaveLength(1);
    expect(r.items[0].price).toBe(1.29);
  });
  it("returns low confidence on garbage", () => {
    const r = parseGreekReceipt("hello blurry\nno prices here");
    expect(r.items).toHaveLength(0);
    expect(r.confidence).toBeLessThan(0.6);
  });
});

describe("cleanProductName", () => {
  it("strips weight", () => { expect(cleanProductName("ΦΕΤΑ 400G")).toBe("ΦΕΤΑ"); });
});

describe("fixture-based tests", () => {
  describe("store detection accuracy", () => {
    for (const fx of fixtures) {
      it(`detects correct store for: ${fx.name}`, () => {
        const r = parseGreekReceipt(fx.input);
        expect(r.storeChain).toBe(fx.expected.storeChain);
      });
    }
  });

  describe("item count matches expected", () => {
    for (const fx of fixtures) {
      it(`parses correct item count for: ${fx.name}`, () => {
        const r = parseGreekReceipt(fx.input);
        expect(r.items).toHaveLength(fx.expected.itemCount);
      });
    }
  });

  describe("total matches expected", () => {
    for (const fx of fixtures) {
      if (fx.expected.total === undefined || fx.expected.total === null) continue;
      it(`extracts correct total for: ${fx.name}`, () => {
        const r = parseGreekReceipt(fx.input);
        expect(r.total).not.toBeNull();
        expect(r.total!).toBeCloseTo(fx.expected.total!, 2);
      });
    }
  });

  describe("each expected item is found (fuzzy match)", () => {
    for (const fx of fixtures) {
      for (const expectedItem of fx.expected.items) {
        it(`finds item "${expectedItem.name}" in: ${fx.name}`, () => {
          const r = parseGreekReceipt(fx.input);
          const found = r.items.some(
            (parsed) => fuzzyMatch(expectedItem.name, parsed.name) && Math.abs(parsed.price - expectedItem.price) < 0.005
          );
          expect(found).toBe(true);
        });
      }
    }
  });

  describe("overall confidence is reasonable", () => {
    for (const fx of fixtures) {
      it(`confidence > 0.3 for: ${fx.name}`, () => {
        const r = parseGreekReceipt(fx.input);
        expect(r.confidence).toBeGreaterThan(0.3);
      });
    }
  });

  describe("OCR error correction works", () => {
    it("parses items with 0/O confusion", () => {
      const r = parseGreekReceipt(fixtures.find((f) => f.name.includes("OCR"))!.input);
      expect(r.items).toHaveLength(2);
      expect(r.items[0].price).toBe(4.89);
      expect(r.items[1].price).toBe(1.89);
    });
  });

  describe("unit price handling works", () => {
    it("parses €/kg prices correctly", () => {
      const r = parseGreekReceipt(fixtures.find((f) => f.name.includes("€/kg"))!.input);
      expect(r.items).toHaveLength(2);
      expect(r.items[0].price).toBe(12.5);
      expect(r.items[1].price).toBe(2.19);
    });
  });

  describe("quantity parsing works", () => {
    it("parses lines with 2x multiplier", () => {
      const r = parseGreekReceipt(fixtures.find((f) => f.name.includes("quantity multipliers"))!.input);
      expect(r.items).toHaveLength(3);
      const qtyItem = r.items.find((i) => i.quantity === 2);
      expect(qtyItem).toBeDefined();
      expect(qtyItem!.price).toBe(2.58);
    });
  });

  describe("discount detection works", () => {
    it("detects ΕΚΠΤΩΣΗ discount line", () => {
      const r = parseGreekReceipt(fixtures.find((f) => f.name === "ΕΚΠΤΩΣΗ discount keyword")!.input);
      const discountItem = r.items.find((i) => normalize(i.name).includes("ΕΚΠΤΩΣΗ"));
      expect(discountItem).toBeDefined();
      expect(discountItem!.price).toBe(0.5);
    });
    it("detects percentage discount line", () => {
      const r = parseGreekReceipt(fixtures.find((f) => f.name === "Percentage discount")!.input);
      const discountItem = r.items.find((i) => normalize(i.name).includes("ΕΚΠΤΩΣΗ"));
      expect(discountItem).toBeDefined();
      expect(discountItem!.price).toBe(0.12);
    });
  });

  describe("multi-line product handling works", () => {
    it("parses product name on separate line from price", () => {
      const r = parseGreekReceipt(fixtures.find((f) => f.name.includes("Multi-line"))!.input);
      expect(r.items).toHaveLength(2);
      const found = r.items.some((i) => fuzzyMatch("ΨΗΤΟ ΟΛΟΚΛΗΡΟ", i.name) && i.price === 8.99);
      expect(found).toBe(true);
    });
  });

  describe("VAT/subtotal/total extraction works", () => {
    it("skips ΦΠΑ and ΥΠΟΣΥΝΟΛΟ lines", () => {
      const r = parseGreekReceipt(fixtures.find((f) => f.name.includes("VAT"))!.input);
      expect(r.items).toHaveLength(2);
      const hasVatLine = r.items.some((i) => normalize(i.name).includes("ΦΠΑ"));
      expect(hasVatLine).toBe(false);
    });
    it("extracts final total not subtotal", () => {
      const r = parseGreekReceipt(fixtures.find((f) => f.name.includes("VAT"))!.input);
      expect(r.total).toBeCloseTo(3.53, 2);
    });
    it("skips ΡΕΣΤΑ and ΜΕΤΡΗΤΑ lines", () => {
      const r = parseGreekReceipt(fixtures.find((f) => f.name.includes("ΡΕΣΤΑ"))!.input);
      expect(r.items).toHaveLength(2);
      const hasResta = r.items.some((i) => normalize(i.name).includes("ΡΕΣΤΑ") || normalize(i.name).includes("ΜΕΤΡΗΤΑ"));
      expect(hasResta).toBe(false);
    });
  });
});
