import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { useApi } from "../../contexts/useApi";
import { Colors } from "../../constants/colors";

export default function JoinApartment() {
  const { refreshApartment } = useAuth();
  const { request } = useApi();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    if (!code.trim()) return;
    setError(null);
    setLoading(true);
    try {
      await request("/api/apartment/join", { method: "POST", body: JSON.stringify({ inviteCode: code.trim().toUpperCase() }) });
      await refreshApartment();
      router.replace("/(app)/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid invite code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.emoji}>🔑</Text>
        <Text style={styles.title}>Enter invite code</Text>
        <Text style={styles.subtitle}>Ask your roommate for the 8-character code from their Settings</Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TextInput
          style={[styles.input, styles.codeInput]}
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          placeholder="AB12CD34"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={8}
          autoFocus
          onSubmitEditing={handleJoin}
          returnKeyType="go"
        />

        <TouchableOpacity style={styles.button} onPress={handleJoin} disabled={loading || code.length < 4}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Join Apartment</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 24 },
  back: { marginTop: 12, marginBottom: 8 },
  backText: { color: Colors.primary, fontSize: 15, fontWeight: "500" },
  content: { flex: 1, justifyContent: "center", gap: 16 },
  emoji: { fontSize: 48, textAlign: "center" },
  title: { fontSize: 24, fontWeight: "700", color: Colors.text, textAlign: "center" },
  subtitle: { fontSize: 15, color: Colors.textSecondary, textAlign: "center", marginBottom: 8 },
  errorBox: { backgroundColor: Colors.errorLight, borderRadius: 12, padding: 12 },
  errorText: { color: Colors.error, fontSize: 14 },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderStrong,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 16, color: Colors.text,
  },
  codeInput: {
    textAlign: "center", letterSpacing: 6, fontSize: 22, fontWeight: "700",
  },
  button: {
    backgroundColor: Colors.primary, borderRadius: 12, padding: 14, alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
