import { describe, it, expect } from "vitest";
import { parseGreekReceipt } from "./greekReceiptParser";
describe("scan mapping", () => {
  it("maps parsed items to DB insert shape", () => {
    const r = parseGreekReceipt("ΣΚΛΑΒΕΝΙΤΗΣ\nΦΕΤΑ 400G 4,89\nΣΥΝΟΛΟ 4,89");
    const rows = r.items.map(i => ({ product_name: i.name, price: i.price, store_chain: r.storeChain }));
    expect(rows).toEqual([{ product_name: "ΦΕΤΑ 400G", price: 4.89, store_chain: "Sklavenitis" }]);
  });
});
