import { useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import TextRecognition from "@react-native-ml-kit/text-recognition";
import { parseGreekReceipt } from "../../src/parser/greekReceiptParser";
import { supabase } from "../../src/lib/supabase";
import { AppleCard } from "../../src/components/Apple";

export default function Scan() {
  const [raw, setRaw] = useState("ΣΚΛΑΒΕΝΙΤΗΣ\nΦΕΤΑ ΠΟΠ 400G 4,89\nΓΑΛΑ 1L 1,89\nΣΥΝΟΛΟ 6,78");
  const parsed = parseGreekReceipt(raw);

  async function pickAndRecognize() {
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (res.canceled) return;
    try {
      const out = await TextRecognition.recognize(res.assets[0].uri);
      setRaw(out.text || "");
    } catch {
      Alert.alert("Δεν διάβασα καλά", "Κράτα σταθερά, καλό φως, ξαναπροσπάθησε.");
    }
  }

  async function save() {
    try {
      const { data: store } = await supabase.from("stores").select("id").eq("chain", parsed.storeChain).limit(1).single();
      for (const it of parsed.items) {
        const { data: prod } = await supabase.from("products").upsert({ name_el: it.name, category: "Άλλα" }, { onConflict: "name_el" }).select("id").single();
        if (prod && store) await supabase.from("prices").insert({ product_id: prod.id, store_id: (store as any).id, price: it.price });
      }
      Alert.alert("Αποθηκεύτηκε ✅", `${parsed.items.length} προϊόντα από ${parsed.storeChain}`);
    } catch {
      Alert.alert("Κάτι πήγε στραβά", "Δεν αποθηκεύτηκε — check internet και ξαναπροσπάθησε.");
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F9F9FB", padding: 16 }}>
      <Text style={{ fontSize: 28, fontWeight: "800", marginTop: 40 }}>📸 Scan απόδειξης</Text>
      <Pressable onPress={pickAndRecognize} style={{ backgroundColor: "#111", borderRadius: 16, padding: 18, marginTop: 12, alignItems: "center" }}>
        <Text style={{ color: "#fff", fontWeight: "800" }}>📷 Βγάλε φωτογραφία</Text>
      </Pressable>
      <TextInput multiline value={raw} onChangeText={setRaw} style={{ backgroundColor: "#fff", borderRadius: 14, padding: 14, minHeight: 140, marginTop: 12, textAlignVertical: "top" }} />
      <View style={{ marginTop: 12 }}>
        <AppleCard>
          <Text style={{ fontWeight: "700" }}>🏪 {parsed.storeChain} ({(parsed.storeConfidence*100).toFixed(0)}%)</Text>
          <Text>Σύνολο: {parsed.total?.toFixed(2)}€ • Εμπιστοσύνη: {(parsed.confidence*100).toFixed(0)}%</Text>
          {parsed.storeChain === "Άγνωστο" && <Text style={{ color: "#D64545" }}>Δεν βρήκα κατάστημα 🏪 — έλεγξε την απόδειξη ✍️</Text>}
          {parsed.items.map((it, i) => <Text key={i}>• {it.name} — {it.price.toFixed(2)}€</Text>)}
          {parsed.confidence < 0.6 && <Text style={{ color: "#D64545" }}>Δεν διάβασα καλά — διόρθωσε ✍️</Text>}
        </AppleCard>
      </View>
      <Pressable onPress={save} style={{ backgroundColor: "#007AFF", borderRadius: 16, padding: 18, marginTop: 16, alignItems: "center" }}>
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 17 }}>Καταχώρηση ✅</Text>
      </Pressable>
    </ScrollView>
  );
}
