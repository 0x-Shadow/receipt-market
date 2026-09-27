import { View, Text } from "react-native";

export function PriceBadge({ price, oldPrice }: { price: number; oldPrice?: number }) {
  const down = oldPrice !== undefined && price < oldPrice;
  const up = oldPrice !== undefined && price > oldPrice;
  const bg = down ? "#E8F9EE" : up ? "#FDECEC" : "#F2F2F7";
  const fg = down ? "#1A9E50" : up ? "#D64545" : "#111";
  const arrow = down ? "▼" : up ? "▲" : "";
  return (
    <View style={{ backgroundColor: bg, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}>
      <Text style={{ color: fg, fontWeight: "700", fontSize: 16 }}>
        {arrow} {price.toFixed(2)}€
      </Text>
    </View>
  );
}

export function AppleCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 }}>
      {children}
    </View>
  );
}
