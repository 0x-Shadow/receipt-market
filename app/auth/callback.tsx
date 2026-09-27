import { useEffect, useRef } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/lib/supabase";
import { C } from "../../src/components/Apple";

const GIVE_UP_AFTER_MS = 4000;

export default function AuthCallback() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const settled = useRef(false);

  useEffect(() => {
    if (loading || user || settled.current) return;
    settled.current = true;
    const timer = setTimeout(() => router.replace("/login"), GIVE_UP_AFTER_MS);
    return () => clearTimeout(timer);
  }, [loading, user, router]);

  useEffect(() => {
    if (loading || !user) return;
    settled.current = true;
    router.replace("/(tabs)");
  }, [loading, user, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={C.tint} />
      <Text style={styles.text}>Ολοκληρώνουμε τη σύνδεση…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  text: {
    fontSize: 15,
    color: "#6B7280",
  },
});
