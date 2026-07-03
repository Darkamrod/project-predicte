import { Modal, Pressable, StyleSheet, View } from "react-native";

import { useAppTheme } from "@/design-system/theme";

export function BottomSheet({
  visible,
  onClose,
  children
}: {
  visible: boolean;
  onClose(): void;
  children: React.ReactNode;
}): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Pressable accessibilityLabel="Chiudi pannello" style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>{children}</View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(15,23,42,0.45)",
    flex: 1
  },
  sheet: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    gap: 12,
    padding: 18
  }
});
