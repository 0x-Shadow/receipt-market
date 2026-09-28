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

const TINT = "#0A84FF";
const ACTIVE = TINT;
const INACTIVE = "#8E8E93";
const ACTIVE_ON_CAMERA = "#FFFFFF";
const INACTIVE_ON_CAMERA = "rgba(255,255,255,0.62)";
const BLOB_H = 40;
const BLOB_W = 40;
const BLOB_MIN_W = 18;
const BLOB_TOP = 8;
const DOT_SIZE = 10;

type Cell = { x: number; width: number };

function FloatingTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const barBottom = Math.max(insets.bottom, 12) + 10;
  const blobX = useRef(new Animated.Value(0)).current;
  const blobW = useRef(new Animated.Value(BLOB_MIN_W)).current;
  const dotX = useRef(new Animated.Value(0)).current;
  const dotLift = useRef(new Animated.Value(0)).current;
  const dotOpacity = useRef(new Animated.Value(0)).current;
  const cells = useRef<Record<string, Cell>>({});
  const [measuredKey, setMeasuredKey] = useState<string | null>(null);

  const moveBlob = (key: string, instant = false) => {
    const l = cells.current[key];
    if (!l) return;
    const center = l.x + l.width / 2;

    blobX.setValue(instant ? center - BLOB_W / 2 : center - BLOB_MIN_W / 2);
    blobW.setValue(instant ? BLOB_W : BLOB_MIN_W);
    dotX.setValue(center - DOT_SIZE / 2);
    dotLift.setValue(0);
    Animated.timing(dotOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();

    if (instant) return;

    // The dot hops toward the destination while the blob stretches behind it.
    Animated.sequence([
      Animated.timing(dotLift, { toValue: -4, duration: 130, useNativeDriver: true }),
      Animated.spring(dotLift, { toValue: 0, useNativeDriver: true, mass: 0.4, damping: 9, stiffness: 260 }),
    ]).start();

    // Squash toward the target, then stretch back to rest: reads as a liquid blob.
    Animated.sequence([
      Animated.spring(blobX, { toValue: center - BLOB_W / 2, useNativeDriver: true, mass: 0.7, damping: 15, stiffness: 180 }),
      Animated.spring(blobW, { toValue: BLOB_W, useNativeDriver: true, mass: 0.5, damping: 12, stiffness: 220 }),
    ]).start();

    Animated.spring(dotX, { toValue: center - DOT_SIZE / 2, useNativeDriver: true, mass: 0.6, damping: 18, stiffness: 220 }).start();
  };

  useEffect(() => {
    const route = state.routes[state.index];
    if (cells.current[route.key]) moveBlob(route.key);
  }, [state.index]);

  useEffect(() => {
    const route = state.routes[state.index];
    if (cells.current[route.key]) moveBlob(route.key, true);
  }, [measuredKey, state.index]);

  const onTabPress = (route: any, focused: boolean) => {    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
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

  const onCamera = state.routes[state.index]?.name === "scan";
  const activeColor = onCamera ? ACTIVE_ON_CAMERA : ACTIVE;
  const inactiveColor = onCamera ? INACTIVE_ON_CAMERA : INACTIVE;

  return (
    <View style={[styles.wrap, { bottom: barBottom }]} pointerEvents="box-none">
      <View style={[styles.pill, onCamera && styles.pillDark]}>
        <View pointerEvents="none" style={styles.clip}>
          <View style={[styles.base, onCamera && styles.baseDark]} />
          <BlurView intensity={85} tint={onCamera ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          <Animated.View
            style={[
              styles.blob,
              onCamera && styles.blobDark,
              {
                opacity: dotOpacity,
                transform: [{ translateX: blobX }, { scaleX: Animated.divide(blobW, BLOB_W) }],
              },
            ]}
          />
        </View>
        <View style={styles.row}>
          {state.routes.map((route: any, index: number) => {
            const meta = TABS.find((t) => t.name === route.name);
            if (!meta) return null;
            const focused = state.index === index;
            const color = focused ? activeColor : inactiveColor;
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
                    style={({ pressed }) => [styles.tabHit, { opacity: pressed ? 0.85 : 1 }]}
                  >
                    <View style={styles.iconWrap}>
                      <Ionicons
                        name={focused ? meta.icon : (`${meta.icon}-outline` as any)}
                        size={24}
                        color={focused && !onCamera ? "#FFFFFF" : color}
                      />
                    </View>
                    <Animated.Text style={[styles.label, { color }]}>Scan</Animated.Text>
                  </Pressable>
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
                  <View style={styles.iconWrap}>
                    <Ionicons
                      name={focused ? meta.icon : (`${meta.icon}-outline` as any)}
                      size={24}
                      color={color}
                    />
                  </View>
                  <Animated.Text style={[styles.label, { color }]}>{meta.label}</Animated.Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>
      <View style={styles.overlay} pointerEvents="box-none">
        <Animated.View
          pointerEvents="none"
          style={[
            styles.dot,
            { opacity: dotOpacity, transform: [{ translateX: dotX }, { translateY: dotLift }] },
          ]}
        />
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
    height: 96,
    justifyContent: "flex-end",
  },
  pill: {
    height: 90,
    borderRadius: 30,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "rgba(255,255,255,0.86)",
    shadowColor: "#0B1220",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  clip: {
    ...StyleSheet.absoluteFill,
    borderRadius: 30,
    overflow: "hidden",
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
  },
  iconWrap: {
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  tabHit: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
  },
  scanCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1A2233",
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 90,
  },
  blob: {
    position: "absolute",
    top: BLOB_TOP,
    left: 0,
    width: BLOB_W,
    height: BLOB_H,
    borderRadius: BLOB_H / 2,
    backgroundColor: "rgba(10,132,255,0.16)",
    borderWidth: 1.5,
    borderColor: "rgba(10,132,255,0.22)",
  },
  blobDark: {
    backgroundColor: "rgba(10,132,255,0.20)",
    borderColor: "rgba(10,132,255,0.30)",
  },
  dot: {
    position: "absolute",
    top: 0,
    left: 0,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: TINT,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.95)",
  },
  pillDark: {
    borderColor: "rgba(255,255,255,0.18)",
  },
  baseDark: {
    backgroundColor: "rgba(16,18,24,0.55)",
  },
});
