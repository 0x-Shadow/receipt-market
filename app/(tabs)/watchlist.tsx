import { View, Text, ScrollView } from "react-native";
import { AppleCard, PriceBadge } from "../../src/components/Apple";

const DEMO = [
  { name: "ΦΕΤΑ ΠΟΠ 400G", price: 4.39, old: 4.89, store: "Lidl Μαρούσι" },
  { name: "ΓΑΛΑ ΦΡΕΣΚΟ 1L", price: 1.89, old: 2.10, store: "Μασούτης Ν. Σμύρνη" },
];

export default function Watchlist() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F9F9FB", padding: 16 }}>
      <Text style={{ fontSize: 28, fontWeight: "800", marginTop: 40 }}>🔔 Η λίστα μου</Text>
      <Text style={{ color: "#666", marginBottom: 12 }}>Θα ειδοποιηθείς όταν πέσει η τιμή.</Text>
      {DEMO.map(d => (
        <View key={d.name} style={{ marginBottom: 10 }}>
          <AppleCard>
            <Text style={{ fontWeight: "700", fontSize: 16 }}>{d.name}</Text>
            <Text style={{ color: "#888", marginBottom: 8 }}>{d.store}</Text>
            <PriceBadge price={d.price} oldPrice={d.old} />
          </AppleCard>
        </View>
      ))}
    </ScrollView>
  );
}
