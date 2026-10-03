import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { useProfileStore } from "@/store/profileStore";
import { Avatar, Button, Badge, Card, Loading, Input } from "@/components";
import { Settings, Edit, LogOut, Shield, MapPin, Briefcase, GraduationCap, Heart } from "lucide-react-native";
import { useState, useEffect } from "react";

function DetailItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <Icon size={18} color="#7052C8" />
      <View style={styles.detailText}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function formatVisibility(visibility: string): string {
  switch (visibility) {
    case "community": return "Community (All Members)";
    case "connections": return "Connections Only";
    case "private": return "Private";
    default: return visibility;
  }
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  } catch {
    return dateString;
  }
}

function EditProfileForm({ form, onChange }: { form: any; onChange: (form: any) => void }) {
  return (
    <Card style={styles.editForm}>
      <View style={styles.editField}>
        <Input
          label="Full Name"
          value={form.fullName}
          onChangeText={(text) => onChange({ ...form, fullName: text })}
          autoCapitalize="words"
        />
      </View>
      <View style={styles.editField}>
        <Input
          label="Bio"
          value={form.bio}
          onChangeText={(text) => onChange({ ...form, bio: text })}
          multiline
          numberOfLines={3}
          autoCapitalize="sentences"
        />
      </View>
      <View style={styles.editField}>
        <Input
          label="City"
          value={form.city}
          onChangeText={(text) => onChange({ ...form, city: text })}
          autoCapitalize="words"
        />
      </View>
      <View style={styles.editField}>
        <Input
          label="Hometown"
          value={form.hometown}
          onChangeText={(text) => onChange({ ...form, hometown: text })}
          autoCapitalize="words"
        />
      </View>
      <View style={styles.editField}>
        <Input
          label="Profession"
          value={form.profession}
          onChangeText={(text) => onChange({ ...form, profession: text })}
          autoCapitalize="words"
        />
      </View>
      <View style={styles.editField}>
        <Input
          label="Education"
          value={form.education}
          onChangeText={(text) => onChange({ ...form, education: text })}
          autoCapitalize="words"
        />
      </View>
      <View style={styles.editField}>
        <Text style={styles.editLabel}>Visibility</Text>
        <View style={styles.visibilityOptions}>
          {(["community", "connections", "private"] as const).map((v) => (
            <Pressable
              key={v}
              onPress={() => onChange({ ...form, visibility: v })}
              style={[
                styles.visibilityOption,
                form.visibility === v && styles.visibilityOptionSelected,
              ]}
            >
              <Text style={[
                styles.visibilityOptionText,
                form.visibility === v && styles.visibilityOptionTextSelected,
              ]}>
                {formatVisibility(v)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Card>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, membershipStatus } = useAuthStore();
  const { myProfile, isLoading, fetchMyProfile, updateProfile } = useProfileStore();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: "",
    bio: "",
    city: "",
    hometown: "",
    profession: "",
    education: "",
    visibility: "community" as "community" | "connections" | "private",
  });

  useEffect(() => {
    fetchMyProfile();
  }, []);

  useEffect(() => {
    if (myProfile) {
      setEditForm({
        fullName: myProfile.fullName || "",
        bio: myProfile.bio || "",
        city: myProfile.city || "",
        hometown: myProfile.hometown || "",
        profession: myProfile.profession || "",
        education: myProfile.education || "",
        visibility: myProfile.visibility || "community",
      });
    }
  }, [myProfile]);

  const handleSaveProfile = async () => {
    try {
      await updateProfile(editForm);
      setEditing(false);
    } catch (err) {
      // Error handled in store
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/welcome");
  };

  if (isLoading && !myProfile) {
    return <Loading fullScreen />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Avatar
          source={myProfile?.avatarUrl ? { uri: myProfile.avatarUrl } : undefined}
          name={myProfile?.fullName || user?.email}
          size="xl"
        />
        <View style={styles.nameRow}>
          <Text style={styles.name}>{myProfile?.fullName || "Loading..."}</Text>
          {membershipStatus === "approved" && (
            <Badge variant="success" size="sm">
              Verified Member
            </Badge>
          )}
        </View>
        {myProfile?.city && (
          <View style={styles.location}>
            <MapPin size={14} color="#827B8B" />
            <Text style={styles.locationText}>{myProfile.city}</Text>
            {myProfile.hometown && (
              <>
                <Text style={styles.locationText}> • </Text>
                <Text style={styles.locationText}>{myProfile.hometown}</Text>
              </>
            )}
          </View>
        )}
        <View style={styles.headerActions}>
          {editing ? (
            <>
              <Button variant="ghost" size="sm" onPress={() => setEditing(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onPress={handleSaveProfile}>
                Save
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onPress={() => setEditing(true)}>
              <Edit size={16} color="#7052C8" />
              Edit Profile
            </Button>
          )}
        </View>
      </View>

      {editing ? (
        <EditProfileForm form={editForm} onChange={setEditForm} />
      ) : (
        <>
          {myProfile?.bio && (
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.bio}>{myProfile.bio}</Text>
            </Card>
          )}

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.detailsGrid}>
              {myProfile?.profession && (
                <DetailItem icon={Briefcase} label="Profession" value={myProfile.profession} />
              )}
              {myProfile?.education && (
                <DetailItem icon={GraduationCap} label="Education" value={myProfile.education} />
              )}
              {myProfile?.hometown && (
                <DetailItem icon={MapPin} label="Hometown" value={myProfile.hometown} />
              )}
              {myProfile?.dateOfBirth && (
                <DetailItem icon={Heart} label="Birthday" value={formatDate(myProfile.dateOfBirth)} />
              )}
            </View>
          </Card>

          {myProfile?.interests && myProfile.interests.length > 0 && (
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Interests</Text>
              <View style={styles.interestsWrap}>
                {myProfile.interests.map((interest: string) => (
                  <Badge key={interest} variant="primary" size="sm">
                    {interest}
                  </Badge>
                ))}
              </View>
            </Card>
          )}

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Privacy</Text>
            <View style={styles.privacyItem}>
              <View style={styles.privacyInfo}>
                <Shield size={20} color="#7052C8" />
                <View>
                  <Text style={styles.privacyLabel}>Profile Visibility</Text>
                  <Text style={styles.privacyValue}>{formatVisibility(myProfile?.visibility)}</Text>
                </View>
              </View>
              <Button variant="ghost" size="sm" onPress={() => router.push("/(app)/privacy")}>
                Change
              </Button>
            </View>
          </Card>

          <View style={styles.settingsSection}>
            <Pressable onPress={() => router.push("/(app)/settings")} style={styles.settingsItem}>
              <Settings size={22} color="#7052C8" />
              <Text style={styles.settingsLabel}>Settings</Text>
            </Pressable>
            <Pressable onPress={() => setShowLogoutConfirm(true)} style={styles.settingsItemDanger}>
              <LogOut size={22} color="#EF4444" />
              <Text style={styles.settingsLabelDanger}>Log Out</Text>
            </Pressable>
          </View>
        </>
      )}
    </ScrollView>
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
    alignItems: "center",
    gap: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    color: "#282331",
  },
  location: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 14,
    color: "#827B8B",
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
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
  bio: {
    fontSize: 15,
    color: "#282331",
    lineHeight: 22,
  },
  detailsGrid: {
    gap: 16,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  detailText: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#827B8B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    color: "#282331",
  },
  interestsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  privacyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  privacyInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  privacyLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#282331",
  },
  privacyValue: {
    fontSize: 13,
    color: "#827B8B",
    marginTop: 2,
  },
  settingsSection: {
    gap: 8,
    marginTop: 8,
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
  settingsItemDanger: {
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
  settingsLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#282331",
    flex: 1,
  },
  settingsLabelDanger: {
    fontSize: 16,
    fontWeight: "500",
    color: "#EF4444",
    flex: 1,
  },
  editForm: {
    gap: 20,
  },
  editField: {
    gap: 6,
  },
  editLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#827B8B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  visibilityOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  visibilityOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F5F3F8",
    borderWidth: 1,
    borderColor: "#E8E2F0",
  },
  visibilityOptionSelected: {
    backgroundColor: "#EDE8F9",
    borderColor: "#7052C8",
  },
  visibilityOptionText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#282331",
  },
  visibilityOptionTextSelected: {
    color: "#7052C8",
  },
});