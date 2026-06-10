import { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { useApi } from "../../contexts/useApi";
import { Colors } from "../../constants/colors";

type Apartment = { id: string; name: string; inviteCode: string };

export default function Settings() {
  const { user, signOut } = useAuth();
  const { request } = useApi();
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [loadingApt, setLoadingApt] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [showCode, setShowCode] = useState(false);

  async function loadApartment() {
    setLoadingApt(true);
    try {
      const apt = await request<Apartment>("/api/apartment");
      setApartment(apt);
    } catch {}
    finally { setLoadingApt(false); }
  }

  async function saveProfile() {
    if (!name.trim()) return;
    setSavingProfile(true);
    try {
      await request("/api/users/me", { method: "PATCH", body: JSON.stringify({ name: name.trim() }) });
      setShowProfile(false);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to update profile");
    } finally { setSavingProfile(false); }
  }

  async function handleShowCode() {
    if (!apartment) await loadApartment();
    setShowCode(true);
  }

  const ITEMS = [
    {
      icon: "person-circle" as const,
      label: "Edit Profile",
      desc: "Change your display name",
      onPress: () => { setName(user?.name ?? ""); setShowProfile(true); },
    },
    {
      icon: "key" as const,
      label: "Invite Code",
      desc: "Share your apartment code",
      onPress: handleShowCode,
    },
    {
      icon: "notifications" as const,
      label: "Notifications",
      desc: "Manage notification preferences",
      onPress: () => Alert.alert("Coming soon"),
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile summary */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{(user?.name ?? "?")[0].toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
        </View>

        {/* Menu items */}
        <View style={styles.menu}>
          {ITEMS.map((item, i) => (
            <TouchableOpacity key={i} style={styles.menuItem} onPress={item.onPress}>
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon} size={20} color={Colors.primary} />
              </View>
              <View style={styles.menuText}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuDesc}>{item.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit profile modal */}
      <Modal visible={showProfile} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={styles.modal} edges={["top", "bottom"]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowProfile(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={saveProfile} disabled={savingProfile}>
              <Text style={[styles.saveText, savingProfile && { opacity: 0.5 }]}>
                {savingProfile ? "Saving…" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.fieldLabel}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Invite code modal */}
      <Modal visible={showCode} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={styles.codeModal}>
            <Text style={styles.codeTitle}>Invite Code</Text>
            {loadingApt ? (
              <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
            ) : (
              <Text style={styles.codeValue}>{apartment?.inviteCode ?? "—"}</Text>
            )}
            <Text style={styles.codeHint}>Share this code with your roommates</Text>
            <TouchableOpacity style={styles.codeCloseBtn} onPress={() => setShowCode(false)}>
              <Text style={styles.codeCloseBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: 20, fontWeight: "700", color: Colors.text },
  content: { padding: 20, gap: 20, paddingBottom: 40 },
  profileCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    flexDirection: "row", alignItems: "center", gap: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  profileAvatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary,
    justifyContent: "center", alignItems: "center",
  },
  profileAvatarText: { color: "#fff", fontSize: 22, fontWeight: "700" },
  profileName: { fontSize: 16, fontWeight: "700", color: Colors.text },
  profileEmail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  menu: {
    backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  menuIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primaryLight,
    justifyContent: "center", alignItems: "center",
  },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 14, fontWeight: "600", color: Colors.text },
  menuDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  signOutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.errorLight, borderRadius: 14, padding: 14,
  },
  signOutText: { color: Colors.error, fontSize: 15, fontWeight: "600" },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface,
  },
  cancelText: { fontSize: 15, color: Colors.textSecondary },
  modalTitle: { fontSize: 16, fontWeight: "700", color: Colors.text },
  saveText: { fontSize: 15, fontWeight: "600", color: Colors.primary },
  modalBody: { padding: 20, gap: 12 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderStrong,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text,
  },
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center", alignItems: "center",
  },
  codeModal: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 28,
    width: 280, alignItems: "center", gap: 8,
  },
  codeTitle: { fontSize: 17, fontWeight: "700", color: Colors.text },
  codeValue: {
    fontSize: 34, fontWeight: "800", color: Colors.primary,
    letterSpacing: 4, marginVertical: 8,
  },
  codeHint: { fontSize: 13, color: Colors.textSecondary, textAlign: "center" },
  codeCloseBtn: {
    marginTop: 12, backgroundColor: Colors.primary, borderRadius: 12,
    paddingHorizontal: 28, paddingVertical: 10,
  },
  codeCloseBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
