import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { supabase } from "../../src/lib/supabase";
import {
  C,
  EmojiTile,
  PriceBadge,
  Skeleton,
  EmptyState,
  PriceChart,
  StatCard,
} from "../../src/components/Apple";

type PricePoint = {
  date: string;
  price: number;
  store: string | null;
};

type WatchItem = {
  watchId: string;
  productId: string;
  name: string;
  category: string;
  emoji: string;
  targetPrice: number | null;
  addedAt: string;
  currentPrice: number | null;
  previousPrice: number | null;
  storeName: string | null;
  history: PricePoint[];
};

type FilterKey = "all" | "deals" | "watching";

const T = {
  bg: "#F7F8FA",
  card: "#FFFFFF",
  ink: "#1A2233",
  sub: "#6B7280",
  faint: "#9CA3AF",
  accent: "#0A84FF",
  green: "#1F8A4C",
  greenBg: "#E8F9EE",
  red: "#E5484D",
  redBg: "#FDECEC",
  border: "#EDF0F4",
  thumb: "#F5F7FA",
};

const eur = (n: number) => `${n.toFixed(2)}€`;

async function fetchWatchlist(): Promise<WatchItem[]> {
  if (!supabase) return [];
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: rows, error } = await supabase
    .from("watchlist")
    .select("id, product_id, target_price, created_at, products(id, name_el, category, emoji)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !rows || rows.length === 0) return [];

  const productIds = [...new Set(rows.map((r: any) => r.product_id))];
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: priceRows } = await supabase
    .from("prices")
    .select("product_id, price, created_at, stores(chain)")
    .in("product_id", productIds)
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  const byProduct = new Map<string, PricePoint[]>();
  for (const p of priceRows ?? []) {
    const stores: any = p.stores;
    const list = byProduct.get(p.product_id) ?? [];
    list.push({
      date: p.created_at,
      price: Number(p.price),
      store: Array.isArray(stores) ? stores[0]?.chain ?? null : stores?.chain ?? null,
    });
    byProduct.set(p.product_id, list);
  }

  return rows.map((r: any) => {
    const history = byProduct.get(r.product_id) ?? [];
    const latest = history[history.length - 1];
    const prev = history.length > 1 ? history[history.length - 2] : null;
    return {
      watchId: r.id,
      productId: r.product_id,
      name: r.products?.name_el ?? "—",
      category: r.products?.category ?? "",
      emoji: r.products?.emoji ?? "🛒",
      targetPrice: r.target_price != null ? Number(r.target_price) : null,
      addedAt: r.created_at,
      currentPrice: latest ? latest.price : null,
      previousPrice: prev ? prev.price : null,
      storeName: latest?.store ?? null,
      history,
    };
  });
}

function SkeletonGroup() {
  return (
    <View style={{ marginTop: 14, gap: 10 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.skelCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Skeleton style={{ width: 48, height: 48, borderRadius: 12 }} />
            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton style={{ height: 14, width: "55%", borderRadius: 6 }} />
              <Skeleton style={{ height: 11, width: "35%", borderRadius: 6 }} />
            </View>
            <Skeleton style={{ height: 24, width: 64, borderRadius: 8 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

function WatchCard({
  item,
  expanded,
  onToggleExpand,
  onToggleWatch,
}: {
  item: WatchItem;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleWatch: () => void;
}) {
  const change =
    item.currentPrice != null && item.previousPrice != null
      ? item.currentPrice - item.previousPrice
      : null;
  const isDeal =
    item.currentPrice != null && item.previousPrice != null && item.currentPrice < item.previousPrice;
  const pct =
    isDeal && item.currentPrice != null && item.previousPrice != null && item.previousPrice > 0
      ? Math.round(((item.previousPrice - item.currentPrice) / item.previousPrice) * 100)
      : null;
  const hitTarget =
    item.targetPrice != null && item.currentPrice != null && item.currentPrice <= item.targetPrice;
  const added = new Date(item.addedAt).toLocaleDateString("el-GR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const subtitle =
    item.targetPrice != null
      ? `${item.storeName ?? "—"} · στόχος ${eur(item.targetPrice)}`
      : `${item.storeName ?? "—"}`;

  return (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Pressable
          onPress={onToggleExpand}
          style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 2 }}
        >
          <View style={styles.thumb}>
            <Text style={{ fontSize: 24 }}>{item.emoji}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={styles.name}>
              {item.name}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
              <View style={styles.dot} />
              <Text numberOfLines={1} style={styles.subLine}>
                {subtitle}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end", gap: 6 }}>
            <Text style={styles.price}>
              {item.currentPrice != null ? eur(item.currentPrice) : "—"}
            </Text>
            {pct != null ? (
              <View style={styles.dealBadge}>
                <Text style={styles.dealText}>-{pct}%</Text>
              </View>
            ) : null}
          </View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={T.faint}
            style={{ transform: [{ rotate: expanded ? "90deg" : "0deg" }] }}
          />
        </Pressable>
        <Pressable onPress={onToggleWatch} hitSlop={12} style={styles.heart}>
          <Ionicons name="heart" size={18} color={T.red} />
        </Pressable>
      </View>

      {expanded && (
        <View style={styles.expanded}>
          <View style={styles.chartBox}>
            {item.history.length > 1 ? (
              <PriceChart data={item.history.map((h) => ({ date: h.date, price: h.price }))} />
            ) : (
              <Text style={{ fontSize: 13, color: T.sub }}>
                Δεν υπάρχουν αρκετές πρόσφατες τιμές για γράφημα.
              </Text>
            )}
          </View>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {item.currentPrice != null ? eur(item.currentPrice) : "—"}
              </Text>
              <Text style={styles.statLabel}>Τιμή</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {item.targetPrice != null ? eur(item.targetPrice) : "—"}
              </Text>
              <Text style={styles.statLabel}>Στόχος</Text>
            </View>
            <View style={styles.stat}>
              <Text
                style={[
                  styles.statValue,
                  {
                    color:
                      change == null ? T.ink : change < 0 ? T.green : change > 0 ? T.red : T.ink,
                  },
                ]}
              >
                {change != null ? `${change > 0 ? "+" : "−"}${eur(Math.abs(change))}` : "—"}
              </Text>
              <Text style={styles.statLabel}>Μεταβολή</Text>
            </View>
          </View>
          {hitTarget && (
            <View style={styles.hit}>
              <Ionicons name="checkmark-circle" size={16} color={T.green} />
              <Text style={{ fontSize: 13, color: T.green, fontWeight: "700", flex: 1 }}>
                Η τιμή έφτασε τον στόχο σου!
              </Text>
            </View>
          )}
          <Text style={{ marginTop: 12, fontSize: 12, color: T.faint }}>
            Προστέθηκε στις {added}
            {item.category ? ` · ${item.category}` : ""}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function Watchlist() {
  const router = useRouter();
  const [items, setItems] = useState<WatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await fetchWatchlist();
      setItems(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleWatch(item: WatchItem) {
    if (!supabase) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems((prev) => prev.filter((i) => i.watchId !== item.watchId));
    const { error } = await supabase.from("watchlist").delete().eq("id", item.watchId);
    if (error) load();
  }

  const filtered =
    filter === "deals"
      ? items.filter(
          (i) => i.currentPrice != null && i.previousPrice != null && i.currentPrice < i.previousPrice
        )
      : items;

  const chips: { key: FilterKey; label: string }[] = [
    { key: "all", label: "Όλα" },
    { key: "deals", label: "Προσφορές" },
    { key: "watching", label: "Παρακολούθηση" },
  ];

  void C;
  void EmojiTile;
  void PriceBadge;
  void StatCard;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: T.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 130, flexGrow: 1 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={T.sub} />
      }
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Η λίστα μου</Text>
          <Text style={styles.headerSub}>
            {items.length === 0
              ? "Δεν παρακολουθείς κάτι ακόμα"
              : `${items.length} προϊόντα · ειδοποιήσου όταν πέσει η τιμή`}
          </Text>
        </View>
        <Pressable
          onPress={() => Haptics.selectionAsync()}
          hitSlop={8}
          style={styles.iconBtn}
        >
          <Ionicons name="notifications-outline" size={20} color={T.ink} />
        </Pressable>
      </View>

      <View style={styles.chips}>
        {chips.map((c) => {
          const active = filter === c.key;
          return (
            <Pressable
              key={c.key}
              onPress={() => {
                Haptics.selectionAsync();
                setFilter(c.key);
              }}
              style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
            >
              <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextIdle]}>
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <SkeletonGroup />
      ) : items.length === 0 ? (
        <EmptyState
          icon="heart-outline"
          title="Η λίστα σου είναι άδεια"
          subtitle="Πρόσθεσε προϊόντα για να παρακολουθήσεις τιμές"
          actionText="Ψάξε προϊόντα"
          onAction={() => router.push("/")}
        />
      ) : filtered.length === 0 ? (
        <View style={styles.card}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: T.ink }}>
            Δεν υπάρχουν προσφορές αυτή τη στιγμή
          </Text>
          <Text style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>
            Θα ειδοποιηθείς μόλις πέσει κάποια τιμή.
          </Text>
        </View>
      ) : (
        <View style={{ marginTop: 14, gap: 10 }}>
          {filtered.map((item) => (
            <WatchCard
              key={item.watchId}
              item={item}
              expanded={expandedId === item.watchId}
              onToggleExpand={() => {
                Haptics.selectionAsync();
                setExpandedId((prev) => (prev === item.watchId ? null : item.watchId));
              }}
              onToggleWatch={() => toggleWatch(item)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 56,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: T.ink,
  },
  headerSub: {
    fontSize: 13,
    color: T.sub,
    marginTop: 4,
    lineHeight: 18,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  chips: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: T.ink,
    borderColor: T.ink,
  },
  chipIdle: {
    backgroundColor: T.card,
    borderColor: T.border,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  chipTextIdle: {
    color: T.ink,
  },
  card: {
    backgroundColor: T.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: T.thumb,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
    color: T.ink,
  },
  subLine: {
    fontSize: 12,
    color: T.faint,
    fontWeight: "500",
    flex: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.accent,
  },
  price: {
    fontSize: 15,
    fontWeight: "800",
    color: T.ink,
    letterSpacing: -0.2,
  },
  dealBadge: {
    backgroundColor: T.greenBg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dealText: {
    fontSize: 12,
    fontWeight: "800",
    color: T.green,
  },
  heart: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.redBg,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  expanded: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  chartBox: {
    backgroundColor: T.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 12,
  },
  stat: {
    flex: 1,
    backgroundColor: T.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  statValue: {
    fontSize: 15,
    fontWeight: "800",
    color: T.ink,
    letterSpacing: -0.2,
  },
  statLabel: {
    fontSize: 12,
    color: T.sub,
    marginTop: 3,
    fontWeight: "500",
  },
  hit: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: T.greenBg,
    borderRadius: 12,
    padding: 10,
  },
  skelCard: {
    backgroundColor: T.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
  },
});
