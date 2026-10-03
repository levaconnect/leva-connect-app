import { View, Text, StyleSheet } from "react-native";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "success" | "warning" | "error" | "default";
  size?: "sm" | "md";
  style?: ViewStyle;
}

export function Badge({ children, variant = "primary", size = "md", style }: BadgeProps) {
  return (
    <View
      style={[
        styles.base,
        styles[variant],
        styles[size],
        style,
      ]}
    >
      <Text style={[styles.text, styles[size + "Text"]]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9999,
  },
  primary: {
    backgroundColor: "#EDE8F9",
  },
  success: {
    backgroundColor: "#E8F9F0",
  },
  warning: {
    backgroundColor: "#FEF3E8",
  },
  error: {
    backgroundColor: "#FEF2F2",
  },
  default: {
    backgroundColor: "#F5F3F8",
  },
  sm: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  md: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  text: {
    fontWeight: "600",
  },
  smText: {
    fontSize: 10,
  },
  mdText: {
    fontSize: 12,
  },
});

import { ViewStyle } from "react-native";