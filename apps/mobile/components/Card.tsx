import { View, StyleSheet, Pressable } from "react-native";

interface CardProps {
  children: React.ReactNode;
  variant?: "default" | "elevated" | "outlined";
  padding?: "none" | "sm" | "md" | "lg";
  onPress?: () => void;
  style?: StyleSheet.ViewStyle;
}

export function Card({
  children,
  variant = "default",
  padding = "md",
  onPress,
  style,
}: CardProps) {
  const Component = onPress ? Pressable : View;
  const contentStyle = [styles.content, styles[padding]];

  return (
    <Component
      onPress={onPress}
      style={[
        styles.base,
        styles[variant],
        style,
      ]}
      android_ripple={onPress ? { color: "#7052C833" } : undefined}
    >
      <View style={contentStyle}>{children}</View>
    </Component>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
  },
  default: {
    shadowColor: "#21172F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  elevated: {
    shadowColor: "#21172F",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 8,
  },
  outlined: {
    borderWidth: 1,
    borderColor: "#E8E2F0",
  },
  content: {
    width: "100%",
  },
  none: {
    padding: 0,
  },
  sm: {
    padding: 12,
  },
  md: {
    padding: 20,
  },
  lg: {
    padding: 24,
  },
});