import { useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { supabase } from "../../src/lib/supabase";
import { C, AppleCard } from "../../src/components/Apple";

type Quote = {
  store_id: string;
  store_name: string;
  chain: string;
  price: number;
  observed_at: string;
};

export default function ProductPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [name, setName] = useState("");

  const [loaded, setLoaded] = useState(false);
  if (!loaded && id) {
    setLoaded(true);
    void (async () => {
      const client = supabase;
      if (!client) return;

      const { data: product } = await client
        .from("products")
        .select("name_el")
        .eq("id", String(id))
        .single();
      setName(product?.name_el ?? "");

      const { data } = await client
        .from("product_price_latest")
        .select("store_id, price, observed_at, stores!inner(name, chain)")
        .eq("product_id", String(id));

      const mapped: Quote[] = (data ?? []).map((r: any) => ({
        store_id: r.store_id,
        store_name: r.stores?.name ?? "",
        chain: r.stores?.chain ?? "",
        price: Number(r.price),
        observed_at: r.observed_at,
      }));
      mapped.sort((a, b) => a.price - b.price);
      setQuotes(mapped);
    })();
  }

  if (!quotes) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <ActivityIndicator color={C.tint} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Pressable
        onPress={() => {
          void Haptics.selectionAsync();
          router.back();
        }}
        hitSlop={10}
        style={styles.back}
      >
        <Ionicons name="chevron-back" size={24} color={C.text} />
      </Pressable>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 56, paddingBottom: 130 }}>
        <Text style={styles.title}>{name}</Text>

        {quotes.length === 0 ? (
          <Text style={styles.empty}>
            Δεν υπάρχει ακόμη τιμή για αυτό το προϊόν.
          </Text>
        ) : (
          quotes.map((q, i) => (
            <AppleCard
              key={q.store_id}
              style={{ marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <Ionicons
                name={i === 0 ? "trophy" : "storefront-outline"}
                size={20}
                color={i === 0 ? C.green : C.sub}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.store}>{q.store_name}</Text>
                <Text style={styles.updated}>
                  Τελευταία: {new Date(q.observed_at).toLocaleDateString("el-GR")}
                </Text>
              </View>
              <Text style={styles.price}>
                {q.price.toFixed(2).replace(".", ",")}€
              </Text>
            </AppleCard>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  back: {
    position: "absolute",
    top: 50,
    left: 14,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 16,
    letterSpacing: -0.4,
  },
  empty: { fontSize: 15, color: C.sub },
  store: { fontSize: 15, fontWeight: "700" },
  updated: { fontSize: 12, color: C.sub, marginTop: 2 },
  price: { fontSize: 17, fontWeight: "800" },
});
