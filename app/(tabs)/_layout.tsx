import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import type { GestureResponderEvent } from "react-native";

const ACTIVE_TINT = "#1A2233";
const INACTIVE_TINT = "#8E8E93";

type ScanTabButtonProps = {
  onPress?: ((event: GestureResponderEvent) => void) | null;
  onLongPress?: ((event: GestureResponderEvent) => void) | null;
  accessibilityState?: { selected?: boolean };
  accessibilityLabel?: string;
  testID?: string;
};

function ScanTabButton({ onPress, onLongPress, accessibilityState, accessibilityLabel, testID }: ScanTabButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      accessibilityRole="button"
      style={styles.scanButton}
    >
      <View style={styles.scanCircle}>
        <Ionicons name="camera" size={26} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}

function TabBarBackground() {
  return (
    <View style={styles.backgroundBase}>
      <BlurView intensity={85} tint="light" style={styles.blur} />
    </View>
  );
}

export default function Layout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE_TINT,
        tabBarInactiveTintColor: INACTIVE_TINT,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
        tabBarStyle: {
          position: "absolute",
          bottom: 22,
          left: 20,
          right: 20,
          height: 74,
          borderRadius: 28,
          borderTopWidth: 0,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: "rgba(0,0,0,0.08)",
          backgroundColor: "transparent",
          elevation: 0,
          paddingBottom: 0,
        },
        tabBarBackground: () => <TabBarBackground />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Αρχική",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarButton: (props) => <ScanTabButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="watchlist"
        options={{
          title: "Λίστα",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "heart" : "heart-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Κοινότητα",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "people" : "people-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Προφίλ",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  backgroundBase: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 28,
    overflow: "hidden",
  },
  blur: {
    flex: 1,
    borderRadius: 28,
    overflow: "hidden",
  },
  scanButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scanCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#1A2233",
    marginTop: -34,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});
