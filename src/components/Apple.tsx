import { View, Text, StyleSheet } from "react-native";
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
