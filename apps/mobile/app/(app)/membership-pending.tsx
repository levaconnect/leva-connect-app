import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useAuthStore } from "@/store/authStore";
import { useProfileStore } from "@/store/profileStore";
import { Button, Avatar } from "@/components";
import { Clock, CheckCircle, XCircle, AlertCircle, ArrowLeft } from "lucide-react-native";
import { Link, useRouter } from "expo-router";
import { useEffect } from "react";

export default function MembershipPendingScreen() {
  const { membershipStatus, logout } = useAuthStore();
  const { myProfile } = useProfileStore();
  const router = useRouter();

  useEffect(() => {
    // Check membership status on mount
  }, []);

  const getStatusConfig = () => {
    switch (membershipStatus) {
      case "pending":
        return {
          icon: Clock,
          iconColor: "#F59E0B",
          bgColor: "#FEF3E8",
          title: "Application Pending",
          description: "Your membership application is under review. Our admin team will review it shortly.",
          actionLabel: "Check Status",
        };
      case "rejected":
        return {
          icon: XCircle,
          iconColor: "#EF4444",
          bgColor: "#FEF2F2",
          title: "Application Not Approved",
          description: "Unfortunately, your membership application was not approved. You can re-apply after addressing any concerns.",
          actionLabel: "Re-apply",
        };
      case "suspended":
        return {
          icon: AlertCircle,
          iconColor: "#EF4444",
          bgColor: "#FEF2F2",
          title: "Account Suspended",
          description: "Your membership has been suspended. Please contact support for more information.",
          actionLabel: "Contact Support",
        };
      default:
        return {
          icon: CheckCircle,
          iconColor: "#10B981",
          bgColor: "#E8F9F0",
          title: "Membership Approved",
          description: "Welcome to the community! You now have access to all features.",
          actionLabel: "Continue",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const handleAction = async () => {
    if (membershipStatus === "pending") {
      // Refresh status
    } else if (membershipStatus === "rejected") {
      // Re-apply
    } else if (membershipStatus === "suspended") {
      // Contact support
    } else {
      router.replace("/(app)/home");
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/welcome");
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <View style={styles.iconWrapper}>
          <Icon size={48} color={config.iconColor} />
        </View>
        <Text style={styles.title}>{config.title}</Text>
        <Text style={styles.description}>{config.description}</Text>

        {membershipStatus === "rejected" && (
          <View style={styles.rejectionInfo}>
            <Text style={styles.rejectionLabel}>Reason:</Text>
            <Text style={styles.rejectionText}>Please contact admin for details</Text>
          </View>
        )}

        <Button variant="primary" size="lg" fullWidth onPress={handleAction}>
          {config.actionLabel}
        </Button>

        {membershipStatus !== "approved" && (
          <Button variant="ghost" size="md" fullWidth onPress={handleLogout} style={{ marginTop: 12 }}>
            Log Out
          </Button>
        )}
      </View>

      {myProfile && (
        <View style={styles.profilePreview}>
          <Text style={styles.previewTitle}>Your Profile Preview</Text>
          <View style={styles.profileCard}>
            <Avatar
              source={myProfile.avatarUrl ? { uri: myProfile.avatarUrl } : undefined}
              name={myProfile.fullName}
              size="lg"
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{myProfile.fullName}</Text>
              {myProfile.city && (
                <Text style={styles.profileLocation}>{myProfile.city}</Text>
              )}
              {myProfile.bio && (
                <Text style={styles.profileBio} numberOfLines={2}>{myProfile.bio}</Text>
              )}
            </View>
          </View>
        </View>
      )}

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>What happens next?</Text>
        <View style={styles.infoItems}>
          <InfoItem
            icon={CheckCircle}
            title="Review Process"
            description="Our team reviews applications within 24-48 hours"
          />
          <InfoItem
            icon={CheckCircle}
            title="Notification"
            description="You'll receive a notification when your status changes"
          />
          <InfoItem
            icon={CheckCircle}
            title="Full Access"
            description="Once approved, you'll unlock all community features"
          />
        </View>
      </View>
    </ScrollView>
  );
}

function InfoItem({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <View style={styles.infoItem}>
      <View style={styles.infoIcon}>
        <Icon size={20} color="#7052C8" />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoItemTitle}>{title}</Text>
        <Text style={styles.infoItemDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#21172F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#FEF3E8",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#282331",
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: "#827B8B",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  rejectionInfo: {
    width: "100%",
    padding: 16,
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginBottom: 16,
  },
  rejectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#EF4444",
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: 14,
    color: "#EF4444",
  },
  profilePreview: {
    gap: 12,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#282331",
    marginLeft: 4,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#21172F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#282331",
  },
  profileLocation: {
    fontSize: 13,
    color: "#827B8B",
    marginTop: 2,
  },
  profileBio: {
    fontSize: 13,
    color: "#827B8B",
    marginTop: 6,
    lineHeight: 18,
  },
  infoSection: {
    gap: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#282331",
    marginLeft: 4,
  },
  infoItems: {
    gap: 12,
  },
  infoItem: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#21172F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EDE8F9",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  infoContent: {
    flex: 1,
  },
  infoItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#282331",
  },
  infoItemDescription: {
    fontSize: 13,
    color: "#827B8B",
    marginTop: 2,
  },
});