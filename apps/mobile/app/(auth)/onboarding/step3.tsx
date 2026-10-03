import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "expo-router";
import { Button, Input } from "@/components";
import { AlertCircle } from "lucide-react-native";
import { useState } from "react";

const step3Schema = z.object({
  bio: z.string().max(500).optional(),
  profession: z.string().max(100).optional(),
  education: z.string().max(100).optional(),
});

type Step3Form = z.infer<typeof step3Schema>;

export default function OnboardingStep3() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Step3Form>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      bio: "",
      profession: "",
      education: "",
    },
  });

  const onSubmit = async (data: Step3Form) => {
    setError(null);
    setIsLoading(true);
    try {
      router.push("/(auth)/onboarding/step4");
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
          <View style={[styles.progressBar, { width: "60%" }]} />
          <Text style={styles.progressText}>Step 3 of 5</Text>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Tell us about yourself</Text>
          <Text style={styles.subtitle}>Your professional background</Text>
        </View>

        <Input
          label="Bio"
          placeholder="A short introduction about yourself..."
          multiline
          numberOfLines={4}
          autoCapitalize="sentences"
          error={errors.bio?.message}
          {...register("bio")}
        />

        <Input
          label="Profession"
          placeholder="e.g., Software Engineer, Doctor, Teacher"
          autoCapitalize="words"
          error={errors.profession?.message}
          {...register("profession")}
        />

        <Input
          label="Education"
          placeholder="e.g., B.Tech Computer Science, MBBS"
          autoCapitalize="words"
          error={errors.education?.message}
          {...register("education")}
        />

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
            Continue
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