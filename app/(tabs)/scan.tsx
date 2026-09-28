import { useState, useRef, useEffect, useCallback } from "react";
// useCallback above; keep handler identities stable so the native camera view
// is not reconfigured on every render.
import { View, Text, Pressable, TextInput, ScrollView, Alert, StyleSheet, Animated, Easing } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeSettings } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import TextRecognition from "@react-native-ml-kit/text-recognition";
import { parseGreekReceipt } from "../../src/parser/greekReceiptParser";
import { parseDocument } from "../../src/mydata/parseDocument";
import { normalizeReceipt } from "../../src/mydata/normalizeReceipt";
import { receiptHash } from "../../src/mydata/receiptHash";
import { canonicalTokens } from "../../src/mydata/normalize";
import type { NormalizedRow } from "../../src/mydata/types";
import { supabase } from "../../src/lib/supabase";
import { checkRateLimit } from "../../src/lib/rateLimiter";
import { logError, logInfo } from "../../src/lib/crashReporter";
import { C, AppleCard, EmojiTile } from "../../src/components/Apple";

const SAMPLE = "ΣΚΛΑΒΕΝΙΤΗΣ\nΦΕΤΑ ΠΟΠ 400G 4,89\nΓΑΛΑ 1L 1,89\nΣΥΝΟΛΟ 6,78";
const STRIP_H = 150;

type ReceiptMeta = {
  receiptHash: string;
  mydataMark: string | null;
  issuerVat: string;
  issuerName: string;
  issueDate: string;
};
const BARCODE_SETTINGS: BarcodeSettings = { barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39"] };
const QR_SETTINGS: BarcodeSettings = { barcodeTypes: ["qr"] };

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
  const laserY = useRef(new Animated.Value(0)).current;
  const bracketPulse = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const laserAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(laserY, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(laserY, {
          toValue: 0,
          duration: 1600,
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
  }, [laserY, bracketPulse]);

  const translateY = laserY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, STRIP_H - 2],
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
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: STRIP_H, backgroundColor: "rgba(0,0,0,0.6)" }} />
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "34%", backgroundColor: "rgba(0,0,0,0.6)" }} />
      <View style={{ position: "absolute", left: 0, right: 0, bottom: STRIP_H, height: 2, backgroundColor: "rgba(255,59,48,0.25)" }} />
      <Animated.View
        style={{
          position: "absolute",
          left: "8%",
          right: "8%",
          bottom: 0,
          height: 2,
          backgroundColor: "#FF3B30",
          shadowColor: "#FF3B30",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9,
          shadowRadius: 10,
          elevation: 8,
          transform: [{ translateY }],
        }}
      />
      <View style={{ position: "absolute", left: "8%", right: "8%", bottom: 0, height: STRIP_H }}>
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
  const [qrMode, setQrMode] = useState(false);
  const [pendingRows, setPendingRows] = useState<NormalizedRow[] | null>(null);
  const [receiptMeta, setReceiptMeta] = useState<ReceiptMeta | null>(null);
  const [saving, setSaving] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState<{ found: boolean; name?: string; id?: string } | null>(null);
  const [manualBarcode, setManualBarcode] = useState("");
  const camRef = useRef<CameraView>(null);
  const lastBarcodeRef = useRef<string>("");
  const parsed = raw ? parseGreekReceipt(raw) : null;

  const onScan = useCallback(
    (e: any) => {
      if (qrMode) {
        if (e?.type === "qr" && typeof e.data === "string") void handleQr(e.data);
        return;
      }
      if (barcodeMode && typeof e?.data === "string") void handleBarcodeScan(e);
    },
    [qrMode, barcodeMode],
  );

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

  async function pickFromLibrary() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Χρειάζεται άδεια", "Επίτρεψε την πρόσβαση στη συλλογή για να διαλέξεις φωτογραφία.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ["images"] });
    if (res.canceled || !res.assets?.length) return;
    setBusy(true);
    try {
      const out = await TextRecognition.recognize(res.assets[0].uri);
      setRaw(out.text || "");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Δεν διάβασα καλά", "Δοκίμασε μια καθαρότερη φωτογραφία.");
    } finally {
      setBusy(false);
    }
  }

  async function handleQr(data: string) {
    if (!/^https?:\/\//i.test(data)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBusy(true);
    try {
      const detailUrl = data.replace(/\/+$/, "") + "/myDATA";
      const res = await fetch(detailUrl);
      if (!res.ok) throw new Error(`http ${res.status}`);
      const xml = await res.text();
      const receipt = parseDocument(xml);
      const rows = normalizeReceipt(receipt);
      if (rows.length === 0) throw new Error("no usable lines");
      setReceiptMeta({
        receiptHash: await receiptHash(receipt),
        mydataMark: receipt.mark,
        issuerVat: receipt.issuerVat,
        issuerName: receipt.issuerName,
        issueDate: receipt.issueDate,
      });
      setPendingRows(rows);
      setQrMode(false);
    } catch (e) {
      logError(e as Error, { context: "mydata_fetch" });
      Alert.alert(
        "Δεν μπόρεσα να διαβάσω το QR",
        "Δοκίμασε φωτογραφία της απόδειξης ή κάνε εισαγωγή από τη συλλογή.",
      );
    } finally {
      setBusy(false);
    }
  }

  function buildOverrides(rows: NormalizedRow[]): Record<string, string> {
    const out: Record<string, string> = {};
    for (const r of rows) {
      const edited = r.description.trim();
      if (edited && canonicalTokens(edited) !== r.nameNormalized) {
        out[r.nameNormalized] = canonicalTokens(edited);
      }
    }
    return out;
  }

  async function saveMyDataReceipt() {
    if (!pendingRows || !receiptMeta) return;
    setSaving(true);
    try {
      const client = supabase;
      if (!client) throw new Error("no supabase client");
      const { data: sessionData } = await client.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("no session");

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ingest-receipt`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...receiptMeta,
            rows: pendingRows,
            productOverrides: buildOverrides(pendingRows),
          }),
        },
      );
      const out = await res.json();
      if (!res.ok) throw new Error(out?.error ?? "save failed");
      setPendingRows(null);
      setReceiptMeta(null);
      Alert.alert(
        out.duplicate ? "Ήταν ήδη αποθηκευμένη" : "Αποθηκεύτηκε",
        out.duplicate
          ? "Αυτή η απόδειξη υπάρχει ήδη στο ιστορικό σου."
          : `${out.created} τιμές προστέθηκαν.`,
      );
    } catch (e) {
      logError(e as Error, { context: "mydata_save" });
      Alert.alert("Κάτι πήγε στραβά", "Έλεγξε το internet και ξαναπροσπάθησε.");
    } finally {
      setSaving(false);
    }
  }

  async function handleBarcodeScan({ data }: { data: string }) {    if (data === lastBarcodeRef.current) return;
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
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id ?? "anonymous";
      if (!checkRateLimit(`scan:${userId}`, 5, 60_000)) {
        Alert.alert("Πολλές αιτήσεις", "Περίμενε λίγο πριν ξαναπροσπαθήσεις.");
        return;
      }
      const { data: store } = await supabase.from("stores").select("id").eq("chain", parsed.storeChain).limit(1).single();
      const { data: receipt, error: receiptError } = await supabase
        .from("receipts")
        .insert({
          user_id: userId,
          store_id: (store as any).id,
          total: parsed.total,
          item_count: parsed.items.length,
          parsed_confidence: parsed.confidence,
        })
        .select("id")
        .single();
      if (receiptError || !receipt) throw receiptError;
      let priceErrors = 0;
      for (const it of parsed.items) {
        const { data: prod } = await supabase
          .from("products")
          .upsert({ name_el: it.name, category: "Άλλα" }, { onConflict: "name_el" })
          .select("id")
          .single();
        if (prod && store) {
          const { error: priceError } = await supabase
            .from("prices")
            .insert({ product_id: prod.id, store_id: (store as any).id, receipt_id: (receipt as any).id, price: it.price });
          if (priceError) priceErrors++;
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      logInfo("scan_save_success", { itemCount: parsed.items.length, store: parsed.storeChain });
      if (priceErrors > 0) {
        Alert.alert("Αποθηκεύτηκε με προβλήματα", `Η απόδειξη αποθηκεύτηκε αλλά ${priceErrors} τιμές απέτυχαν.`);
      } else {
        Alert.alert("Αποθηκεύτηκε", `${parsed.items.length} προϊόντα από ${parsed.storeChain}`);
      }
      setRaw("");
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      logError(e as Error, { context: "scan_save" });
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

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {pendingRows ? (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingTop: 56, paddingBottom: 140 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={{ fontSize: 28, fontWeight: "800", letterSpacing: -0.5 }}>Έλεγξε τα προϊόντα</Text>
            <Text style={{ fontSize: 14, color: C.sub, marginTop: 6, marginBottom: 18, lineHeight: 20 }}>
              Διόρθωσε ό,τι δεν αναγνωρίστηκε σωστά. Όσα αφήσεις σωστά, θα
              χρησιμοποιηθούν για να βρίσκουμε πού είναι φθηνότερα.
            </Text>

            {pendingRows.map((r, i) => (
              <AppleCard key={`${r.itemCode ?? i}`} style={{ marginBottom: 10 }}>
                <TextInput
                  value={r.description}
                  onChangeText={(v) => {
                    const next = [...pendingRows];
                    next[i] = { ...r, description: v };
                    setPendingRows(next);
                  }}
                  placeholderTextColor={C.sub}
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: C.text,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: C.separator,
                    paddingVertical: 8,
                  }}
                />
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                  <Text style={{ fontSize: 13, color: C.sub }}>
                    {r.qty > 1 ? `${r.qty} × ${r.price.toFixed(2).replace(".", ",")}€` : "1 τεμ."}
                    {r.vatRate !== null ? ` · ΦΠΑ ${r.vatRate}%` : ""}
                  </Text>
                  <Text style={{ fontSize: 15, fontWeight: "700" }}>
                    {r.price.toFixed(2).replace(".", ",")}€
                  </Text>
                </View>
              </AppleCard>
            ))}
          </ScrollView>

          <View style={{ position: "absolute", left: 16, right: 16, bottom: 130 }}>
            <Pressable
              onPress={saveMyDataReceipt}
              disabled={saving}
              style={{ backgroundColor: C.tint, borderRadius: 14, paddingVertical: 16, alignItems: "center", opacity: saving ? 0.6 : 1 }}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
                {saving ? "Αποθήκευση…" : `Αποθήκευση ${pendingRows.length} προϊόντα`}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => { setPendingRows(null); setReceiptMeta(null); }}
              style={{ paddingVertical: 12, alignItems: "center" }}
            >
              <Text style={{ fontSize: 15, color: C.sub, fontWeight: "600" }}>Ακύρωση</Text>
            </Pressable>
          </View>
        </View>
      ) : raw === "" ? (
        <View style={{ flex: 1 }}>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            flash={flash ? "on" : "off"}
            ref={camRef}
            barcodeScannerSettings={
              qrMode ? QR_SETTINGS : barcodeMode ? BARCODE_SETTINGS : undefined
            }
            onBarcodeScanned={onScan}
          />
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "box-none", paddingTop: 44, paddingBottom: 142 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 }}>
                <Text style={{ color: "#fff", fontSize: 13.5, fontWeight: "600" }}>
                  {barcodeMode
                    ? "Στόκασε τον κωδικό 📦"
                    : qrMode
                      ? "Στόχασε το QR της απόδειξης"
                      : "Στόχασε την απόδειξη 📄"}
                </Text>
              </View>
              <Pressable
                onPress={() => { setFlash(f => !f); Haptics.selectionAsync(); }}
                style={[styles.ctrlBtn, flash && { backgroundColor: "rgba(10,132,255,0.9)" }]}
                accessibilityLabel="Φλας"
              >
                <Ionicons name={flash ? "flash" : "flash-off"} size={20} color="#fff" />
              </Pressable>
            </View>

            {barcodeMode ? (
              <View style={{ flex: 1, marginHorizontal: 20, marginTop: 14, borderRadius: 24, borderWidth: 2, borderColor: "rgba(255,255,255,0.35)", overflow: "hidden", position: "relative" }}>
                <BarcodeScanOverlay />
              </View>
            ) : (
              <View style={{ flex: 1, maxHeight: 500, marginHorizontal: 20, marginTop: 14, borderRadius: 24, borderWidth: 2, borderColor: "rgba(255,255,255,0.5)", overflow: "hidden", position: "relative" }}>
                <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.15)" }} />
                <ReceiptScanOverlay />
              </View>
            )}

            {barcodeMode && barcodeResult && (
              <View style={{ position: "absolute", bottom: 190, left: 20, right: 20 }}>
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
                        onPress={() => { setBarcodeResult(null); setBarcodeMode(false); }}
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

            <View style={{ alignItems: "center", marginTop: 22 }}>
              <View style={{ flexDirection: "row", alignItems: "center", width: 280, justifyContent: "space-between" }}>
                <Pressable
                  onPress={barcodeMode ? undefined : pickFromLibrary}
                  style={[styles.ctrlBtn, barcodeMode && { opacity: 0.4 }]}
                  accessibilityLabel="Επιλογή από τη συλλογή"
                >
                  <Ionicons name="images-outline" size={22} color="#fff" />
                </Pressable>

                {barcodeMode ? (
                  <Pressable
                    onPress={() => { setBarcodeMode(false); resetBarcode(); Haptics.selectionAsync(); }}
                    accessibilityRole="button"
                    accessibilityLabel="Πίσω στη σάρωση απόδειξης"
                    style={styles.shutterBtn}
                  >
                    <Ionicons name="close" size={30} color="#fff" />
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={snap}
                    disabled={busy || qrMode}
                    accessibilityRole="button"
                    accessibilityLabel="Σκάναρε φωτογραφία"
                    style={[styles.shutterBtn, (busy || qrMode) && { opacity: 0.5 }]}
                  >
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#fff" }} />
                  </Pressable>
                )}

                <Pressable
                  onPress={() => {
                    if (barcodeMode) {
                      setBarcodeMode(false);
                      resetBarcode();
                      setQrMode(true);
                    } else {
                      setQrMode(q => !q);
                    }
                    Haptics.selectionAsync();
                  }}
                  style={[styles.ctrlBtn, (qrMode || barcodeMode) && { backgroundColor: "rgba(10,132,255,0.9)" }]}
                  accessibilityLabel={qrMode ? "Επιστροφή στη φωτογραφία" : "Σάρωση QR ή barcode"}
                >
                  <Ionicons name={qrMode ? "camera" : barcodeMode ? "qr-code" : "scan-outline"} size={22} color="#fff" />
                </Pressable>
              </View>
              <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 10, fontWeight: "600" }}>
                {barcodeMode
                  ? "Πίσω στην απόδειξη"
                  : qrMode
                    ? "Σάρωσε το QR ή τον κωδικό"
                    : "Απόδειξη · Barcode · Συλλογή"}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingTop: 70, paddingBottom: 130 }}>
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
  shutterBtn: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
});
