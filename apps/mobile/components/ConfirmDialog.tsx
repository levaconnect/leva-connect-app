import { View, Text, StyleSheet, Modal, Pressable } from "react-native";
import { Button } from "./Buttons";

interface ConfirmDialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: "danger" | "primary";
  loading?: boolean;
}

export function ConfirmDialog({
  visible,
  onClose,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "primary",
  loading = false,
}: ConfirmDialogProps) {
  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <Pressable onPress={onClose} style={styles.overlay} />
      <View style={styles.modal}>
        <Text style={styles.title}>{title}</Text>
        {message && <Text style={styles.message}>{message}</Text>}
        <View style={styles.actions}>
          <Button variant="ghost" onPress={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant === "danger" ? "secondary" : "primary"} onPress={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(33, 23, 47, 0.5)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    gap: 16,
    shadowColor: "#21172F",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#282331",
  },
  message: {
    fontSize: 15,
    color: "#827B8B",
    lineHeight: 22,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
});