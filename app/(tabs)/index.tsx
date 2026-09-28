import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Image } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { supabase } from "../../src/lib/supabase";
import { Skeleton, EmptyState, PriceBadge, EmojiTile } from "../../src/components/Apple";

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

const T = {
  bg: "#F7F8FA",
  card: "#FFFFFF",
  ink: "#1A2233",
  sub: "#6B7280",
  faint: "#9CA3AF",
  accent: "#0A84FF",
  green: "#1F8A4C",
  greenBg: "#E8F9EE",
  border: "#EDF0F4",
};

const HERO_IMAGE = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80";

function categoryToImage(category: string): string {
  const c = category ?? "";
  if (c.includes("Γαλακτοκομικά")) return "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=70";
  if (c.includes("Φρούτα") || c.includes("Λαχανικά")) return "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&q=70";
  if (c.includes("Αρτοποιία")) return "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=70";
  if (c.includes("Τρόφιμα")) return "https://images.unsplash.com/photo-1584473457409-cee0b1e9e4d9?w=400&q=70";
  if (c.includes("Ποτά")) return "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=70";
  if (c.includes("Κρέας") || c.includes("Ψάρι")) return "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400&q=70";
  if (c.includes("Καθαριότητα")) return "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&q=70";
  if (c.includes("Άλλα")) return "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=70";
  return "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=70";
}

function discountPercent(price: number, prevPrice?: number): number | null {
  if (prevPrice === undefined || prevPrice <= 0) return null;
  if (price >= prevPrice) return null;
  return Math.round((1 - price / prevPrice) * 100);
}

function TopOfferCard({ item }: { item: Item }) {
  const [imgError, setImgError] = useState(false);
  const pct = discountPercent(item.price, item.prevPrice);
  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync();
      }}
      style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}
    >
      <View style={styles.topCard}>
        {imgError ? (
          <View style={styles.topImageFallback}>
            <EmojiTile emoji={item.emoji} size={44} bg="#F7F8FA" />
          </View>
        ) : (
          <Image
            source={{ uri: categoryToImage(item.category) }}
            style={styles.topImage}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        )}
        <View style={styles.topBody}>
          <Text style={styles.topName} numberOfLines={2}>
            {item.name_el}
          </Text>
          <View style={styles.topPriceRow}>
            <Text style={styles.topPrice}>{item.price.toFixed(2)}€</Text>
            {item.prevPrice !== undefined && pct !== null ? (
              <Text style={styles.topOldPrice}>{item.prevPrice.toFixed(2)}€</Text>
            ) : null}
          </View>
          {pct !== null ? (
            <View style={styles.pctBadge}>
              <Text style={styles.pctText}>-{pct}%</Text>
            </View>
          ) : null}
          <Text style={styles.topStore} numberOfLines={1}>
            {item.store ?? item.category}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function Home() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Όλα");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroError, setHeroError] = useState(false);
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
      .subscribe();
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

  const topOffers = filtered.slice(0, 10);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.date} numberOfLines={1}>
            {TODAY}
          </Text>
          <Text style={styles.title}>Αρχική</Text>
        </View>
        <Pressable
          onPress={() => {
            void Haptics.selectionAsync();
          }}
          style={({ pressed }) => [styles.bell, { opacity: pressed ? 0.7 : 1 }]}
          hitSlop={8}
        >
          <Ionicons name="notifications-outline" size={20} color={T.ink} />
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.search}>
          <Ionicons name="search" size={17} color={T.sub} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Ψάξε γάλα, φέτα…"
            placeholderTextColor={T.faint}
            style={styles.searchInput}
          />
          {q.length > 0 ? (
            <Pressable onPress={() => setQ("")} hitSlop={8}>
              <Ionicons name="close-circle" size={17} color={T.sub} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          onPress={() => {
            void Haptics.selectionAsync();
            router.push("/(tabs)/scan" as never);
          }}
          style={({ pressed }) => [styles.cameraBtn, { opacity: pressed ? 0.75 : 1 }]}
          hitSlop={4}
        >
          <Ionicons name="camera-outline" size={19} color={T.ink} />
        </Pressable>
      </View>

      <View style={styles.hero}>
        {!heroError ? (
          <Image
            source={{ uri: HERO_IMAGE }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            onError={() => setHeroError(true)}
          />
        ) : null}
        <View style={styles.heroOverlay} />
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>Real deals. Real people.</Text>
          <Text style={styles.heroSubtitle}>Σκάνε, βρες τις καλύτερες τιμές και βοήθησε την κοινότητα.</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Σημερινές προσφορές</Text>
        <Pressable
          onPress={() => {
            setCat("Όλα");
            void Haptics.selectionAsync();
          }}
          hitSlop={8}
        >
          <Text style={styles.seeAll}>Δες όλα</Text>
        </Pressable>
      </View>

      {loading ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topRow}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={styles.topCard}>
              <Skeleton style={styles.topImage} />
              <View style={styles.topBody}>
                <Skeleton style={{ height: 13, width: "80%" }} />
                <Skeleton style={{ height: 15, width: "55%", marginTop: 8 }} />
                <Skeleton style={{ height: 11, width: "40%", marginTop: 6 }} />
              </View>
            </View>
          ))}
        </ScrollView>
      ) : topOffers.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topRow}>
          {topOffers.map((item) => (
            <TopOfferCard key={item.id} item={item} />
          ))}
        </ScrollView>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {cats.map((c) => {
          const active = cat === c;
          return (
            <Pressable
              key={c}
              onPress={() => {
                setCat(c);
                void Haptics.selectionAsync();
              }}
              style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
            >
              <Text style={active ? styles.chipTextActive : styles.chipTextInactive}>{c}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.listTitle}>Όλα τα προϊόντα</Text>

      {loading ? (
        <View>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={styles.rowCard}>
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
            </View>
          ))}
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          title="Δεν βρέθηκαν προϊόντα"
          subtitle="Ελεγξε τη σύνδεση Supabase και δοκίμασε ξανά."
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon="search-outline" title="Κανένα αποτέλεσμα" subtitle="Δοκίμασε άλλη αναζήτηση ή κατηγορία." />
      ) : (
        filtered.map((item) => {
          const pct = discountPercent(item.price, item.prevPrice);
          return (
            <Pressable
              key={item.id}
              onPress={() => {
                void Haptics.selectionAsync();
              }}
              style={({ pressed }) => [{ marginBottom: 10, opacity: pressed ? 0.85 : 1 }]}
            >
              <View style={styles.rowCard}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 13 }}>
                  <EmojiTile emoji={item.emoji} size={48} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {item.name_el}
                    </Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {item.store ?? item.category}
                    </Text>
                    {pct !== null && item.prevPrice !== undefined ? (
                      <View style={styles.rowDiscountRow}>
                        <Text style={styles.rowOldPrice}>{item.prevPrice.toFixed(2)}€</Text>
                        <View style={styles.pctBadge}>
                          <Text style={styles.pctText}>-{pct}%</Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 5 }}>
                    <Text style={styles.rowPrice}>{item.price.toFixed(2)}€</Text>
                    <PriceBadge price={item.price} oldPrice={item.prevPrice} />
                  </View>
                </View>
              </View>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 110,
  },
  header: {
    marginTop: 56,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerLeft: {
    flex: 1,
  },
  date: {
    fontSize: 13,
    color: T.sub,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: T.ink,
    marginTop: 2,
  },
  bell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  search: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.card,
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: T.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    paddingVertical: 11,
    color: T.ink,
  },
  cameraBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    height: 170,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#1A2233",
    marginTop: 16,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(10,15,30,0.45)",
  },
  heroText: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 18,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 22,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: T.ink,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: "600",
    color: T.accent,
  },
  topRow: {
    gap: 12,
    paddingRight: 16,
  },
  topCard: {
    width: 150,
    backgroundColor: T.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
  },
  topImage: {
    width: 150,
    height: 110,
    backgroundColor: "#EEF1F5",
  },
  topImageFallback: {
    width: 150,
    height: 110,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F8FA",
  },
  topBody: {
    padding: 10,
  },
  topName: {
    fontSize: 13,
    fontWeight: "600",
    color: T.ink,
    lineHeight: 17,
    minHeight: 34,
  },
  topPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: 6,
  },
  topPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: T.ink,
  },
  topOldPrice: {
    fontSize: 11,
    color: T.faint,
    textDecorationLine: "line-through",
  },
  pctBadge: {
    alignSelf: "flex-start",
    backgroundColor: T.greenBg,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginTop: 6,
  },
  pctText: {
    fontSize: 11,
    fontWeight: "700",
    color: T.green,
  },
  topStore: {
    fontSize: 11,
    color: T.faint,
    marginTop: 6,
  },
  chipsRow: {
    gap: 8,
    paddingRight: 16,
    marginTop: 18,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: "#1A2233",
    borderColor: "#1A2233",
  },
  chipInactive: {
    backgroundColor: T.card,
    borderColor: T.border,
  },
  chipTextActive: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  chipTextInactive: {
    fontSize: 14,
    fontWeight: "600",
    color: T.ink,
  },
  listTitle: {
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: T.ink,
    marginTop: 22,
    marginBottom: 12,
  },
  rowCard: {
    backgroundColor: T.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
  },
  rowName: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
    color: T.ink,
  },
  rowSub: {
    fontSize: 13,
    color: T.sub,
    marginTop: 2,
  },
  rowDiscountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  rowOldPrice: {
    fontSize: 11,
    color: T.faint,
    textDecorationLine: "line-through",
  },
  rowPrice: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: T.ink,
  },
});
