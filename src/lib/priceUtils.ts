export function getFreshnessLabel(dateStr: string): { label: string; color: string } {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 7) return { label: "Φρέσκο", color: "#34C759" };
  if (diffDays <= 30) return { label: "Παλαιότερο", color: "#FF9500" };
  return { label: "Παλιό", color: "#FF3B30" };
}

export function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "πριν λίγο";
  if (diffMinutes < 60) return `πριν ${diffMinutes} λεπτά`;
  if (diffHours < 24) return `πριν ${diffHours} ώρες`;
  if (diffDays < 7) return `πριν ${diffDays} ημέρες`;
  if (diffDays < 30) return `πριν ${Math.floor(diffDays / 7)} εβδομάδες`;
  return `πριν ${Math.floor(diffDays / 30)} μήνες`;
}

export function isDuplicatePrice(
  existingPrices: { product_id: string; store_id: string; price: number; created_at: string }[],
  newPrice: { product_id: string; store_id: string; price: number }
): boolean {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  return existingPrices.some(
    p =>
      p.product_id === newPrice.product_id &&
      p.store_id === newPrice.store_id &&
      p.price === newPrice.price &&
      new Date(p.created_at) >= twentyFourHoursAgo
  );
}

export function deduplicatePrices(
  prices: { product_id: string; store_id: string; price: number; created_at: string }[]
): typeof prices {
  const seen = new Map<string, (typeof prices)[0]>();

  for (const p of prices) {
    const key = `${p.product_id}:${p.store_id}:${p.price}`;
    const existing = seen.get(key);
    if (!existing || new Date(p.created_at) > new Date(existing.created_at)) {
      seen.set(key, p);
    }
  }

  return Array.from(seen.values());
}
