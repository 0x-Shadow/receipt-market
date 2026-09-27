import { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { supabase } from "../../src/lib/supabase";
import { C, AppleCard, Skeleton } from "../../src/components/Apple";

type CorrectedItem = {
  id: string;
  name: string;
  price: string;
  quantity: string;
  unit: string;
  confidence: number;
};

function confidenceColor(c: number) {
  if (c > 0.7) return C.green;
  if (c > 0.4) return C.orange;
  return C.red;
}

function confidenceBg(c: number) {
  if (c > 0.7) return "rgba(52,199,89,0.12)";
  if (c > 0.4) return "rgba(255,149,0,0.12)";
  return "rgba(255,59,48,0.10)";
}

export default function Correct() {
  const params = useLocalSearchParams<{ items: string; rawText: string; storeChain: string }>();
  const router = useRouter();

  const initialItems: CorrectedItem[] = useMemo(() => {
    try {
      const parsed = JSON.parse(params.items || "[]") as Array<{
        name: string;
        price: number;
        confidence: number;
        quantity?: number;
        unit?: string;
      }>;
      return parsed.map((it, i) => ({
        id: `item-${i}-${Date.now()}`,
        name: it.name,
        price: it.price.toFixed(2),
        quantity: it.quantity?.toString() ?? "",
        unit: it.unit ?? "",
        confidence: it.confidence,
      }));
    } catch {
      return [];
    }
  }, [params.items]);

  const [items, setItems] = useState<CorrectedItem[]>(initialItems);
  const [showRaw, setShowRaw] = useState(false);
  const [saving, setSaving] = useState(false);

  const storeChain = params.storeChain ?? "";
  const rawText = params.rawText ?? "";

  function updateItem(id: string, field: keyof CorrectedItem, value: string) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  }

  function addItem() {
    Haptics.selectionAsync();
    setItems((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        name: "",
        price: "",
        quantity: "",
        unit: "",
        confidence: 0,
      },
    ]);
  }

  function removeItem(id: string) {
    Haptics.selectionAsync();
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  async function handleSave() {
    if (items.length === 0) {
      Alert.alert("Άδεια λίστα", "Πρόσθεσε τουλάχιστον ένα προϊόν πριν αποθηκεύσεις.");
      return;
    }
    const invalid = items.some((it) => !it.name.trim() || !it.price.trim() || parseFloat(it.price.replace(",", ".")) <= 0);
    if (invalid) {
      Alert.alert("Ελλιπή στοιχεία", "Συμπλήρωσε όνομα και έγκυρη τιμή σε κάθε προϊόν.");
      return;
    }

    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (!supabase) {
        Alert.alert("Χωρίς Supabase", "Βάλε τα κλειδιά στο .env για αποθήκευση τιμών.");
        setSaving(false);
        return;
      }

      const { data: receipt, error: receiptError } = await supabase
        .from("receipts")
        .insert({ store_chain: storeChain, raw_text: rawText })
        .select("id")
        .single();
      if (receiptError) throw receiptError;

      const { data: store } = await supabase.from("stores").select("id").eq("chain", storeChain).limit(1).single();

      for (const it of items) {
        const price = parseFloat(it.price.replace(",", "."));
        const { data: prod, error: prodError } = await supabase
          .from("products")
          .upsert({ name_el: it.name.trim(), category: "Άλλα" }, { onConflict: "name_el" })
          .select("id")
          .single();
        if (prodError) throw prodError;
        if (!prod) continue;

        const { error: priceError } = await supabase.from("prices").insert({
          product_id: prod.id,
          store_id: store?.id ?? null,
          receipt_id: receipt.id,
          price,
          quantity: it.quantity ? parseInt(it.quantity, 10) : null,
          unit: it.unit || null,
        });
        if (priceError) throw priceError;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Αποθηκεύτηκε", `${items.length} προϊόντα από ${storeChain}`, [
        { text: "Εντάξει", onPress: () => router.back() },
      ]);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Κάτι πήγε στραβά", "Έλεγξε το internet και ξαναπροσπάθησε.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    Haptics.selectionAsync();
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <Pressable onPress={handleCancel} style={styles.headerBtn}>
            <Ionicons name="close" size={24} color={C.tint} />
          </Pressable>
          <Text style={styles.headerTitle}>Διόρθωση</Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: C.card,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <Ionicons name="storefront-outline" size={18} color={C.tint} />
              <Text style={{ fontSize: 15, fontWeight: "700" }} numberOfLines={1}>
                {storeChain}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: C.sub, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Προϊόντα · {items.length}
            </Text>
            <Pressable onPress={addItem} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="add-circle" size={20} color={C.tint} />
              <Text style={{ color: C.tint, fontSize: 14, fontWeight: "600" }}>Νέο</Text>
            </Pressable>
          </View>

          {saving ? (
            <AppleCard>
              <Skeleton style={{ height: 18, width: 120, marginBottom: 14 }} />
              {[0, 1, 2].map((i) => (
                <View key={i}>
                  {i > 0 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.separator, marginVertical: 10 }} />}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 }}>
                    <Skeleton style={{ width: 30, height: 30, borderRadius: 8 }} />
                    <Skeleton style={{ flex: 1, height: 16 }} />
                    <Skeleton style={{ width: 60, height: 16 }} />
                  </View>
                </View>
              ))}
              <Skeleton style={{ height: 48, marginTop: 16, borderRadius: 16 }} />
            </AppleCard>
          ) : (
            <AppleCard>
              {items.length === 0 && (
                <Text style={{ fontSize: 14, color: C.sub, textAlign: "center", paddingVertical: 20 }}>
                  Δεν υπάρχουν προϊόντα — πάτα «Νέο» για προσθήκη.
                </Text>
              )}
              {items.map((it, idx) => (
                <View key={it.id}>
                  {idx > 0 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.separator, marginVertical: 6 }} />}
                  <View style={{ paddingVertical: 4 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                      {it.confidence > 0 && (
                        <View
                          style={{
                            backgroundColor: confidenceBg(it.confidence),
                            borderRadius: 8,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            marginRight: 8,
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: "700", color: confidenceColor(it.confidence) }}>
                            {(it.confidence * 100).toFixed(0)}%
                          </Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }} />
                      <Pressable onPress={() => removeItem(it.id)} style={{ padding: 4 }}>
                        <Ionicons name="trash-outline" size={18} color={C.red} />
                      </Pressable>
                    </View>

                    <TextInput
                      value={it.name}
                      onChangeText={(v) => updateItem(it.id, "name", v)}
                      placeholder="Όνομα προϊόντος"
                      placeholderTextColor={C.ter}
                      style={styles.nameInput}
                    />

                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
                      <View style={styles.priceWrap}>
                        <TextInput
                          value={it.price}
                          onChangeText={(v) => updateItem(it.id, "price", v)}
                          placeholder="0,00"
                          placeholderTextColor={C.ter}
                          keyboardType="decimal-pad"
                          style={styles.priceInput}
                        />
                        <Text style={{ fontSize: 15, color: C.sub, marginRight: 4 }}>€</Text>
                      </View>
                      <View style={styles.qtyWrap}>
                        <TextInput
                          value={it.quantity}
                          onChangeText={(v) => updateItem(it.id, "quantity", v)}
                          placeholder="Ποσ."
                          placeholderTextColor={C.ter}
                          keyboardType="number-pad"
                          style={styles.qtyInput}
                        />
                      </View>
                      <View style={styles.unitWrap}>
                        <TextInput
                          value={it.unit}
                          onChangeText={(v) => updateItem(it.id, "unit", v)}
                          placeholder="Μον."
                          placeholderTextColor={C.ter}
                          style={styles.unitInput}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </AppleCard>
          )}

          {rawText.length > 0 && (
            <Pressable
              onPress={() => setShowRaw((v) => !v)}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16, marginBottom: 8 }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: C.sub, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Αρχικό κείμενο OCR
              </Text>
              <Ionicons name={showRaw ? "chevron-up" : "chevron-down"} size={16} color={C.sub} />
            </Pressable>
          )}
          {showRaw && rawText.length > 0 && (
            <View style={{ backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <Text style={{ fontSize: 12, color: C.sub, lineHeight: 18, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }}>
                {rawText}
              </Text>
            </View>
          )}

          <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
            <Pressable
              onPress={handleCancel}
              disabled={saving}
              style={{
                flex: 1,
                backgroundColor: C.card,
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: "center",
                opacity: saving ? 0.5 : 1,
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: "600", color: C.red }}>Ακύρωση</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={{
                flex: 2,
                backgroundColor: C.green,
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: "center",
                opacity: saving ? 0.6 : 1,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 17, fontWeight: "800" }}>Αποθήκευση</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: C.bg,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  nameInput: {
    fontSize: 15,
    fontWeight: "500",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: C.bg,
    borderRadius: 10,
    color: C.text,
  },
  priceWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  priceInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    paddingVertical: 8,
    textAlign: "right",
    color: C.text,
  },
  qtyWrap: {
    width: 70,
    backgroundColor: C.bg,
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  qtyInput: {
    fontSize: 14,
    paddingVertical: 8,
    textAlign: "center",
    color: C.text,
  },
  unitWrap: {
    width: 70,
    backgroundColor: C.bg,
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  unitInput: {
    fontSize: 14,
    paddingVertical: 8,
    textAlign: "center",
    color: C.text,
  },
});
