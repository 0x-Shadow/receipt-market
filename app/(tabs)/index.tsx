import { useEffect, useState } from "react";
import { View, Text, TextInput, ScrollView, FlatList } from "react-native";
import { supabase } from "../../src/lib/supabase";
import { AppleCard, PriceBadge } from "../../src/components/Apple";

const CATS = ["Όλα","Γαλακτοκομικά","Κρέας & Ψάρι","Φρούτα & Λαχανικά","Αρτοποιία","Τρόφιμα","Ποτά","Καθαριότητα"];

export default function Home() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Όλα");
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("products").select("id,name_el,category,emoji").limit(30).then(({ data }) => setItems(data ?? []));
    const ch = supabase.channel("prices-live").on("postgres_changes", { event: "INSERT", schema: "public", table: "prices" }, () => {
      supabase.from("products").select("id,name_el,category,emoji").limit(30).then(({ data }) => setItems(data ?? []));
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = items.filter(i => (cat === "Όλα" || i.category === cat) && i.name_el.toLowerCase().includes(q.toLowerCase()));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F9F9FB", padding: 16 }}>
      <Text style={{ fontSize: 28, fontWeight: "800", marginTop: 40 }}>🧾 Πού είναι φθηνότερα;</Text>
      <TextInput value={q} onChangeText={setQ} placeholder="Ψάξε γάλα, φέτα…" style={{ backgroundColor: "#fff", borderRadius: 14, padding: 14, marginTop: 12 }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 12 }}>
        {CATS.map(c => (
          <Text key={c} onPress={() => setCat(c)} style={{ backgroundColor: cat === c ? "#111" : "#fff", color: cat === c ? "#fff" : "#111", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, overflow: "hidden" }}>{c}</Text>
        ))}
      </ScrollView>
      <FlatList data={filtered} scrollEnabled={false} keyExtractor={i => i.id} renderItem={({ item }) => (
        <View style={{ marginBottom: 10 }}>
          <AppleCard>
            <Text style={{ fontSize: 17, fontWeight: "600" }}>{item.emoji} {item.name_el}</Text>
            <Text style={{ color: "#888", marginBottom: 8 }}>{item.category}</Text>
            <PriceBadge price={2.19} oldPrice={2.49} />
          </AppleCard>
        </View>
      )} />
    </ScrollView>
  );
}
