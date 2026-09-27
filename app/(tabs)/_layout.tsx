import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../../src/components/Apple";

const TABS: { name: string; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { name: "index", icon: "home", label: "Αρχική" },
  { name: "scan", icon: "camera", label: "Scan" },
  { name: "watchlist", icon: "heart", label: "Λίστα" },
  { name: "profile", icon: "person", label: "Προφίλ" },
];

export default function Layout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.tint,
        tabBarInactiveTintColor: C.sub,
        tabBarStyle: {
          backgroundColor: "#F9F9FB",
          borderTopWidth: 0.5,
          borderTopColor: "rgba(60,60,67,0.14)",
          height: 68,
          paddingBottom: 4,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.label,
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? t.icon : (`${t.icon}-outline` as any)} size={26} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
