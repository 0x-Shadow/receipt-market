import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseDocument } from "./parseDocument";

const fixture = (name: string) =>
  readFileSync(join(__dirname, "fixtures", name), "utf8");

describe("parseDocument", () => {
  it("parses issuer, header and mark", () => {
    const r = parseDocument(fixture("synthetic-supermarket.xml"));
    expect(r.issuerVat).toBe("094014201");
    expect(r.issuerName).toBe("ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ");
    expect(r.issueDate).toBe("2026-09-27");
    expect(r.series).toBe("ΤΔΑ-1001");
    expect(r.aa).toBe("4821");
    expect(r.mark).toBe("400000123456789");
  });

  it("parses every line", () => {
    const r = parseDocument(fixture("synthetic-supermarket.xml"));
    expect(r.lines).toHaveLength(2);
    expect(r.lines[0].description).toBe("ΦΕΤΑ ΠΟΠ 400G");
    expect(r.lines[0].netValue).toBe(4.35);
    expect(r.lines[0].vatCategory).toBe(1);
    expect(r.lines[0].itemCode).toBe("5901234123456");
  });

  it("does not read a lineBarcode field that does not exist", () => {
    const r = parseDocument(fixture("synthetic-supermarket.xml"));
    expect(r.lines[0]).not.toHaveProperty("lineBarcode");
  });

  it("falls back to itemDescr when lineComments is absent", () => {
    const xml = fixture("synthetic-supermarket.xml").replace(
      /<lineComments>ΦΕΤΑ ΠΟΠ 400G<\/lineComments>/,
      "<itemDescr>ΦΕΤΑ ΕΙΔΙΚΟΥ ΦΟΡΟΥ</itemDescr>",
    );
    const r = parseDocument(xml);
    expect(r.lines[0].description).toBe("ΦΕΤΑ ΕΙΔΙΚΟΥ ΦΟΡΟΥ");
  });

  it("accepts a document whose line array is named invoiceLines", () => {
    const alt = fixture("synthetic-supermarket.xml").replace(
      /invoiceDetails/g,
      "invoiceLines",
    );
    const r = parseDocument(alt);
    expect(r.lines).toHaveLength(2);
  });

  it("throws on a document with no lines", () => {
    expect(() => parseDocument("<InvoicesDoc><invoice/></InvoicesDoc>")).toThrow();
  });

  it("throws on unparseable input", () => {
    expect(() => parseDocument("not xml at all <<<")).toThrow();
  });
});
