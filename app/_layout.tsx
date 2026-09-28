import { Stack } from "expo-router";
import ErrorBoundary from "../src/components/ErrorBoundary";

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false }} />
    </ErrorBoundary>
  );
}
