import { describe, it, expect } from "vitest";
import { enqueueReceipt, drainQueue } from "./queue";
describe("queue", () => {
  it("enqueues and drains", () => {
    enqueueReceipt({ store: "Lidl" });
    expect(drainQueue()).toHaveLength(1);
    expect(drainQueue()).toHaveLength(0);
  });
});
