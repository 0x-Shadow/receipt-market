import { useEffect, useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { supabase } from "../../src/lib/supabase";
import { C, AppleCard, SectionHeader, EmojiTile, PriceBadge } from "../../src/components/Apple";

const CATS = ["Όλα", "Γαλακτοκομικά", "Κρέας & Ψάρι", "Φρούτα & Λαχανικά", "Αρτοποιία", "Τρόφιμα", "Ποτά", "Καθαριότητα"];

const DEMO = [
  { id: "1", name_el: "ΦΕΤΑ ΠΟΠ 400G", category: "Γαλακτοκομικά", emoji: "🧀", store: "Lidl Μαρούσι", dist: "1,2km", price: 4.39, old: 4.89 },
  { id: "2", name_el: "ΓΑΛΑ ΦΡΕΣΚΟ 1L", category: "Γαλακτοκομικά", emoji: "🥛", store: "Μασούτης Ν. Σμύρνη", dist: "2,8km", price: 1.89, old: 2.10 },
  { id: "3", name_el: "ΜΠΑΝΑΝΕΣ 1KG", category: "Φρούτα & Λαχανικά", emoji: "🍌", store: "Σκλαβενίτης Χαλάνδρι", dist: "3,1km", price: 1.29, old: 1.19 },
  { id: "4", name_el: "ΨΩΜΙ ΤΟΣΤ", category: "Αρτοποιία", emoji: "🍞", store: "ΑΒ Γλυφάδα", dist: "4,0km", price: 2.10, old: 2.40 },
  { id: "5", name_el: "ΚΑΦΕΣ ΕΛΛΗΝΙΚΟΣ", category: "Ποτά", emoji: "☕", store: "Lidl Μαρούσι", dist: "1,2km", price: 5.10, old: 5.60 },
];

const TODAY = new Date().toLocaleDateString("el-GR", { weekday: "long", day: "numeric", month: "long" });

export default function Home() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Όλα");
  const [items, setItems] = useState<any[]>(DEMO);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const sb = supabase;
    if (!sb) return;
    setLive(true);
    sb.from("products").select("id,name_el,category,emoji").limit(30).then(({ data }) => setItems(data?.length ? data : DEMO));
    const ch = sb.channel("prices-live").on("postgres_changes", { event: "INSERT", schema: "public", table: "prices" }, () => {
      sb.from("products").select("id,name_el,category,emoji").limit(30).then(({ data }) => setItems(data?.length ? data : DEMO));
    }).subscribe();
    return () => { sb.removeChannel(ch); };
  }, []);

  const filtered = items.filter(i => (cat === "Όλα" || i.category === cat) && i.name_el.toLowerCase().includes(q.toLowerCase()));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={{ marginTop: 56, marginBottom: 18 }}>
        <Text style={{ fontSize: 15, color: C.sub, fontWeight: "500", textTransform: "capitalize" }}>{TODAY}</Text>
        <Text style={{ fontSize: 34, fontWeight: "800", letterSpacing: -0.5, marginTop: 2 }}>Αρχική</Text>
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

      <View style={{ height: 22 }} />
      <SectionHeader title="Φθηνότερα κοντά σου" action="Περισσότερα" onAction={() => Haptics.selectionAsync()} />
      {!live && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.orange }} />
          <Text style={{ fontSize: 12.5, color: C.sub, fontWeight: "500" }}>Δείγμα δεδομένων — σύνδεσε Supabase για live τιμές</Text>
        </View>
      )}
      {filtered.map((item, idx) => (
        <Pressable
          key={item.id}
          onPress={() => Haptics.selectionAsync()}
          style={({ pressed }) => [{ marginBottom: 10, opacity: pressed ? 0.85 : 1 }]}
        >
          <AppleCard>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 13 }}>
              <EmojiTile emoji={item.emoji ?? "🛒"} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", letterSpacing: -0.2 }}>{item.name_el}</Text>
                <Text style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>
                  {item.store ?? item.category} {item.dist ? `· ${item.dist}` : ""}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 5 }}>
                <Text style={{ fontSize: 17, fontWeight: "800", letterSpacing: -0.3 }}>{(item.price ?? 2.19).toFixed(2)}€</Text>
                <PriceBadge price={item.price ?? 2.19} oldPrice={item.old} />
              </View>
            </View>
          </AppleCard>
        </Pressable>
      ))}

      <View style={{ height: 26 }} />
      <SectionHeader title="Κατηγορίες" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
        {CATS.map(c => {
          const active = cat === c;
          return (
            <Pressable
              key={c}
              onPress={() => { setCat(c); Haptics.selectionAsync(); }}
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
