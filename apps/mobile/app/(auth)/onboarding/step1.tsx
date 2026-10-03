import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "expo-router";
import { Button, Input, Avatar } from "@/components";
import { useProfileStore } from "@/store/profileStore";
import { Camera, AlertCircle } from "lucide-react-native";
import { useState } from "react";

const step1Schema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100),
  avatarUrl: z.string().url().nullable().optional(),
});

type Step1Form = z.infer<typeof step1Schema>;

export default function OnboardingStep1() {
  const router = useRouter();
  const { completeOnboarding } = useProfileStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Step1Form>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      fullName: "",
      avatarUrl: null,
    },
  });

  const onSubmit = async (data: Step1Form) => {
    setError(null);
    setIsLoading(true);
    try {
      // For step 1, we just navigate to next step
      // The actual onboarding completion happens at the end
      router.push("/(auth)/onboarding/step2");
    } catch (err: any) {
      setError(err.message || "Failed to continue");
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
          <View style={[styles.progressBar, { width: "20%" }]} />
          <Text style={styles.progressText}>Step 1 of 5</Text>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Let's get to know you</Text>
          <Text style={styles.subtitle}>Start with the basics</Text>
        </View>

        <View style={styles.avatarSection}>
          <Avatar
            source={avatarUrl ? { uri: avatarUrl } : undefined}
            name={register("fullName").value || "Your Name"}
            size="xl"
          />
          <Button variant="outline" size="sm" onPress={() => { /* TODO: image picker */ }}>
            <Camera size={18} color="#7052C8" />
          </Button>
        </View>

        <Input
          label="Full Name"
          placeholder="Your full name"
          autoCapitalize="words"
          error={errors.fullName?.message}
          {...register("fullName")}
        />

        {error && (
          <View style={styles.error}>
            <AlertCircle size={16} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Button variant="primary" size="lg" fullWidth loading={isLoading} onPress={handleSubmit(onSubmit)}>
          Continue
        </Button>
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
  avatarSection: {
    alignItems: "center",
    gap: 16,
    marginTop: 8,
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
});