import { View, Text, StyleSheet, Pressable } from "react-native";
import { Menu, X, ChevronLeft } from "lucide-react-native";

interface HeaderProps {
  title: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  style?: StyleSheet.ViewStyle;
}

export function Header({
  title,
  leftAction,
  rightAction,
  showBack = false,
  onBack,
  style,
}: HeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.left}>
        {showBack && (
          <Pressable onPress={onBack} style={styles.backButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <ChevronLeft size={24} color="#282331" />
          </Pressable>
        )}
        {leftAction && !showBack && <View style={styles.leftAction}>{leftAction}</View>}
      </View>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.right}>
        {rightAction}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: "#FAF8F2",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E2F0",
  },
  left: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  leftAction: {
    flex: 1,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#282331",
    textAlign: "center",
    flex: 1,
    marginHorizontal: 16,
  },
  right: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    minWidth: 48,
  },
});