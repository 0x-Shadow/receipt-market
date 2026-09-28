import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TABS: { name: string; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { name: "index", icon: "home", label: "Αρχική" },
  { name: "scan", icon: "camera", label: "Scan" },
  { name: "watchlist", icon: "heart", label: "Λίστα" },
  { name: "community", icon: "people", label: "Κοινότητα" },
  { name: "profile", icon: "person", label: "Προφίλ" },
];

const ACTIVE = "#1A2233";
const INACTIVE = "#8E8E93";
const DOT_W = 18;

type Cell = { x: number; width: number };

function FloatingTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const barBottom = Math.max(insets.bottom, 12) + 10;
  const dotX = useRef(new Animated.Value(0)).current;
  const dotOpacity = useRef(new Animated.Value(0)).current;
  const cells = useRef<Record<string, Cell>>({});
  const [measuredKey, setMeasuredKey] = useState<string | null>(null);

  const moveDot = (key: string, instant = false) => {
    const l = cells.current[key];
    if (!l) return;
    const toValue = l.x + l.width / 2 - DOT_W / 2;
    if (instant) {
      dotX.setValue(toValue);
      Animated.timing(dotOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      return;
    }
    Animated.spring(dotX, { toValue, useNativeDriver: true, mass: 0.6, damping: 18, stiffness: 220 }).start();
  };

  useEffect(() => {
    const route = state.routes[state.index];
    if (cells.current[route.key]) moveDot(route.key);
  }, [state.index]);

  useEffect(() => {
    if (measuredKey) {
      const route = state.routes[state.index];
      if (route.key === measuredKey) moveDot(route.key, true);
    }
  }, [measuredKey]);

  const onTabPress = (route: any, focused: boolean) => {
    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (event.defaultPrevented) return;
    if (!focused) {
      void Haptics.selectionAsync();
      navigation.navigate(route.name);
    } else {
      void Haptics.selectionAsync();
    }
  };

  const onCellLayout = (key: string, e: any) => {
    const { x, width } = e.nativeEvent.layout;
    const prev = cells.current[key];
    if (prev && Math.abs(prev.x - x) < 0.5 && Math.abs(prev.width - width) < 0.5) return;
    cells.current[key] = { x, width };
    setMeasuredKey(key);
  };

  return (
    <View style={[styles.wrap, { bottom: barBottom }]} pointerEvents="box-none">
      <View style={styles.pill}>
        <View style={styles.base} />
        <BlurView intensity={85} tint="light" style={StyleSheet.absoluteFill} />
        <Animated.View style={[styles.dot, { opacity: dotOpacity, transform: [{ translateX: dotX }] }]} />
        <View style={styles.row}>
          {state.routes.map((route: any, index: number) => {
            const meta = TABS.find((t) => t.name === route.name);
            if (!meta) return null;
            const focused = state.index === index;
            const color = focused ? ACTIVE : INACTIVE;
            if (route.name === "scan") {
              return (
                <View
                  key={route.key}
                  style={styles.cell}
                  onLayout={(e) => onCellLayout(route.key, e)}
                >
                  <Pressable
                    onPress={() => onTabPress(route, focused)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: focused }}
                    accessibilityLabel="Scan"
                    style={({ pressed }) => [styles.scanHit, { opacity: pressed ? 0.85 : 1 }]}
                  >
                    <View style={styles.scanCircle}>
                      <Ionicons name="camera" size={26} color="#FFFFFF" />
                    </View>
                  </Pressable>
                  <Animated.Text style={[styles.label, { color }]}>Scan</Animated.Text>
                </View>
              );
            }
            return (
              <View key={route.key} style={styles.cell} onLayout={(e) => onCellLayout(route.key, e)}>
                <Pressable
                  onPress={() => onTabPress(route, focused)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: focused }}
                  accessibilityLabel={meta.label}
                  style={({ pressed }) => [styles.tabHit, { transform: [{ scale: pressed ? 0.88 : 1 }] }]}
                >
                  <Ionicons
                    name={focused ? meta.icon : (`${meta.icon}-outline` as any)}
                    size={24}
                    color={color}
                  />
                  <Animated.Text style={[styles.label, { color }]}>{meta.label}</Animated.Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function Layout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props: any) => <FloatingTabBar {...props} />}
    >
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{ title: t.label }} />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 22,
    height: 108,
    justifyContent: "flex-end",
  },
  pill: {
    height: 74,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#0B1220",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  base: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch",
  },
  cell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingTop: 10,
  },
  tabHit: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
  },
  scanHit: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: -44,
  },
  scanCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#1A2233",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0B1220",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  dot: {
    position: "absolute",
    bottom: 9,
    left: 0,
    width: DOT_W,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#1A2233",
  },
});
