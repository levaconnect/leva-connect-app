import { View, Text, StyleSheet, ScrollView, Switch } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { useProfileStore } from "@/store/profileStore";
import { Button, Card, Loading, ConfirmDialog } from "@/components";
import { Settings, Shield, Key, Trash2, LogOut, Bell, Moon, Palette } from "lucide-react-native";
import { useState } from "react";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { myProfile, updatePrivacy } = useProfileStore();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/welcome");
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }
    setChangingPassword(true);
    setPasswordError(null);
    try {
      // TODO: call API
      // await api.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setChangingPassword(false);
    } catch (err: any) {
      setPasswordError(err.message || "Failed to change password");
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    // TODO: call API with password confirmation
    setShowDeleteConfirm(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Settings</Text>
        <Text style={styles.pageSubtitle}>Manage your account and preferences</Text>
      </View>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.settingsList}>
          <SettingsItem
            icon={Shield}
            title="Privacy Settings"
            subtitle="Control who can see your profile"
            onPress={() => router.push("/(app)/privacy")}
          />
          <SettingsItem
            icon={Key}
            title="Change Password"
            subtitle="Update your password"
            onPress={() => { /* TODO: show modal */ }}
          />
          <SettingsItem
            icon={Trash2}
            title="Delete Account"
            subtitle="Permanently delete your account"
            iconColor="#EF4444"
            titleColor="#EF4444"
            onPress={() => setShowDeleteConfirm(true)}
          />
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.settingsList}>
          <ToggleItem
            icon={Bell}
            title="Push Notifications"
            subtitle="Receive push notifications for messages and activity"
            value={pushEnabled}
            onChange={setPushEnabled}
          />
          <ToggleItem
            icon={MailIcon}
            title="Email Notifications"
            subtitle="Receive email updates about community activity"
            value={emailEnabled}
            onChange={setEmailEnabled}
          />
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.settingsList}>
          <ToggleItem
            icon={Moon}
            title="Dark Mode"
            subtitle="Use dark theme (coming soon)"
            value={darkMode}
            onChange={setDarkMode}
            disabled
          />
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.settingsList}>
          <SettingsItem
            icon={Palette}
            title="Help & Support"
            subtitle="Contact us or view FAQs"
            onPress={() => { /* TODO: navigate */ }}
          />
          <SettingsItem
            icon={Palette}
            title="About LevaConnect"
            subtitle="Version 1.0.0"
            onPress={() => { /* TODO: navigate */ }}
          />
        </View>
      </Card>

      <View style={styles.logoutSection}>
        <Pressable onPress={() => setShowLogoutConfirm(true)} style={styles.logoutButton}>
          <LogOut size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </View>

      <ConfirmDialog
        visible={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmLabel="Log Out"
        cancelLabel="Cancel"
        onConfirm={handleLogout}
        variant="danger"
      />

      <ConfirmDialog
        visible={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Account"
        message="This will permanently delete your account and all your data. This action cannot be undone."
        confirmLabel="Delete Account"
        cancelLabel="Cancel"
        onConfirm={handleDeleteAccount}
        variant="danger"
      />
    </ScrollView>
  );
}

function SettingsItem({
  icon: Icon,
  title,
  subtitle,
  onPress,
  iconColor = "#7052C8",
  titleColor = "#282331",
}: {
  icon: any;
  title: string;
  subtitle: string;
  onPress: () => void;
  iconColor?: string;
  titleColor?: string;
}) {
  return (
    <Pressable onPress={onPress} style={styles.settingsItem} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Icon size={22} color={iconColor} />
      <View style={styles.settingsItemText} flex={1}>
        <Text style={[styles.settingsItemTitle, { color: titleColor }]}>{title}</Text>
        <Text style={styles.settingsItemSubtitle}>{subtitle}</Text>
      </View>
      <View style={styles.chevron}>
        <View style={styles.chevronInner} />
      </View>
    </Pressable>
  );
}

function ToggleItem({
  icon: Icon,
  title,
  subtitle,
  value,
  onChange,
  disabled = false,
}: {
  icon: any;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.settingsItem}>
      <Icon size={22} color={disabled ? "#827B8B" : "#7052C8"} />
      <View style={styles.settingsItemText} flex={1}>
        <Text style={[styles.settingsItemTitle, disabled && { color: "#827B8B" }]}>{title}</Text>
        <Text style={styles.settingsItemSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={disabled ? undefined : onChange}
        disabled={disabled}
        trackColor={{ false: "#E8E2F0", true: "#7052C8" }}
        thumbColor={value ? "#FFFFFF" : "#FFFFFF"}
      />
    </View>
  );
}

function MailIcon({ size, color }: { size: number; color: string }) {
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ width: size, height: size, borderWidth: 2, borderColor: color, borderRadius: 4 }}>
        <View style={{ position: "absolute", top: "30%", left: "20%", width: "60%", height: "40%", borderBottomWidth: 2, borderBottomColor: color }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF8F2",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 20,
  },
  header: {
    gap: 4,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#21172F",
  },
  pageSubtitle: {
    fontSize: 15,
    color: "#827B8B",
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#282331",
    marginBottom: 4,
  },
  settingsList: {
    gap: 8,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#21172F",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  settingsItemText: {
    flex: 1,
    gap: 2,
  },
  settingsItemTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#282331",
  },
  settingsItemSubtitle: {
    fontSize: 13,
    color: "#827B8B",
  },
  chevron: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#F5F3F8",
    justifyContent: "center",
    alignItems: "center",
  },
  chevronInner: {
    width: 12,
    height: 12,
    backgroundColor: "#7052C8",
    borderRadius: 2,
    transform: [{ rotate: "45deg" }],
  },
  logoutSection: {
    marginTop: 12,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    shadowColor: "#21172F",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#EF4444",
  },
});