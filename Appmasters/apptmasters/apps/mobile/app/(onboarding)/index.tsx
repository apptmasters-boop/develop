import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { Colors } from "../../constants/colors";

export default function OnboardingIndex() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>A</Text>
        </View>
        <Text style={styles.title}>Welcome, {user?.name?.split(" ")[0] ?? "there"}!</Text>
        <Text style={styles.subtitle}>Set up your apartment to get started</Text>
      </View>

      <View style={styles.options}>
        <TouchableOpacity style={styles.card} onPress={() => router.push("/(onboarding)/create")}>
          <View style={[styles.iconBox, { backgroundColor: Colors.primaryLight }]}>
            <Text style={styles.icon}>🏠</Text>
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Create Apartment</Text>
            <Text style={styles.cardDesc}>Start fresh — you'll be the admin and can invite roommates</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push("/(onboarding)/join")}>
          <View style={[styles.iconBox, { backgroundColor: "#f0fdf4" }]}>
            <Text style={styles.icon}>🔑</Text>
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Join with Invite Code</Text>
            <Text style={styles.cardDesc}>Enter the code your roommate shared with you</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 24 },
  header: { alignItems: "center", marginTop: 80, marginBottom: 48 },
  logo: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: Colors.primary,
    justifyContent: "center", alignItems: "center", marginBottom: 20,
  },
  logoText: { color: "#fff", fontSize: 32, fontWeight: "700" },
  title: { fontSize: 24, fontWeight: "700", color: Colors.text, marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 15, color: Colors.textSecondary, textAlign: "center" },
  options: { gap: 16 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    flexDirection: "row", alignItems: "center", gap: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  iconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  icon: { fontSize: 24 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: Colors.text, marginBottom: 4 },
  cardDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  arrow: { fontSize: 18, color: Colors.textMuted },
  signOutBtn: { alignSelf: "center", marginTop: "auto", paddingVertical: 12 },
  signOutText: { color: Colors.textSecondary, fontSize: 14 },
});
