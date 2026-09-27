import { useState } from "react";
import { View, Text, ScrollView, Pressable, Switch, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { supabase } from "../../src/lib/supabase";
import { C, Group, RowSeparator, ListRow, StatCard } from "../../src/components/Apple";

export default function Profile() {
  const [notifs, setNotifs] = useState(true);
  const [sync, setSync] = useState(true);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={{ marginTop: 56, marginBottom: 20 }}>
        <Text style={{ fontSize: 34, fontWeight: "800", letterSpacing: -0.5 }}>Προφίλ</Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 22 }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.tint, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="person" size={28} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "700" }}>Χρήστης</Text>
          <Text style={{ fontSize: 13.5, color: C.sub, marginTop: 1 }}>
            {supabase ? "Συνδεδεμένος με Supabase" : "Τοπικά · χωρίς σύνδεση"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={17} color={C.ter} />
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 26 }}>
        <StatCard value="12" label="Αποδείξεις" />
        <StatCard value="8" label="Προϊόντα" />
        <StatCard value="18,40€" label="Εξοικονόμηση" accent={C.green} />
      </View>

      <Text style={styles.groupLabel}>Ρυθμίσεις</Text>
      <Group>
        <ListRow
          icon="notifications"
          iconBg={C.red}
          title="Ειδοποιήσεις"
          subtitle="Push όταν πέσει μια τιμή"
          chevron={false}
          right={
            <Switch
              value={notifs}
              onValueChange={v => { setNotifs(v); Haptics.selectionAsync(); }}
              trackColor={{ false: "#E5E5EA", true: C.green }}
              thumbColor="#fff"
            />
          }
        />
        <RowSeparator />
        <ListRow icon="language" iconBg={C.tint} title="Γλώσσα" subtitle="Ελληνικά" />
        <RowSeparator />
        <ListRow
          icon="cloud"
          iconBg="#5E5CE6"
          title="Συγχρονισμός Supabase"
          subtitle={supabase ? "Ενεργός" : "Ανενεργός — βάλε .env"}
          chevron={false}
          right={
            <Switch
              value={sync && !!supabase}
              disabled={!supabase}
              onValueChange={v => { setSync(v); Haptics.selectionAsync(); }}
              trackColor={{ false: "#E5E5EA", true: C.green }}
              thumbColor="#fff"
            />
          }
        />
      </Group>

      <Text style={[styles.groupLabel, { marginTop: 26 }]}>Άλλα</Text>
      <Group>
        <ListRow icon="help-buoy" iconBg={C.orange} title="Βοήθεια & Σχόλια" />
        <RowSeparator />
        <ListRow icon="star" iconBg="#FFCC00" title="Βαθμολογήστε το app" />
        <RowSeparator />
        <ListRow icon="information-circle" iconBg={C.sub} title="Σχετικά" subtitle="Έκδοση 0.2.0" />
      </Group>

      <Text style={{ textAlign: "center", color: C.ter, fontSize: 12.5, marginTop: 30 }}>
        receipt-market · φτιαγμένο στην Ελλάδα 🇬🇷
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  groupLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: C.sub,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 16,
    marginBottom: 8,
  },
});
