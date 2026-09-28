import { describe, it, expect } from "vitest";
import { vatRateFor, isVatConsistent } from "./vat";

describe("vatRateFor", () => {
  it("maps standard Greek VAT categories to rates", () => {
    expect(vatRateFor(1)).toBe(13);
    expect(vatRateFor(2)).toBe(9);
    expect(vatRateFor(3)).toBe(5);
    expect(vatRateFor(5)).toBe(4);
  });

  it("treats exempt categories as zero-rated", () => {
    expect(vatRateFor(4)).toBe(0);
    expect(vatRateFor(6)).toBe(0);
    expect(vatRateFor(7)).toBe(0);
    expect(vatRateFor(8)).toBe(0);
  });

  it("returns null for an unknown category rather than guessing", () => {
    expect(vatRateFor(99)).toBeNull();
  });

  it("does not inherit from Object.prototype", () => {
    expect(vatRateFor(0)).toBeNull();
  });
});

describe("isVatConsistent", () => {
  it("accepts a 13% line", () => {
    expect(isVatConsistent(1, 4.35, 0.57)).toBe(true);
  });

  it("rejects a 13% line whose vatAmount does not match", () => {
    expect(isVatConsistent(1, 4.35, 0.9)).toBe(false);
  });

  it("accepts a zero-rated line with no tax", () => {
    expect(isVatConsistent(7, 12.0, 0)).toBe(true);
  });

  it("rejects a zero-rated line that claims tax", () => {
    expect(isVatConsistent(7, 12.0, 1.5)).toBe(false);
  });

  it("rejects an unknown category", () => {
    expect(isVatConsistent(99, 10, 1.3)).toBe(false);
  });
});
