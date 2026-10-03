import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useProfileStore } from "@/store/profileStore";
import { useAuthStore } from "@/store/authStore";
import { Button, Card, Loading, ConfirmDialog } from "@/components";
import { Shield, Users, UserCheck, Lock, ArrowLeft, Check } from "lucide-react-native";
import { useState, useEffect } from "react";

export default function PrivacyScreen() {
  const router = useRouter();
  const { myProfile, updatePrivacy } = useProfileStore();
  const { membershipStatus } = useAuthStore();

  const [selectedVisibility, setSelectedVisibility] = useState<"community" | "connections" | "private">("community");
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingVisibility, setPendingVisibility] = useState<"community" | "connections" | "private">("community");

  useEffect(() => {
    if (myProfile) {
      setSelectedVisibility(myProfile.visibility || "community");
    }
  }, [myProfile]);

  const handleSelectVisibility = (visibility: "community" | "connections" | "private") => {
    if (membershipStatus !== "approved") return;
    if (visibility === selectedVisibility) return;

    if (visibility === "private" && selectedVisibility !== "private") {
      setPendingVisibility(visibility);
      setShowConfirm(true);
    } else {
      setSelectedVisibility(visibility);
      saveVisibility(visibility);
    }
  };

  const handleConfirmChange = () => {
    setShowConfirm(false);
    setSelectedVisibility(pendingVisibility);
    saveVisibility(pendingVisibility);
  };

  const saveVisibility = async (visibility: "community" | "connections" | "private") => {
    setSaving(true);
    try {
      await updatePrivacy(visibility);
    } catch (err) {
      // Error handled in store
      // Revert on error
      setSelectedVisibility(myProfile?.visibility || "community");
    } finally {
      setSaving(false);
    }
  };

  const VISIBILITY_OPTIONS = [
    {
      value: "community" as const,
      label: "Community",
      description: "Your profile is visible to all approved community members",
      icon: Users,
      details: [
        "Full name, photo, city, profession",
        "Bio, education, interests",
        "Connection count",
        "Posts and comments you make",
      ],
    },
    {
      value: "connections" as const,
      label: "Connections Only",
      description: "Only your approved connections can view your profile",
      icon: UserCheck,
      details: [
        "All profile details hidden from non-connections",
        "Only name and photo shown in search",
        "Connection requests can still be sent",
        "Posts visible only to connections",
      ],
    },
    {
      value: "private" as const,
      label: "Private",
      description: "Your profile is completely hidden from other members",
      icon: Lock,
      details: [
        "Profile not shown in Discover or search",
        "Only visible to you",
        "Cannot receive connection requests",
        "Posts visible only to you",
      ],
    },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.backButton}>
          <ArrowLeft size={24} color="#282331" />
        </Pressable>
        <Text style={styles.pageTitle}>Privacy Settings</Text>
      </View>

      <Card style={styles.infoCard}>
        <View style={styles.infoCardContent}>
          <Shield size={28} color="#7052C8" />
          <View>
            <Text style={styles.infoCardTitle}>Profile Visibility</Text>
            <Text style={styles.infoCardDescription}>
              Control who can see your profile information and activity in the community.
            </Text>
          </View>
        </View>
      </Card>

      <View style={styles.options}>
        {VISIBILITY_OPTIONS.map((option) => (
          <VisibilityOption
            key={option.value}
            option={option}
            selected={selectedVisibility === option.value}
            onPress={() => handleSelectVisibility(option.value)}
            disabled={membershipStatus !== "approved" || saving}
          />
        ))}
      </View>

      <Card style={styles.alwaysVisible}>
        <Text style={styles.alwaysVisibleTitle}>Always Visible</Text>
        <Text style={styles.alwaysVisibleText}>
          Regardless of your privacy setting, the following are always visible to community admins:
        </Text>
        <View style={styles.alwaysVisibleList}>
          {[
            "Email address (for account management)",
            "Account status and membership history",
            "Reported content and moderation actions",
          ].map((item, i) => (
            <View key={i} style={styles.alwaysVisibleItem}>
              <Check size={14} color="#10B981" />
              <Text style={styles.alwaysVisibleItemText}>{item}</Text>
            </View>
          ))}
        </View>
      </Card>

      {membershipStatus !== "approved" && (
        <Card style={styles.pendingCard}>
          <View style={styles.pendingCardContent}>
            <Lock size={24} color="#F59E0B" />
            <View>
              <Text style={styles.pendingTitle}>Limited While Pending</Text>
              <Text style={styles.pendingText}>
                Privacy settings will be fully available once your membership is approved.
              </Text>
            </View>
          </View>
        </Card>
      )}

      <ConfirmDialog
        visible={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Make Profile Private?"
        message="Your profile will be hidden from all members including search results. You won't receive connection requests. Are you sure?"
        confirmLabel="Make Private"
        cancelLabel="Cancel"
        onConfirm={handleConfirmChange}
        variant="danger"
        loading={saving}
      />
    </ScrollView>
  );
}

function VisibilityOption({
  option,
  selected,
  onPress,
  disabled,
}: {
  option: any;
  selected: boolean;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[
      styles.option,
      selected && styles.optionSelected,
      disabled && styles.optionDisabled,
    ]}>
      <View style={styles.optionMain}>
        <View style={[
          styles.optionIcon,
          selected && styles.optionIconSelected,
        ]}>
          <option.icon size={24} color={selected ? "#FFFFFF" : "#7052C8"} />
        </View>
        <View style={styles.optionInfo} flex={1}>
          <Text style={[
            styles.optionLabel,
            selected && styles.optionLabelSelected,
            disabled && styles.optionLabelDisabled,
          ]}>
            {option.label}
          </Text>
          <Text style={[
            styles.optionDescription,
            disabled && styles.optionDescriptionDisabled,
          ]}>
            {option.description}
          </Text>
        </View>
        {selected && <Check size={24} color="#FFFFFF" style={styles.checkmark} />}
      </View>
      <View style={styles.optionDetails}>
        {option.details.map((detail: string, i: number) => (
          <View key={i} style={styles.detailRow}>
            <View style={[
              styles.detailDot,
              selected && styles.detailDotSelected,
            ]} />
            <Text style={[
              styles.detailText,
              disabled && styles.detailTextDisabled,
            ]}>
              {detail}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
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
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F5F3F8",
    justifyContent: "center",
    alignItems: "center",
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#21172F",
    flex: 1,
  },
  infoCard: {
    backgroundColor: "#F5F2FA",
    borderWidth: 1,
    borderColor: "#EDE8F9",
  },
  infoCardContent: {
    flexDirection: "row",
    gap: 16,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#282331",
    marginBottom: 4,
  },
  infoCardDescription: {
    fontSize: 14,
    color: "#827B8B",
    lineHeight: 20,
  },
  options: {
    gap: 16,
  },
  option: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: "#E8E2F0",
    shadowColor: "#21172F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  optionSelected: {
    borderColor: "#7052C8",
    backgroundColor: "#F5F2FA",
  },
  optionDisabled: {
    opacity: 0.7,
  },
  optionMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#EDE8F9",
    justifyContent: "center",
    alignItems: "center",
  },
  optionIconSelected: {
    backgroundColor: "#7052C8",
  },
  optionInfo: {
    flex: 1,
    gap: 4,
  },
  optionLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: "#282331",
  },
  optionLabelSelected: {
    color: "#7052C8",
  },
  optionLabelDisabled: {
    color: "#827B8B",
  },
  optionDescription: {
    fontSize: 13,
    color: "#827B8B",
  },
  optionDescriptionDisabled: {
    color: "#827B8B",
  },
  checkmark: {
    marginLeft: 8,
  },
  optionDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E8E2F0",
    gap: 10,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  detailDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E8E2F0",
  },
  detailDotSelected: {
    backgroundColor: "#7052C8",
  },
  detailText: {
    fontSize: 13,
    color: "#827B8B",
    flex: 1,
  },
  detailTextDisabled: {
    color: "#827B8B",
  },
  alwaysVisible: {
    backgroundColor: "#FEF3E8",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  alwaysVisibleTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#282331",
    marginBottom: 8,
  },
  alwaysVisibleText: {
    fontSize: 14,
    color: "#827B8B",
    marginBottom: 12,
  },
  alwaysVisibleList: {
    gap: 8,
  },
  alwaysVisibleItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  alwaysVisibleItemText: {
    fontSize: 13,
    color: "#282331",
  },
  pendingCard: {
    backgroundColor: "#FEF3E8",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  pendingCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#282331",
    marginBottom: 4,
  },
  pendingText: {
    fontSize: 14,
    color: "#827B8B",
  },
});