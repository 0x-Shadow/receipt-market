import { describe, it, expect } from "vitest";
function filterItems(items: {name_el: string; category: string}[], q: string, cat: string) {
  return items.filter(i => (cat === "Όλα" || i.category === cat) && i.name_el.toLowerCase().includes(q.toLowerCase()));
}
describe("home filter", () => {
  it("filters by query + category", () => {
    const items = [{name_el: "ΦΕΤΑ ΠΟΠ", category: "Γαλακτοκομικά"}, {name_el: "ΜΠΑΝΑΝΕΣ", category: "Φρούτα & Λαχανικά"}];
    expect(filterItems(items, "φετα", "Όλα")).toHaveLength(1);
    expect(filterItems(items, "", "Γαλακτοκομικά")).toHaveLength(1);
  });
});
