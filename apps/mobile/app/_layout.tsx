import { Stack } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { useEffect } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  const { initializeAuth, isInitialized, isAuthenticated, membershipStatus } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7052C8" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
        }}
      >
        {isAuthenticated ? (
          <>
            {membershipStatus === "pending" || membershipStatus === "rejected" || membershipStatus === "suspended" ? (
              <Stack.Screen name="(app)/membership-pending" />
            ) : (
              <>
                <Stack.Screen name="(app)/home" />
                <Stack.Screen name="(app)/discover" />
                <Stack.Screen name="(app)/connections" />
                <Stack.Screen name="(app)/chat" />
                <Stack.Screen name="(app)/profile" />
              </>
            )}
          </>
        ) : (
          <Stack.Screen name="(auth)/welcome" />
        )}
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAF8F2",
  },
});