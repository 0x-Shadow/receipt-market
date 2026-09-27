import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { AppleCard, PriceBadge } from "../../src/components/Apple";
import { toggleWatch } from "../../src/lib/notifications";

const DEMO = [
  { id: "demo-feta", name: "ΦΕΤΑ ΠΟΠ 400G", price: 4.39, old: 4.89, store: "Lidl Μαρούσι" },
  { id: "demo-gala", name: "ΓΑΛΑ ΦΡΕΣΚΟ 1L", price: 1.89, old: 2.10, store: "Μασούτης Ν. Σμύρνη" },
];

export default function Watchlist() {
  async function onToggle(id: string) {
    try {
      await toggleWatch(id);
    } catch {
      Alert.alert("Χρειάζεται σύνδεση", "Κάνε login για να αποθηκεύσεις στη λίστα.");
    }
  }
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F9F9FB", padding: 16 }}>
      <Text style={{ fontSize: 28, fontWeight: "800", marginTop: 40 }}>🔔 Η λίστα μου</Text>
      <Text style={{ color: "#666", marginBottom: 12 }}>Θα ειδοποιηθείς όταν πέσει η τιμή.</Text>
      {DEMO.map(d => (
        <View key={d.id} style={{ marginBottom: 10 }}>
          <AppleCard>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontWeight: "700", fontSize: 16 }}>{d.name}</Text>
              <Pressable onPress={() => onToggle(d.id)} accessibilityLabel="toggle watch">
                <Text style={{ fontSize: 22 }}>🤍</Text>
              </Pressable>
            </View>
            <Text style={{ color: "#888", marginBottom: 8 }}>{d.store}</Text>
            <PriceBadge price={d.price} oldPrice={d.old} />
          </AppleCard>
        </View>
      ))}
    </ScrollView>
  );
}
