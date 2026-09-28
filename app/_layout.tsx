import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ErrorBoundary from "../src/components/ErrorBoundary";

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
