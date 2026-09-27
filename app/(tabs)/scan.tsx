import { useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, Alert } from "react-native";
import { parseGreekReceipt } from "../../src/parser/greekReceiptParser";
import { supabase } from "../../src/lib/supabase";
import { AppleCard } from "../../src/components/Apple";

// v0.1: paste OCR text (or type) → parse instantly, no camera permission friction.
// v0.2: wire expo-camera + ML Kit recognize() → same parser.
export default function Scan() {
  const [raw, setRaw] = useState("ΣΚΛΑΒΕΝΙΤΗΣ\nΦΕΤΑ ΠΟΠ 400G 4,89\nΓΑΛΑ 1L 1,89\nΣΥΝΟΛΟ 6,78");
  const parsed = parseGreekReceipt(raw);

  async function save() {
    Alert.alert("Αποθηκεύτηκε ✅", `${parsed.items.length} προϊόντα από ${parsed.storeChain} (conf ${(parsed.confidence*100).toFixed(0)}%) — σύνδεσε Supabase για live save.`);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F9F9FB", padding: 16 }}>
      <Text style={{ fontSize: 28, fontWeight: "800", marginTop: 40 }}>📸 Scan απόδειξης</Text>
      <Text style={{ color: "#666", marginVertical: 8 }}>Βγάλε φωτό → αυτόματο διάβασμα (0€, offline). Δοκίμασε επικόλληση κειμένου:</Text>
      <TextInput multiline value={raw} onChangeText={setRaw} style={{ backgroundColor: "#fff", borderRadius: 14, padding: 14, minHeight: 140, textAlignVertical: "top" }} />
      <View style={{ marginTop: 12 }}>
        <AppleCard>
          <Text style={{ fontWeight: "700" }}>🏪 {parsed.storeChain} ({(parsed.storeConfidence*100).toFixed(0)}%)</Text>
          <Text>Σύνολο: {parsed.total?.toFixed(2)}€ • Εμπιστοσύνη: {(parsed.confidence*100).toFixed(0)}%</Text>
          {parsed.items.map((it, i) => (
            <Text key={i} style={{ paddingVertical: 4 }}>• {it.name} — {it.price.toFixed(2)}€</Text>
          ))}
          {parsed.confidence < 0.6 && <Text style={{ color: "#D64545", marginTop: 8 }}>Δεν διάβασα καλά — διόρθωσε χειροκίνητα ✍️</Text>}
        </AppleCard>
      </View>
      <Pressable onPress={save} style={{ backgroundColor: "#007AFF", borderRadius: 16, padding: 18, marginTop: 16, alignItems: "center" }}>
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 17 }}>Καταχώρηση ✅</Text>
      </Pressable>
    </ScrollView>
  );
}
