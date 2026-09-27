// src/lib/notifications.test.ts
import { describe, it, expect, vi } from "vitest";
// Mocks required for Node vitest: expo-notifications contains RN/Flow syntax
// that Vite cannot parse, and ./supabase throws without real env credentials.
// Plan test block below remains verbatim.
vi.mock("expo-notifications", () => ({
  requestPermissionsAsync: async () => ({ status: "granted" }),
  getExpoPushTokenAsync: async () => ({ data: "ExponentPushToken[fake]" }),
}));
vi.mock("./supabase", () => ({
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) }, from: () => ({ upsert: async () => ({ data: null, error: null }) }) },
}));
import { formatDrop } from "./notifications";
describe("formatDrop", () => {
  it("formats Greek push body", () => {
    expect(formatDrop("ΦΕΤΑ ΠΟΠ 400G", 2.19, 2.49, "Lidl")).toBe("🔻 ΦΕΤΑ ΠΟΠ 400G: 2,19€ στο Lidl (ήταν 2,49€)");
  });
});
