import { View, Text, ScrollView } from "react-native";
import { AppleCard } from "../../src/components/Apple";

export default function Profile() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F9F9FB", padding: 16 }}>
      <Text style={{ fontSize: 28, fontWeight: "800", marginTop: 40 }}>👤 Προφίλ</Text>
      <View style={{ marginTop: 12 }}>
        <AppleCard>
          <Text style={{ fontWeight: "700" }}>Οι αποδείξεις μου: 12</Text>
          <Text>Έχεις γλιτώσει ~18,40€ 🎉</Text>
        </AppleCard>
      </View>
    </ScrollView>
  );
}
