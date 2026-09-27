import { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { AppleCard } from "../../src/components/Apple";

export default function Profile() {
  const [receipts] = useState<any[]>([]);
  const count = receipts.length;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F9F9FB", padding: 16 }}>
      <Text style={{ fontSize: 28, fontWeight: "800", marginTop: 40 }}>👤 Προφίλ</Text>
      <View style={{ marginTop: 12 }}>
        <AppleCard>
          <Text style={{ fontWeight: "700" }}>Οι αποδείξεις μου: {count}</Text>
          <Text>Έχεις γλιτώσει ~18,40€ 🎉</Text>
        </AppleCard>
      </View>
      {count === 0 ? (
        <View style={{ marginTop: 12 }}>
          <AppleCard>
            <Text style={{ fontSize: 17, fontWeight: "700" }}>Δεν έχεις αποδείξεις ακόμα 🧾</Text>
            <Text style={{ color: "#666", marginTop: 4 }}>Σκάναρε την πρώτη σου από το Scan και δες πού είναι φθηνότερα.</Text>
          </AppleCard>
        </View>
      ) : null}
      <View style={{ marginTop: 12 }}>
        <AppleCard>
          <Text style={{ fontSize: 17, fontWeight: "700" }}>Ρυθμίσεις ⚙️</Text>
          <Text style={{ color: "#666", marginTop: 4 }}>Ειδοποιήσεις και γλώσσα έρχονται στο v1.0.</Text>
        </AppleCard>
      </View>
    </ScrollView>
  );
}
