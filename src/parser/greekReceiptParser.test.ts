import { describe, it, expect } from "vitest";
import { parseGreekReceipt, cleanProductName, detectStore } from "./greekReceiptParser";
describe("detectStore", () => {
  it("detects Sklavenitis", () => { expect(detectStore("ΣΚΛΑΒΕΝΙΤΗΣ ΧΑΛΑΝΔΡΙ").chain).toBe("Sklavenitis"); });
  it("detects Lidl", () => { expect(detectStore("LIDL HELLAS ΜΑΡΟΥΣΙ").chain).toBe("Lidl"); });
  it("detects Masoutis", () => { expect(detectStore("ΜΑΣΟΥΤΗΣ ΣΟΥΠΕΡ ΜΑΡΚΕΤ").chain).toBe("Masoutis"); });
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
