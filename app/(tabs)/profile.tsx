import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Switch, StyleSheet, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { supabase, useAuth, signOut } from "../../src/lib/supabase";
import { C, Group, RowSeparator, ListRow, StatCard, Skeleton } from "../../src/components/Apple";

let Notifications: any = null;
try { Notifications = require("expo-notifications"); } catch { Notifications = null; }

type Stats = { receipts: number; watched: number; savings: number } | null;

function formatEuro(n: number) {
  return n.toFixed(2).replace(".", ",") + "€";
}

export default function Profile() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [notifs, setNotifs] = useState(false);

  const fetchStats = useCallback(async (userId: string) => {
    if (!supabase) return;
    setStatsLoading(true);
    try {
      const [receiptsRes, watchlistRes] = await Promise.all([
        supabase.from("receipts").select("*", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("watchlist").select("product_id", { count: "exact" }).eq("user_id", userId),
      ]);
      const productIds = (watchlistRes.data ?? []).map((r: any) => r.product_id);
      let savings = 0;
      if (productIds.length > 0) {
        const { data: prices } = await supabase
          .from("prices")
          .select("product_id, price")
          .in("product_id", productIds);
        const byProduct = new Map<string, number[]>();
        for (const p of prices ?? []) {
          const arr = byProduct.get(p.product_id) ?? [];
          arr.push(Number(p.price));
          byProduct.set(p.product_id, arr);
        }
        for (const vals of byProduct.values()) {
          const drop = Math.max(...vals) - Math.min(...vals);
          if (drop > 0) savings += drop;
        }
      }
      setStats({ receipts: receiptsRes.count ?? 0, watched: productIds.length, savings });
    } catch {
      setStats({ receipts: 0, watched: 0, savings: 0 });
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && supabase) fetchStats(user.id);
    else setStats(null);
  }, [user, fetchStats]);

  useEffect(() => {
    if (!Notifications) return;
    Notifications.getPermissionsAsync().then(({ status }: any) => setNotifs(status === "granted"));
  }, []);

  async function onToggleNotifs(v: boolean) {
    Haptics.selectionAsync();
    if (!v) {
      setNotifs(false);
      Linking.openSettings();
      return;
    }
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === "granted") setNotifs(true);
    else {
      setNotifs(false);
      Linking.openSettings();
    }
  }

  async function handleLogout() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signOut();
    router.replace("/login");
  }

  const meta = (user?.user_metadata ?? {}) as Record<string, any>;
  const displayName = meta.full_name || meta.name || user?.email || "";
  const initial = (displayName || "?").charAt(0).toUpperCase();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={{ marginTop: 56, marginBottom: 20 }}>
        <Text style={{ fontSize: 34, fontWeight: "800", letterSpacing: -0.5 }}>Προφίλ</Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.tint, alignItems: "center", justifyContent: "center" }}>
          {authLoading ? (
            <Skeleton style={{ width: 30, height: 14 }} />
          ) : (
            <Text style={{ fontSize: 24, fontWeight: "700", color: "#fff" }}>{initial}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          {authLoading ? (
            <>
              <Skeleton style={{ width: 120, height: 16 }} />
              <Skeleton style={{ width: 160, height: 12, marginTop: 6 }} />
            </>
          ) : (
            <>
              <Text style={{ fontSize: 18, fontWeight: "700" }}>{displayName}</Text>
              <Text style={{ fontSize: 13.5, color: C.sub, marginTop: 1 }} numberOfLines={1}>
                {user?.email ?? "Χωρίς σύνδεση"}
              </Text>
            </>
          )}
        </View>
        <Ionicons name="chevron-forward" size={17} color={C.ter} />
      </View>

      {!user && !authLoading && (
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/login"); }}
          style={{ backgroundColor: C.tint, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginBottom: 22 }}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Συνδέσου</Text>
        </Pressable>
      )}

      {user && (
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 26 }}>
          {statsLoading || !stats ? (
            <>
              {["Αποδείξεις", "Προϊόντα", "Εξοικονόμηση"].map((l) => (
                <View
                  key={l}
                  style={{ flex: 1, backgroundColor: C.card, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 12, alignItems: "center" }}
                >
                  <Skeleton style={{ width: 44, height: 22 }} />
                  <Text style={{ fontSize: 12, color: C.sub, marginTop: 6, fontWeight: "500" }}>{l}</Text>
                </View>
              ))}
            </>
          ) : (
            <>
              <StatCard value={String(stats.receipts)} label="Αποδείξεις" />
              <StatCard value={String(stats.watched)} label="Προϊόντα" />
              <StatCard value={formatEuro(stats.savings)} label="Εξοικονόμηση" accent={C.green} />
            </>
          )}
        </View>
      )}

      <Text style={styles.groupLabel}>Ρυθμίσεις</Text>
      <Group>
        <ListRow
          icon="notifications"
          iconBg={C.red}
          title="Ειδοποιήσεις"
          subtitle="Push όταν πέσει μια τιμή"
          chevron={false}
          right={
            <Switch
              value={notifs}
              onValueChange={onToggleNotifs}
              trackColor={{ false: "#E5E5EA", true: C.green }}
              thumbColor="#fff"
            />
          }
        />
        <RowSeparator />
        <ListRow icon="language" iconBg={C.tint} title="Γλώσσα" subtitle="Ελληνικά" />
      </Group>

      <Text style={[styles.groupLabel, { marginTop: 26 }]}>Άλλα</Text>
      <Group>
        <ListRow icon="help-buoy" iconBg={C.orange} title="Βοήθεια & Σχόλια" />
        <RowSeparator />
        <ListRow icon="star" iconBg="#FFCC00" title="Βαθμολογήστε το app" />
        <RowSeparator />
        <ListRow icon="information-circle" iconBg={C.sub} title="Σχετικά" subtitle="Έκδοση 0.1.0" />
      </Group>

      {user && (
        <View style={{ marginTop: 26 }}>
          <Group>
            <Pressable
              onPress={handleLogout}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, paddingHorizontal: 16, minHeight: 52 }}
            >
              <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: C.red, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="log-out" size={17} color="#fff" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "500", color: C.red }}>Αποσύνδεση</Text>
            </Pressable>
          </Group>
        </View>
      )}

      <Text style={{ textAlign: "center", color: C.ter, fontSize: 12.5, marginTop: 30 }}>
        receipt-market · φτιαγμένο στην Ελλάδα 🇬🇷
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  groupLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: C.sub,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 16,
    marginBottom: 8,
  },
});
