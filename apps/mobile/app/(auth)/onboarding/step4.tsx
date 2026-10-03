import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "expo-router";
import { Button, Input, Badge } from "@/components";
import { AlertCircle, Plus, X } from "lucide-react-native";
import { useState } from "react";

const COMMON_INTERESTS = [
  "Technology", "Community", "Heritage", "Culture", "Reading", "Travel",
  "Entrepreneurship", "Networking", "Cricket", "Music", "Medicine", "Art",
  "Classical Dance", "Cooking", "Yoga", "Public Policy", "Rural Development",
  "History", "Trekking", "Data Science", "AI/ML", "Photography", "Hiking",
  "Education", "Literature", "Architecture", "Design", "Finance", "Law",
  "Science", "Engineering", "Business", "Social Work", "Volunteering",
];

const step4Schema = z.object({
  interests: z.array(z.string()).max(20),
});

type Step4Form = z.infer<typeof step4Schema>;

export default function OnboardingStep4() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Step4Form>({
    resolver: zodResolver(step4Schema),
    defaultValues: { interests: [] },
  });

  const addCustomInterest = () => {
    const trimmed = customInterest.trim();
    if (trimmed && !selectedInterests.includes(trimmed) && selectedInterests.length < 20) {
      const updated = [...selectedInterests, trimmed];
      setSelectedInterests(updated);
      setValue("interests", updated);
      setCustomInterest("");
    }
  };

  const removeInterest = (interest: string) => {
    const updated = selectedInterests.filter((i) => i !== interest);
    setSelectedInterests(updated);
    setValue("interests", updated);
  };

  const onSubmit = async (data: Step4Form) => {
    setError(null);
    setIsLoading(true);
    try {
      router.push("/(auth)/onboarding/step5");
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
          <View style={[styles.progressBar, { width: "80%" }]} />
          <Text style={styles.progressText}>Step 4 of 5</Text>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>What are your interests?</Text>
          <Text style={styles.subtitle}>Select up to 20 topics</Text>
        </View>

        <View style={styles.customInput}>
          <Input
            label="Add Custom Interest"
            placeholder="Type and press Enter"
            value={customInterest}
            onChangeText={setCustomInterest}
            autoCapitalize="words"
            onSubmitEditing={addCustomInterest}
          />
        </View>

        <Text style={styles.sectionTitle}>Selected ({selectedInterests.length}/20)</Text>
        <View style={styles.selectedChips}>
          {selectedInterests.map((interest) => (
            <Badge key={interest} variant="primary" size="sm">
              {interest}
              <Pressable onPress={() => removeInterest(interest)} style={styles.removeBtn}>
                <X size={12} color="#7052C8" />
              </Pressable>
            </Badge>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Suggestions</Text>
        <View style={styles.suggestions}>
          {COMMON_INTERESTS.filter((i) => !selectedInterests.includes(i)).slice(0, 15).map((interest) => (
            <Pressable
              key={interest}
              onPress={() => {
                if (selectedInterests.length < 20 && !selectedInterests.includes(interest)) {
                  const updated = [...selectedInterests, interest];
                  setSelectedInterests(updated);
                  setValue("interests", updated);
                }
              }}
              style={[
                styles.suggestionChip,
                selectedInterests.includes(interest) && styles.suggestionChipSelected,
              ]}
            >
              <Text style={[
                styles.suggestionText,
                selectedInterests.includes(interest) && styles.suggestionTextSelected,
              ]}>
                {interest}
              </Text>
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
  customInput: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#282331",
    marginTop: 8,
  },
  selectedChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    minHeight: 40,
  },
  removeBtn: {
    marginLeft: 4,
    padding: 2,
  },
  suggestions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8E2F0",
  },
  suggestionChipSelected: {
    backgroundColor: "#EDE8F9",
    borderColor: "#7052C8",
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#282331",
  },
  suggestionTextSelected: {
    color: "#7052C8",
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