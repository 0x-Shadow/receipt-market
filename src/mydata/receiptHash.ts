import type { MyDataReceipt } from "./types";

export async function receiptHash(r: MyDataReceipt): Promise<string> {
  const material = [r.issuerVat, r.issueDate, r.series, r.aa, r.mark ?? ""].join("|");
  const bytes = new TextEncoder().encode(material);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
