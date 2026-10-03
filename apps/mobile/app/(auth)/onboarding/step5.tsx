import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "expo-router";
import { Button, Input } from "@/components";
import { useProfileStore } from "@/store/profileStore";
import { AlertCircle, Shield, Users, Lock } from "lucide-react-native";
import { useState } from "react";

const step5Schema = z.object({
  visibility: z.enum(["community", "connections", "private"]),
});

type Step5Form = z.infer<typeof step5Schema>;

const VISIBILITY_OPTIONS = [
  {
    value: "community" as const,
    label: "Community",
    description: "Visible to all approved members",
    icon: Users,
  },
  {
    value: "connections" as const,
    label: "Connections Only",
    description: "Visible only to your connections",
    icon: Shield,
  },
  {
    value: "private" as const,
    label: "Private",
    description: "Visible only to you",
    icon: Lock,
  },
];

export default function OnboardingStep5() {
  const router = useRouter();
  const { completeOnboarding } = useProfileStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Step5Form>({
    resolver: zodResolver(step5Schema),
    defaultValues: { visibility: "community" },
  });

  const visibility = watch("visibility");

  const onSubmit = async (data: Step5Form) => {
    setError(null);
    setIsLoading(true);
    try {
      // Collect all onboarding data from previous steps
      // For now, we'll just complete with the visibility setting
      // In a real app, you'd persist all steps' data
      await completeOnboarding({
        visibility: data.visibility,
        // Other fields would come from previous steps
      });
      router.replace("/(app)/membership-pending");
    } catch (err: any) {
      setError(err.message || "Failed to complete onboarding");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.progress}>
          <View style={[styles.progressBar, { width: "100%" }]} />
          <Text style={styles.progressText}>Step 5 of 5</Text>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Privacy Settings</Text>
          <Text style={styles.subtitle}>Choose who can see your profile</Text>
        </View>

        <View style={styles.options}>
          {VISIBILITY_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setValue("visibility", option.value)}
              style={[
                styles.option,
                visibility === option.value && styles.optionSelected,
              ]}
            >
              <View style={styles.optionIcon}>
                <option.icon size={24} color={visibility === option.value ? "#FFFFFF" : "#7052C8"} />
              </View>
              <View style={styles.optionContent}>
                <Text style={[
                  styles.optionLabel,
                  visibility === option.value && styles.optionLabelSelected,
                ]}>
                  {option.label}
                </Text>
                <Text style={[
                  styles.optionDescription,
                  visibility === option.value && styles.optionDescriptionSelected,
                ]}>
                  {option.description}
                </Text>
              </View>
              {visibility === option.value && (
                <View style={styles.checkmark}>
                  <View style={styles.checkmarkInner} />
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {error && (
          <View style={styles.error}>
            <AlertCircle size={16} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.navButtons}>
          <Button variant="outline" size="lg" fullWidth onPress={() => router.back()}>
            Back
          </Button>
          <Button variant="primary" size="lg" fullWidth loading={isLoading} onPress={handleSubmit(onSubmit)}>
            Complete & Apply
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF8F2",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    gap: 24,
  },
  progress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: "#EDE8F9",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#827B8B",
  },
  header: {
    alignItems: "center",
    gap: 8,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#21172F",
  },
  subtitle: {
    fontSize: 16,
    color: "#827B8B",
  },
  options: {
    gap: 12,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#E8E2F0",
    gap: 16,
  },
  optionSelected: {
    borderColor: "#7052C8",
    backgroundColor: "#F5F2FA",
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#EDE8F9",
    justifyContent: "center",
    alignItems: "center",
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#282331",
  },
  optionLabelSelected: {
    color: "#7052C8",
  },
  optionDescription: {
    fontSize: 13,
    color: "#827B8B",
    marginTop: 2,
  },
  optionDescriptionSelected: {
    color: "#BBA5F5",
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#7052C8",
    justifyContent: "center",
    alignItems: "center",
  },
  checkmarkInner: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  error: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    flex: 1,
  },
  navButtons: {
    flexDirection: "column",
    gap: 12,
    marginTop: 8,
  },
});