import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ErrorBoundary from "../src/components/ErrorBoundary";
import { useAuth } from "../src/lib/supabase";

const AUTH_SCREENS = ["login", "signup"];

export default function RootLayout() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const root = segments[0] as string | undefined;
    const leaf = segments[segments.length - 1] as string | undefined;
    const onAuthScreen = root === "(auth)" && AUTH_SCREENS.includes(leaf ?? "");
    const onCallback = root === "auth";
    if (!user && !onAuthScreen && !onCallback) router.replace("/login");
    else if (user && onAuthScreen) router.replace("/(tabs)");
  }, [user, loading, segments, router]);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }} />
        {loading && <View style={styles.splash} />}
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  splash: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
  },
});
