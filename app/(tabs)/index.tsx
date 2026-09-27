import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { supabase } from "../../src/lib/supabase";
import { C, AppleCard, EmojiTile, PriceBadge, Skeleton, EmptyState } from "../../src/components/Apple";

type PriceRow = {
  price: number | string;
  stores: { name: string; chain: string } | null;
};

type ProductRow = {
  id: string;
  name_el: string;
  category: string;
  emoji: string | null;
  prices: PriceRow[];
};

type Item = {
  id: string;
  name_el: string;
  category: string;
  emoji: string;
  price: number;
  prevPrice?: number;
  store?: string;
};

const TODAY = new Date().toLocaleDateString("el-GR", { weekday: "long", day: "numeric", month: "long" });

export default function Home() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Όλα");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const prevPrices = useRef<Record<string, number>>({});

  async function load() {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("products")
      .select("id,name_el,category,emoji,prices!inner(price,stores!inner(name,chain))")
      .order("created_at", { ascending: false, referencedTable: "prices" })
      .limit(30);
    if (error || !data) {
      setLoading(false);
      return;
    }
    const rows: Item[] = (data as unknown as ProductRow[]).map((r) => {
      const p = r.prices[0];
      const price = p ? Number(p.price) : 0;
      const prevPrice = prevPrices.current[r.id];
      prevPrices.current[r.id] = price;
      return {
        id: r.id,
        name_el: r.name_el,
        category: r.category,
        emoji: r.emoji ?? "🛒",
        price,
        prevPrice,
        store: p?.stores?.name ?? p?.stores?.chain,
      };
    });
    setItems(rows);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    if (!supabase) return;
    const sb = supabase;
    const ch = sb
      .channel("prices-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "prices" }, () => {
        void load();
      })
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED");
      });
    return () => {
      sb.removeChannel(ch);
    };
  }, []);

  const cats = useMemo(
    () => ["Όλα", ...Array.from(new Set(items.map((i) => i.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, "el"))],
    [items]
  );

  const filtered = items.filter(
    (i) => (cat === "Όλα" || i.category === cat) && i.name_el.toLowerCase().includes(q.trim().toLowerCase())
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={{ marginTop: 56, marginBottom: 18, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
        <View>
          <Text style={{ fontSize: 15, color: C.sub, fontWeight: "500", textTransform: "capitalize" }}>{TODAY}</Text>
          <Text style={{ fontSize: 34, fontWeight: "800", letterSpacing: -0.5, marginTop: 2 }}>Αρχική</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: live ? C.green : C.ter }} />
          <Text style={{ fontSize: 12.5, fontWeight: "600", color: live ? C.green : C.sub }}>
            {live ? "Live" : loading ? "Σύνδεση…" : "Εκτός σύνδεσης"}
          </Text>
        </View>
      </View>

      <View style={styles.search}>
        <Ionicons name="search" size={17} color={C.sub} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Ψάξε γάλα, φέτα…"
          placeholderTextColor={C.sub}
          style={{ flex: 1, fontSize: 16, marginLeft: 8, paddingVertical: 10 }}
        />
        {q.length > 0 && (
          <Pressable onPress={() => setQ("")} hitSlop={8}>
            <Ionicons name="close-circle" size={17} color={C.sub} />
          </Pressable>
        )}
      </View>

      <View style={{ height: 18 }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
        {cats.map((c) => {
          const active = cat === c;
          return (
            <Pressable
              key={c}
              onPress={() => {
                setCat(c);
                Haptics.selectionAsync();
              }}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 9,
                borderRadius: 999,
                backgroundColor: active ? C.text : C.card,
                borderWidth: 1,
                borderColor: active ? C.text : C.separator,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: active ? "#fff" : C.text }}>{c}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ height: 18 }} />
      {loading ? (
        <View>
          {Array.from({ length: 6 }).map((_, i) => (
            <AppleCard key={i} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 13 }}>
                <Skeleton style={{ width: 48, height: 48, borderRadius: 14 }} />
                <View style={{ flex: 1, gap: 8 }}>
                  <Skeleton style={{ height: 15, width: "65%" }} />
                  <Skeleton style={{ height: 12, width: "40%" }} />
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <Skeleton style={{ height: 16, width: 52 }} />
                  <Skeleton style={{ height: 20, width: 64, borderRadius: 8 }} />
                </View>
              </View>
            </AppleCard>
          ))}
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          title="Δεν βρέθηκαν προϊόντα"
          subtitle="Ελεγξε τη σύνδεση Supabase και δοκίμασε ξανά."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="Κανένα αποτέλεσμα"
          subtitle="Δοκίμασε άλλη αναζήτηση ή κατηγορία."
        />
      ) : (
        filtered.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => Haptics.selectionAsync()}
            style={({ pressed }) => [{ marginBottom: 10, opacity: pressed ? 0.85 : 1 }]}
          >
            <AppleCard>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 13 }}>
                <EmojiTile emoji={item.emoji} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", letterSpacing: -0.2 }} numberOfLines={1}>
                    {item.name_el}
                  </Text>
                  <Text style={{ fontSize: 13, color: C.sub, marginTop: 2 }} numberOfLines={1}>
                    {item.store ?? item.category}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 5 }}>
                  <Text style={{ fontSize: 17, fontWeight: "800", letterSpacing: -0.3 }}>{item.price.toFixed(2)}€</Text>
                  <PriceBadge price={item.price} oldPrice={item.prevPrice} />
                </View>
              </View>
            </AppleCard>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.separator,
  },
});
