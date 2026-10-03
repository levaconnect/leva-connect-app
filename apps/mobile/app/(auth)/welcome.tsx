import { View, Text, StyleSheet, Image } from "react-native";
import { Link, useRouter } from "expo-router";
import { Button } from "@/components/Buttons";
import { Users, Heart, Shield } from "lucide-react-native";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.logoWrapper}>
          <View style={styles.logo}>
            <Users size={48} color="#FFFFFF" />
          </View>
        </View>
        <Text style={styles.appName}>LevaConnect</Text>
        <Text style={styles.tagline}>One Community. One Big Family.</Text>
      </View>

      <View style={styles.features}>
        <FeatureItem icon={Users} title="Find Your People" description="Connect with Leva Patil members worldwide" />
        <FeatureItem icon={Heart} title="Build Relationships" description="Meaningful connections, not just matches" />
        <FeatureItem icon={Shield} title="Private & Secure" description="Verified members, protected conversations" />
      </View>

      <View style={styles.actions}>
        <Button size="lg" fullWidth onPress={() => router.push("/(auth)/login")}>
          Welcome Back
        </Button>
        <Button variant="outline" size="lg" fullWidth onPress={() => router.push("/(auth)/register")}>
          Join the Community
        </Button>
      </View>
    </View>
  );
}

function FeatureItem({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <View style={styles.feature}>
      <View style={styles.featureIcon}>
        <Icon size={24} color="#7052C8" />
      </View>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF8F2",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  hero: {
    alignItems: "center",
    marginBottom: 48,
    gap: 16,
  },
  logoWrapper: {
    padding: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 28,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#7052C8",
    justifyContent: "center",
    alignItems: "center",
  },
  appName: {
    fontSize: 36,
    fontWeight: "800",
    color: "#21172F",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 18,
    color: "#827B8B",
    fontWeight: "400",
  },
  features: {
    gap: 20,
    marginBottom: 48,
  },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#21172F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#EDE8F9",
    justifyContent: "center",
    alignItems: "center",
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#282331",
  },
  featureDescription: {
    fontSize: 14,
    color: "#827B8B",
    marginTop: 2,
  },
  actions: {
    gap: 16,
    paddingHorizontal: 8,
  },
});