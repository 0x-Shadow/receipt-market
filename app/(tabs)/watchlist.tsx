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
        <View key={i} style={{ backgroundColor: C.card, borderRadius: 16, padding: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Skeleton style={{ width: 44, height: 44, borderRadius: 12 }} />
            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton style={{ height: 14, width: "55%" }} />
              <Skeleton style={{ height: 11, width: "35%" }} />
            </View>
            <Skeleton style={{ height: 22, width: 60, borderRadius: 8 }} />
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
  const hitTarget =
    item.targetPrice != null && item.currentPrice != null && item.currentPrice <= item.targetPrice;
  const added = new Date(item.addedAt).toLocaleDateString("el-GR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Pressable
          onPress={onToggleExpand}
          style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 }}
        >
          <EmojiTile emoji={item.emoji} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", letterSpacing: -0.2 }}>{item.name}</Text>
            <Text style={{ fontSize: 12.5, color: C.sub, marginTop: 2 }}>
              {item.storeName ?? "—"}
              {item.targetPrice != null ? ` · στόχος ${eur(item.targetPrice)}` : ""}
            </Text>
          </View>
          {item.currentPrice != null ? (
            <PriceBadge price={item.currentPrice} oldPrice={item.previousPrice ?? undefined} />
          ) : (
            <Text style={{ fontSize: 13, color: C.sub, fontWeight: "600" }}>—</Text>
          )}
          <Ionicons
            name="chevron-forward"
            size={17}
            color={C.ter}
            style={{ transform: [{ rotate: expanded ? "90deg" : "0deg" }] }}
          />
        </Pressable>
        <Pressable onPress={onToggleWatch} hitSlop={12} style={styles.heart}>
          <Ionicons name="heart" size={20} color={C.red} />
        </Pressable>
      </View>

      {expanded && (
        <View style={{ marginTop: 14 }}>
          {item.history.length > 1 ? (
            <PriceChart data={item.history.map((h) => ({ date: h.date, price: h.price }))} />
          ) : (
            <Text style={{ fontSize: 13, color: C.sub }}>
              Δεν υπάρχουν αρκετές πρόσφατες τιμές για γράφημα.
            </Text>
          )}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <StatCard
              value={item.currentPrice != null ? eur(item.currentPrice) : "—"}
              label="Τιμή"
            />
            <StatCard
              value={item.targetPrice != null ? eur(item.targetPrice) : "—"}
              label="Στόχος"
            />
            <StatCard
              value={change != null ? `${change > 0 ? "+" : "−"}${eur(Math.abs(change))}` : "—"}
              label="Μεταβολή"
              accent={change == null ? undefined : change < 0 ? C.green : change > 0 ? C.red : C.text}
            />
          </View>
          {hitTarget && (
            <View style={styles.hit}>
              <Ionicons name="checkmark-circle" size={16} color={C.green} />
              <Text style={{ fontSize: 13, color: C.green, fontWeight: "600", flex: 1 }}>
                Η τιμή έφτασε τον στόχο σου!
              </Text>
            </View>
          )}
          <Text style={{ marginTop: 12, fontSize: 12, color: C.sub }}>
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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.sub} />
      }
    >
      <View style={{ marginTop: 56, marginBottom: 6 }}>
        <Text style={{ fontSize: 34, fontWeight: "800", letterSpacing: -0.5 }}>Λίστα</Text>
        <Text style={{ fontSize: 15, color: C.sub, marginTop: 4 }}>
          {items.length === 0
            ? "Δεν παρακολουθείς κάτι ακόμα"
            : `${items.length} ${items.length === 1 ? "προϊόν" : "προϊόντα"} · θα ειδοποιηθείς όταν πέσει η τιμή`}
        </Text>
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
      ) : (
        <View style={{ marginTop: 14, gap: 10 }}>
          {items.map((item) => (
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
  heart: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,59,48,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  hit: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(52,199,89,0.10)",
    borderRadius: 10,
    padding: 10,
  },
});
