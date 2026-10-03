import { Pressable, Text, StyleSheet, ActivityIndicator } from "react-native";

interface ButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleSheet.ViewStyle;
}

export function Button({
  children,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const baseStyles = [
    styles.base,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    style,
  ];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={baseStyles}
      android_ripple={{ color: "#7052C833" }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === "outline" || variant === "ghost" ? "#7052C8" : "#FFFFFF"} />
      ) : (
        <Text style={styles.text}>{children}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
  },
  primary: {
    backgroundColor: "#7052C8",
  },
  secondary: {
    backgroundColor: "#FF897D",
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#7052C8",
  },
  ghost: {
    backgroundColor: "transparent",
  },
  sm: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  md: {
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  lg: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  fullWidth: {
    width: "100%",
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});