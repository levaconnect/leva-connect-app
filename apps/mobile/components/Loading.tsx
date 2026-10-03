import { View, ActivityIndicator, StyleSheet } from "react-native";

interface LoadingProps {
  size?: "small" | "large";
  color?: string;
  style?: StyleSheet.ViewStyle;
  fullScreen?: boolean;
}

export function Loading({ size = "large", color = "#7052C8", style, fullScreen = false }: LoadingProps) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen, style]}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  fullScreen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FAF8F2",
    zIndex: 999,
  },
});