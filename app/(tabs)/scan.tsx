import { useState, useRef, useEffect, useCallback } from "react";
import { View, Text, Pressable, TextInput, ScrollView, Alert, StyleSheet, Animated, Easing } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import TextRecognition from "@react-native-ml-kit/text-recognition";
import { parseGreekReceipt } from "../../src/parser/greekReceiptParser";
import { supabase } from "../../src/lib/supabase";
import { C, AppleCard, EmojiTile } from "../../src/components/Apple";

const SAMPLE = "ΣΚΛΑΒΕΝΙΤΗΣ\nΦΕΤΑ ΠΟΠ 400G 4,89\nΓΑΛΑ 1L 1,89\nΣΥΝΟΛΟ 6,78";

function ReceiptScanOverlay() {
  const scanLineY = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const lineAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineY, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanLineY, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    const textAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 0.4,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    lineAnim.start();
    textAnim.start();
    return () => {
      lineAnim.stop();
      textAnim.stop();
    };
  }, [scanLineY, textOpacity]);

  const translateY = scanLineY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 260],
  });

  return (
    <View style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: "30%", backgroundColor: "rgba(0,0,0,0.55)" }} />
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "30%", backgroundColor: "rgba(0,0,0,0.55)" }} />
      <View style={{ position: "absolute", top: "30%", left: 0, right: 0, height: 2, backgroundColor: "rgba(0,168,107,0.3)" }} />
      <Animated.View
        style={{
          position: "absolute",
          top: "30%",
          left: 0,
          right: 0,
          height: 3,
          backgroundColor: "#00A86B",
          shadowColor: "#00A86B",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9,
          shadowRadius: 12,
          elevation: 8,
          transform: [{ translateY }],
        }}
      />
      <Animated.View
        style={{
          position: "absolute",
          top: "38%",
          left: 0,
          right: 0,
          alignItems: "center",
          opacity: textOpacity,
        }}
      >
        <View style={{ backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 }}>
          <Text style={{ color: "#00A86B", fontSize: 12, fontWeight: "700", letterSpacing: 1 }}>SCANNING</Text>
        </View>
      </Animated.View>
    </View>
  );
}

function BarcodeScanOverlay() {
  const laserX = useRef(new Animated.Value(0)).current;
  const bracketPulse = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const laserAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(laserX, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(laserX, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(bracketPulse, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bracketPulse, {
          toValue: 0.8,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    laserAnim.start();
    pulseAnim.start();
    return () => {
      laserAnim.stop();
      pulseAnim.stop();
    };
  }, [laserX, bracketPulse]);

  const translateX = laserX.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 280],
  });

  const bracketScale = bracketPulse.interpolate({
    inputRange: [0.8, 1],
    outputRange: [1, 1.08],
  });

  const bracketOpacity = bracketPulse.interpolate({
    inputRange: [0.8, 1],
    outputRange: [0.7, 1],
  });

  const CornerBracket = ({ style }: { style: any }) => (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: 28,
          height: 28,
          borderColor: "#FF3B30",
          borderWidth: 3,
          transform: [{ scale: bracketScale }],
          opacity: bracketOpacity,
        },
        style,
      ]}
    />
  );

  return (
    <View style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: "28%", backgroundColor: "rgba(0,0,0,0.6)" }} />
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "28%", backgroundColor: "rgba(0,0,0,0.6)" }} />
      <View style={{ position: "absolute", top: "28%", left: 0, right: 0, height: 2, backgroundColor: "rgba(255,59,48,0.25)" }} />
      <Animated.View
        style={{
          position: "absolute",
          top: "28%",
          left: 0,
          right: 0,
          height: 2,
          backgroundColor: "#FF3B30",
          shadowColor: "#FF3B30",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9,
          shadowRadius: 10,
          elevation: 8,
          transform: [{ translateX }],
        }}
      />
      <View style={{ position: "absolute", top: "28%", left: "10%", right: "10%", height: 280 }}>
        <CornerBracket style={{ top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 }} />
        <CornerBracket style={{ top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 }} />
        <CornerBracket style={{ bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 }} />
        <CornerBracket style={{ bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 }} />
      </View>
    </View>
  );
}

function SuccessAnimation({ children }: { children: React.ReactNode }) {
  const cardScale = useRef(new Animated.Value(0.85)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(150),
        Animated.spring(checkScale, {
          toValue: 1,
          friction: 5,
          tension: 50,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [cardScale, checkScale]);

  return (
    <Animated.View style={{ transform: [{ scale: cardScale }] }}>
      {children}
      <Animated.View
        style={{
          position: "absolute",
          top: -18,
          right: -10,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: C.green,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: C.green,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.5,
          shadowRadius: 8,
          elevation: 6,
          transform: [{ scale: checkScale }],
        }}
      >
        <Ionicons name="checkmark" size={22} color="#fff" />
      </Animated.View>
    </Animated.View>
  );
}

export default function Scan() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const [barcodeMode, setBarcodeMode] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState<{ found: boolean; name?: string; id?: string } | null>(null);
  const [manualBarcode, setManualBarcode] = useState("");
  const camRef = useRef<CameraView>(null);
  const lastBarcodeRef = useRef<string>("");
  const parsed = raw ? parseGreekReceipt(raw) : null;

  async function snap() {
    if (!camRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBusy(true);
    try {
      const photo = await camRef.current.takePictureAsync({ quality: 0.8 });
      const out = await TextRecognition.recognize(photo.uri);
      setRaw(out.text || "");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Δεν διάβασα καλά", "Κράτα σταθερά, καλό φως, ξαναπροσπάθησε.");
    } finally {
      setBusy(false);
    }
  }

  async function handleBarcodeScan({ data }: { data: string }) {
    if (data === lastBarcodeRef.current) return;
    lastBarcodeRef.current = data;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      if (!supabase) return;
      const { data: product } = await supabase
        .from("products")
        .select("id, name_el")
        .eq("barcode", data)
        .limit(1)
        .single();
      if (product) {
        setBarcodeResult({ found: true, name: (product as any).name_el, id: (product as any).id });
      } else {
        setBarcodeResult({ found: false });
      }
    } catch {
      setBarcodeResult({ found: false });
    }
  }

  function addToReceiptFromBarcode() {
    if (!barcodeResult?.found || !barcodeResult.name) return;
    const existing = raw ? `${raw}\n` : "";
    setRaw(`${existing}${barcodeResult.name} 0,00`);
    setBarcodeResult(null);
    setBarcodeMode(false);
    lastBarcodeRef.current = "";
  }

  function addManualToReceipt() {
    if (!barcodeResult?.found || !barcodeResult.name) return;
    const existing = raw ? `${raw}\n` : "";
    setRaw(`${existing}${barcodeResult.name} 0,00`);
    setBarcodeResult(null);
    setBarcodeMode(false);
    lastBarcodeRef.current = "";
  }

  function resetBarcode() {
    setBarcodeResult(null);
    setManualBarcode("");
    lastBarcodeRef.current = "";
  }

  async function save() {
    if (!parsed) return;
    if (!supabase) {
      Alert.alert("Χωρίς Supabase", "Βάλε τα κλειδιά στο .env για αποθήκευση τιμών.");
      return;
    }
    try {
      const { data: store } = await supabase.from("stores").select("id").eq("chain", parsed.storeChain).limit(1).single();
      for (const it of parsed.items) {
        const { data: prod } = await supabase
          .from("products")
          .upsert({ name_el: it.name, category: "Άλλα" }, { onConflict: "name_el" })
          .select("id")
          .single();
        if (prod && store) await supabase.from("prices").insert({ product_id: prod.id, store_id: (store as any).id, price: it.price });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Αποθηκεύτηκε", `${parsed.items.length} προϊόντα από ${parsed.storeChain}`);
      setRaw("");
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Κάτι πήγε στραβά", "Έλεγξε το internet και ξαναπροσπάθησε.");
    }
  }

  if (permission && !permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <Ionicons name="camera-outline" size={34} color="#fff" />
        </View>
        <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 8 }}>Πρόσβαση στην κάμερα</Text>
        <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 15, textAlign: "center", marginBottom: 28 }}>
          Βγάλε φωτογραφία την απόδειξη για αυτόματο διάβασμα προϊόντων και τιμών.
        </Text>
        <Pressable
          onPress={async () => { await requestPermission(); Haptics.selectionAsync(); }}
          style={{ backgroundColor: C.tint, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 999 }}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Ενεργοποίηση</Text>
        </Pressable>
        <Pressable onPress={() => setRaw(SAMPLE)} style={{ marginTop: 18 }}>
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}>Δοκίμασε με δείγμα απόδειξης</Text>
        </Pressable>
      </View>
    );
  }

  if (barcodeMode) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          flash={flash ? "on" : "off"}
          ref={camRef}
          barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39"] }}
          onBarcodeScanned={handleBarcodeScan}
        />
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "box-none" }}>
          <View style={{ flex: 1, margin: 20, borderRadius: 24, borderWidth: 2, borderColor: "rgba(255,255,255,0.5)", overflow: "hidden", position: "relative" }}>
            <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.15)" }} />
            <BarcodeScanOverlay />
            <View style={{ position: "absolute", top: 18, left: 0, right: 0, alignItems: "center" }}>
              <View style={{ backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 }}>
                <Text style={{ color: "#fff", fontSize: 13.5, fontWeight: "600" }}>Στόκασε τον barcode 📦</Text>
              </View>
            </View>
          </View>

          {barcodeResult && (
            <View style={{ position: "absolute", bottom: 120, left: 20, right: 20 }}>
              {barcodeResult.found ? (
                <SuccessAnimation>
                  <View style={{ backgroundColor: "rgba(0,0,0,0.85)", borderRadius: 16, padding: 16 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <Ionicons name="checkmark-circle" size={24} color={C.green} />
                      <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", flex: 1 }}>{barcodeResult.name}</Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <Pressable onPress={addToReceiptFromBarcode} style={{ flex: 1, backgroundColor: C.green, borderRadius: 12, paddingVertical: 12, alignItems: "center" }}>
                        <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>Προσθήκη ✓</Text>
                      </Pressable>
                      <Pressable onPress={resetBarcode} style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 12, paddingVertical: 12, alignItems: "center" }}>
                        <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>Νέο</Text>
                      </Pressable>
                    </View>
                  </View>
                </SuccessAnimation>
              ) : (
                <View style={{ backgroundColor: "rgba(0,0,0,0.85)", borderRadius: 16, padding: 16 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <Ionicons name="close-circle" size={24} color={C.red} />
                    <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Προϊόν δεν βρέθηκε</Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Pressable
                      onPress={() => {
                        setBarcodeResult(null);
                        setBarcodeMode(false);
                      }}
                      style={{ flex: 1, backgroundColor: C.orange, borderRadius: 12, paddingVertical: 12, alignItems: "center" }}
                    >
                      <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>Προσθήκη χειροκίνητα</Text>
                    </Pressable>
                    <Pressable onPress={resetBarcode} style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 12, paddingVertical: 12, alignItems: "center" }}>
                      <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>Νέο</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          )}

          <View style={{ alignItems: "center", marginTop: "auto", marginBottom: 56 }}>
            <View style={{ flexDirection: "row", alignItems: "center", width: 260, justifyContent: "space-between" }}>
              <Pressable onPress={() => setFlash(f => !f)} style={styles.ctrlBtn}>
                <Ionicons name={flash ? "flash" : "flash-off"} size={22} color="#fff" />
              </Pressable>
              <Pressable onPress={() => { setBarcodeMode(false); resetBarcode(); Haptics.selectionAsync(); }} style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="close" size={30} color="#fff" />
              </Pressable>
              <Pressable onPress={() => Haptics.selectionAsync()} style={styles.ctrlBtn}>
                <Ionicons name="images-outline" size={22} color="#fff" />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {raw === "" ? (
        <View style={{ flex: 1 }}>
          <CameraView style={{ flex: 1 }} facing="back" flash={flash ? "on" : "off"} ref={camRef} />
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "box-none" }}>
            <View style={{ flex: 1, margin: 20, borderRadius: 24, borderWidth: 2, borderColor: "rgba(255,255,255,0.5)", overflow: "hidden", position: "relative" }}>
              <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.15)" }} />
              <ReceiptScanOverlay />
              <View style={{ position: "absolute", top: 18, left: 0, right: 0, alignItems: "center" }}>
                <View style={{ backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 }}>
                  <Text style={{ color: "#fff", fontSize: 13.5, fontWeight: "600" }}>Στόκασε την απόδειξη 📄</Text>
                </View>
              </View>
            </View>

            <View style={{ alignItems: "center", marginTop: "auto", marginBottom: 56 }}>
              <View style={{ flexDirection: "row", alignItems: "center", width: 260, justifyContent: "space-between" }}>
                <Pressable onPress={() => setFlash(f => !f)} style={styles.ctrlBtn}>
                  <Ionicons name={flash ? "flash" : "flash-off"} size={22} color="#fff" />
                </Pressable>
                <Pressable onPress={snap} disabled={busy} style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: "#fff", alignItems: "center", justifyContent: "center", opacity: busy ? 0.5 : 1 }}>
                  <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#fff" }} />
                </Pressable>
                <Pressable onPress={() => { setBarcodeMode(true); resetBarcode(); Haptics.selectionAsync(); }} style={styles.ctrlBtn}>
                  <Ionicons name="barcode-outline" size={22} color="#fff" />
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingTop: 70 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <Text style={{ fontSize: 26, fontWeight: "800", letterSpacing: -0.4 }}>Αποτέλεσμα</Text>
            <Pressable onPress={() => { setRaw(""); Haptics.selectionAsync(); }}>
              <Text style={{ color: C.tint, fontSize: 15, fontWeight: "600" }}>Νέα σάρωση</Text>
            </Pressable>
          </View>

          {parsed && (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 }}>
                  <Ionicons name="storefront-outline" size={18} color={C.tint} />
                  <Text style={{ fontSize: 15, fontWeight: "700" }}>{parsed.storeChain}</Text>
                  <Text style={{ fontSize: 13, color: C.sub }}>({(parsed.storeConfidence * 100).toFixed(0)}%)</Text>
                </View>
                <View style={{ backgroundColor: parsed.confidence > 0.6 ? "rgba(52,199,89,0.12)" : "rgba(255,149,0,0.12)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: parsed.confidence > 0.6 ? "#1F8A4C" : "#B25000" }}>
                    {(parsed.confidence * 100).toFixed(0)}%
                  </Text>
                </View>
              </View>

              <AppleCard style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: C.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
                  Προϊόντα · {parsed.items.length}
                </Text>
                {parsed.items.length === 0 && (
                  <Text style={{ fontSize: 14, color: C.sub }}>Δεν βρέθηκαν τιμές — διόρθωσε παρακάτω.</Text>
                )}
                {parsed.items.map((it, i) => (
                  <View key={i}>
                    {i > 0 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.separator, marginVertical: 4 }} />}
                    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 6 }}>
                      <EmojiTile emoji="🧾" size={30} bg="#F2F2F7" />
                      <TextInput
                        value={it.name}
                        onChangeText={v => setRaw(r => r.replace(it.raw, `${v} ${it.price.toFixed(2).replace(".", ",")}`))}
                        style={{ flex: 1, fontSize: 15, marginLeft: 10, paddingVertical: 4 }}
                      />
                      <TextInput
                        value={it.price.toFixed(2)}
                        onChangeText={v => setRaw(r => r.replace(it.raw, `${it.name} ${v}`))}
                        keyboardType="decimal-pad"
                        style={{ fontSize: 15, fontWeight: "700", width: 70, textAlign: "right", paddingVertical: 4 }}
                      />
                    </View>
                  </View>
                ))}
                <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.separator, marginVertical: 8 }} />
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: C.sub }}>Σύνολο</Text>
                  <Text style={{ fontSize: 20, fontWeight: "800" }}>{parsed.total?.toFixed(2)}€</Text>
                </View>
              </AppleCard>

              {parsed.confidence < 0.6 && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,149,0,0.1)", borderRadius: 12, padding: 12, marginBottom: 14 }}>
                  <Ionicons name="warning-outline" size={18} color="#B25000" />
                  <Text style={{ flex: 1, fontSize: 13.5, color: "#8A3D00" }}>Η ανάγνωση δεν ήταν καθαρή — διόρθωσε τα παραπάνω πριν αποθηκεύσεις.</Text>
                </View>
              )}

              <Pressable
                onPress={() => {
                  setRaw("");
                  Haptics.selectionAsync();
                }}
                style={{ backgroundColor: C.orange, borderRadius: 16, paddingVertical: 16, alignItems: "center", marginBottom: 12 }}
              >
                <Text style={{ color: "#fff", fontSize: 17, fontWeight: "800" }}>Νέα σάρωση</Text>
              </Pressable>

              <Pressable
                onPress={save}
                disabled={busy}
                style={{ backgroundColor: C.green, borderRadius: 16, paddingVertical: 16, alignItems: "center", opacity: busy ? 0.6 : 1 }}
              >
                <Text style={{ color: "#fff", fontSize: 17, fontWeight: "800" }}>Καταχώρηση ✓</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ctrlBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
});
