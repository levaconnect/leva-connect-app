import { View, Text, StyleSheet } from "react-native";
import { Button } from "./Buttons";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleSheet.ViewStyle;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      {icon && <View style={styles.iconWrapper}>{icon}</View>}
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {actionLabel && onAction && (
        <Button variant="primary" size="md" onPress={onAction}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  iconWrapper: {
    padding: 24,
    backgroundColor: "#EDE8F9",
    borderRadius: 9999,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#282331",
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "#827B8B",
    textAlign: "center",
    lineHeight: 24,
  },
});