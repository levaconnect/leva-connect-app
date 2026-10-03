import { Image, View, Text, StyleSheet } from "react-native";

interface AvatarProps {
  source?: { uri: string } | number;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl" | number;
  style?: StyleSheet.ViewStyle;
}

const COLORS = [
  "#7052C8",
  "#BBA5F5",
  "#FF897D",
  "#9ADCC3",
  "#8B5CF6",
  "#EC4899",
  "#F59E0B",
  "#10B981",
];

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ source, name, size = "md", style }: AvatarProps) {
  const sizeMap = {
    sm: 32,
    md: 48,
    lg: 64,
    xl: 96,
  };

  const dimension = typeof size === "number" ? size : sizeMap[size];
  const fontSize = dimension * 0.35;
  const bgColor = name ? getColorFromName(name) : "#7052C8";

  return (
    <View
      style={[
        styles.avatar,
        { width: dimension, height: dimension, backgroundColor: bgColor },
        style,
      ]}
    >
      {source ? (
        <Image
          source={source}
          style={styles.image}
          resizeMode="cover"
        />
      ) : name ? (
        <Text style={[styles.initials, { fontSize }]}>{getInitials(name)}</Text>
      ) : (
        <Text style={[styles.initials, { fontSize, color: "#FFFFFF" }]}>?</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderRadius: 9999,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  initials: {
    fontWeight: "700",
    color: "#FFFFFF",
  },
});