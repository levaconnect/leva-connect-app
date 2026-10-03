import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="step1" options={{ title: "Basic Info" }} />
      <Stack.Screen name="step2" options={{ title: "Location" }} />
      <Stack.Screen name="step3" options={{ title: "About You" }} />
      <Stack.Screen name="step4" options={{ title: "Interests" }} />
      <Stack.Screen name="step5" options={{ title: "Privacy" }} />
    </Stack>
  );
}