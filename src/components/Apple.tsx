import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { useRef, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";

export const C = {
  bg: "#F2F2F7",
  card: "#FFFFFF",
  separator: "rgba(60,60,67,0.12)",
  tint: "#007AFF",
  green: "#34C759",
  red: "#FF3B30",
  orange: "#FF9500",
  text: "#000000",
  sub: "#8E8E93",
  ter: "#C7C7CC",
};

export function PriceBadge({ price, oldPrice }: { price: number; oldPrice?: number }) {
  const down = oldPrice !== undefined && price < oldPrice;
  const up = oldPrice !== undefined && price > oldPrice;
  const bg = down ? "rgba(52,199,89,0.12)" : up ? "rgba(255,59,48,0.10)" : "#F2F2F7";
  const fg = down ? "#1F8A4C" : up ? "#D70015" : "#000";
  const arrow = down ? "▼" : up ? "▲" : "";
  return (
    <View style={{ backgroundColor: bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 3 }}>
      <Text style={{ color: fg, fontWeight: "700", fontSize: 13 }}>
        {arrow} {price.toFixed(2)}€
      </Text>
    </View>
  );
}

export function AppleCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[{ backgroundColor: C.card, borderRadius: 16, padding: 16 }, style]}>{children}</View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <Text style={{ fontSize: 20, fontWeight: "700", letterSpacing: -0.2 }}>{title}</Text>
      {action && (
        <Text onPress={onAction} style={{ color: C.tint, fontSize: 15, fontWeight: "500" }}>
          {action}
        </Text>
      )}
    </View>
  );
}

export function EmojiTile({ emoji, size = 44, bg = "#F2F2F7" }: { emoji: string; size?: number; bg?: string }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: size * 0.52 }}>{emoji}</Text>
    </View>
  );
}

export function ListRow({
  icon,
  iconBg = "#F2F2F7",
  title,
  subtitle,
  right,
  chevron = true,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  chevron?: boolean;
  onPress?: () => void;
}) {
  const inner = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, paddingHorizontal: 16, minHeight: 52 }}>
      <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: iconBg, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={17} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: "500" }}>{title}</Text>
        {subtitle && <Text style={{ fontSize: 13, color: C.sub, marginTop: 1 }}>{subtitle}</Text>}
      </View>
      {right}
      {chevron && <Ionicons name="chevron-forward" size={17} color={C.ter} />}
    </View>
  );
  return onPress ? (
    <Text onPress={onPress} style={{ width: "100%" }}>{inner}</Text>
  ) : inner;
}

export function StatCard({ value, label, accent }: { value: string; label: string; accent?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 12, alignItems: "center" }}>
      <Text style={{ fontSize: 22, fontWeight: "800", color: accent ?? C.text, letterSpacing: -0.4 }}>{value}</Text>
      <Text style={{ fontSize: 12, color: C.sub, marginTop: 2, fontWeight: "500" }}>{label}</Text>
    </View>
  );
}

export function Group({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: C.card, borderRadius: 14, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, borderColor: C.separator }}>
      {children}
    </View>
  );
}

export function RowSeparator() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.separator, marginLeft: 58 }} />;
}

export function Skeleton({ style }: { style?: any }) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[{ backgroundColor: C.ter, borderRadius: 6, opacity }, style]} />;
}

export function EmptyState({
  icon,
  title,
  subtitle,
  actionText,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionText?: string;
  onAction?: () => void;
}) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 24, paddingHorizontal: 32, paddingBottom: 80 }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: C.card,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: C.separator,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <Ionicons name={icon} size={34} color={C.sub} />
      </View>
      <Text style={{ fontSize: 18, fontWeight: "700", textAlign: "center", letterSpacing: -0.2 }}>{title}</Text>
      {subtitle && (
        <Text style={{ fontSize: 14, color: C.sub, textAlign: "center", marginTop: 6, lineHeight: 20 }}>{subtitle}</Text>
      )}
      {actionText && onAction && (
        <Text
          onPress={onAction}
          style={{
            marginTop: 18,
            fontSize: 15,
            fontWeight: "600",
            color: C.tint,
            backgroundColor: "rgba(0,122,255,0.10)",
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          {actionText}
        </Text>
      )}
    </View>
  );
}

export function PriceChart({ data }: { data: { date: string; price: number }[] }) {
  if (data.length === 0) return null;
  const prices = data.map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, height: 120, paddingHorizontal: 4 }}>
        {data.map((d, i) => {
          const up = i > 0 && d.price > data[i - 1].price;
          const down = i > 0 && d.price < data[i - 1].price;
          const barColor = up ? C.red : down ? C.green : C.ter;
          const heightPct = 12 + ((d.price - min) / range) * 88;
          return (
            <View key={i} style={{ flex: 1, alignItems: "center" }}>
              <View
                style={{
                  width: "100%",
                  height: `${heightPct}%`,
                  backgroundColor: barColor,
                  borderRadius: 4,
                  minHeight: 6,
                }}
              />
            </View>
          );
        })}
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 8,
          paddingHorizontal: 4,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: C.separator,
          paddingTop: 8,
        }}
      >
        <Text style={{ fontSize: 12, color: C.sub, fontWeight: "600" }}>
          Min {min.toFixed(2)}€
        </Text>
        <Text style={{ fontSize: 12, color: C.sub, fontWeight: "600" }}>
          Max {max.toFixed(2)}€
        </Text>
      </View>
    </View>
  );
}

export function PriceSparkline({ values, width = 80, height = 28 }: { values: number[]; width?: number; height?: number }) {
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / Math.max(values.length - 1, 1);
  const radius = Math.max(1.5, step / 2.2);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", width, height, gap: 0 }}>
      {values.map((v, i) => {
        const up = i > 0 && v > values[i - 1];
        const down = i > 0 && v < values[i - 1];
        const barColor = up ? C.red : down ? C.green : C.ter;
        const barHeight = 4 + ((v - min) / range) * (height - 4);
        return (
          <View
            key={i}
            style={{
              position: "absolute",
              left: i * step - radius,
              bottom: 0,
              width: radius * 2,
              height: barHeight,
              backgroundColor: barColor,
              borderRadius: radius,
            }}
          />
        );
      })}
    </View>
  );
}
