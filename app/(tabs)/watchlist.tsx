import { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { supabase } from "../../src/lib/supabase";
import { toggleWatch } from "../../src/lib/notifications";
import { C, Group, RowSeparator, EmojiTile, PriceBadge } from "../../src/components/Apple";

const DEMO = [
  { id: "1", name_el: "ΦΕΤΑ ΠΟΠ 400G", emoji: "🧀", target: 4.5, price: 4.39, old: 4.89, store: "Lidl", on: true },
  { id: "2", name_el: "ΓΑΛΑ ΦΡΕΣΚΟ 1L", emoji: "🥛", target: 2.0, price: 1.89, old: 2.10, store: "Μασούτης", on: true },
  { id: "3", name_el: "ΜΠΑΝΑΝΕΣ 1KG", emoji: "🍌", target: 1.3, price: 1.29, old: 1.19, store: "Σκλαβενίτης", on: false },
  { id: "4", name_el: "ΚΑΦΕΣ ΕΛΛΗΝΙΚΟΣ", emoji: "☕", target: 5.0, price: 5.60, old: 5.10, store: "ΑΒ", on: false },
];

export default function Watchlist() {
  const [items, setItems] = useState(DEMO);

  async function toggle(item: any) {
    const next = !item.on;
    setItems(arr => arr.map(i => (i.id === item.id ? { ...i, on: next } : i)));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (next && supabase) {
      try { await toggleWatch(item.id, item.target); } catch { /* demo mode */ }
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={{ marginTop: 56, marginBottom: 6 }}>
        <Text style={{ fontSize: 34, fontWeight: "800", letterSpacing: -0.5 }}>Λίστα</Text>
        <Text style={{ fontSize: 15, color: C.sub, marginTop: 4 }}>
          {items.filter(i => i.on).length} ενεργά · θα ειδοποιηθείς όταν πέσει η τιμή
        </Text>
      </View>

      {items.length === 0 ? (
        <View style={{ alignItems: "center", marginTop: 80 }}>
          <View style={{ width: 76, height: 76, borderRadius: 22, backgroundColor: C.card, alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
            <Ionicons name="heart-outline" size={34} color={C.sub} />
          </View>
          <Text style={{ fontSize: 19, fontWeight: "700", marginBottom: 6 }}>Η λίστα σου είναι άδεια</Text>
          <Text style={{ fontSize: 14.5, color: C.sub, textAlign: "center", maxWidth: 260 }}>
            Πρόσθεσε προϊόντα που αγαπάς για να πιάνεις τις πτώσεις τιμών.
          </Text>
        </View>
      ) : (
        <View style={{ marginTop: 14 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: C.sub, textTransform: "uppercase", letterSpacing: 0.5, marginLeft: 16, marginBottom: 8 }}>
            Παρακολούθηση
          </Text>
          <Group>
            {items.map((item, idx) => (
              <View key={item.id}>
                {idx > 0 && <RowSeparator />}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, paddingHorizontal: 16, minHeight: 60 }}>
                  <EmojiTile emoji={item.emoji} size={42} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "600" }}>{item.name_el}</Text>
                    <Text style={{ fontSize: 12.5, color: C.sub, marginTop: 1 }}>
                      στόχος {item.target.toFixed(2)}€ · {item.store}
                    </Text>
                  </View>
                  <PriceBadge price={item.price} oldPrice={item.old} />
                  <Pressable
                    onPress={() => toggle(item)}
                    hitSlop={10}
                    style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: item.on ? "rgba(255,59,48,0.1)" : "#F2F2F7", alignItems: "center", justifyContent: "center" }}
                  >
                    <Ionicons name={item.on ? "heart" : "heart-outline"} size={19} color={item.on ? C.red : C.sub} />
                  </Pressable>
                </View>
              </View>
            ))}
          </Group>
        </View>
      )}

      <View style={{ marginTop: 26 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderRadius: 14, padding: 14 }}>
          <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(0,122,255,0.12)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="notifications-outline" size={18} color={C.tint} />
          </View>
          <Text style={{ flex: 1, fontSize: 13.5, color: C.sub, lineHeight: 18 }}>
            Οι ειδοποιήσεις λειτουργούν πλήρως σε development build. Στο Expo Go δείχνονται τοπικά.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
