import { Tabs } from "expo-router";

export default function Layout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: "#007AFF" }}>
      <Tabs.Screen name="index" options={{ title: "Αρχική", tabBarLabel: "Αρχική" }} />
      <Tabs.Screen name="scan" options={{ title: "Scan", tabBarLabel: "Scan" }} />
      <Tabs.Screen name="watchlist" options={{ title: "Λίστα", tabBarLabel: "Λίστα" }} />
      <Tabs.Screen name="profile" options={{ title: "Προφίλ", tabBarLabel: "Προφίλ" }} />
    </Tabs>
  );
}
