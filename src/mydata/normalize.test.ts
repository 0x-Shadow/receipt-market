import { describe, it, expect } from "vitest";
import { normalizeDescription, canonicalTokens } from "./normalize";

describe("normalizeDescription", () => {
  it("strips case, accents and punctuation", () => {
    expect(normalizeDescription("ΦΕΤΑ ΠΟΠ 400G")).toBe("φετα ποπ 400 g");
  });

  it("splits a unit glued to its quantity so pack sizes compare", () => {
    expect(normalizeDescription("ΦΕΤΑ ΠΟΠ 400G")).toBe(
      normalizeDescription("ΦΕΤΑ ΠΟΠ 400 ΓΡ"),
    );
  });

  it("canonicalizes greek unit abbreviations", () => {
    expect(normalizeDescription("ΓΑΛΑ 1L")).toBe(normalizeDescription("ΓΑΛΑ 1 ΛΙΤΡΟ"));
  });

  it("removes common retail noise", () => {
    expect(normalizeDescription("ΝΤΟΜΑΤΕΣ 1KG  ΑΒ")).toBe(
      normalizeDescription("ΝΤΟΜΑΤΕΣ 1 KG"),
    );
  });

  it("keeps pack sizes distinct", () => {
    expect(normalizeDescription("ΓΑΛΑ 1L")).not.toBe(normalizeDescription("ΓΑΛΑ 2L"));
  });
});

describe("canonicalTokens", () => {
  it("sorts tokens so word order does not matter", () => {
    expect(canonicalTokens("ΦΕΤΑ ΠΟΠ")).toBe(canonicalTokens("ΠΟΠ ΦΕΤΑ"));
  });

  it("distinguishes different products", () => {
    expect(canonicalTokens("ΓΑΛΑ 1L")).not.toBe(canonicalTokens("ΓΑΛΑ 2L"));
  });
});
