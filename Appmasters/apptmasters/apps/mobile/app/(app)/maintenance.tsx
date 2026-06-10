import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApi } from "../../contexts/useApi";
import { Colors } from "../../constants/colors";

type Issue = {
  id: string;
  title: string;
  description: string;
  urgency: string;
  status: string;
  room?: { name: string } | null;
  reportedBy: { name: string };
  createdAt: string;
};

const URGENCY_COLOR: Record<string, string> = {
  low: Colors.success,
  medium: Colors.warning,
  high: Colors.error,
  emergency: "#7c3aed",
};

const STATUS_LABEL: Record<string, string> = {
  reported: "Reported",
  contacted_landlord: "Landlord contacted",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

export default function Maintenance() {
  const { request } = useApi();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [urgency, setUrgency] = useState("medium");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await request<Issue[]>("/api/maintenance");
      setIssues(data ?? []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [request]);

  useEffect(() => { load(); }, []);

  async function addIssue() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await request("/api/maintenance", {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), description: desc.trim(), urgency }),
      });
      setTitle(""); setDesc(""); setUrgency("medium");
      setShowAdd(false);
      load();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to report issue");
    } finally { setSaving(false); }
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Maintenance</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={styles.addBtnText}>+ Report</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={issues}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔧</Text>
            <Text style={styles.emptyText}>No issues reported.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={[styles.urgencyDot, { backgroundColor: URGENCY_COLOR[item.urgency] ?? Colors.textMuted }]} />
              <View style={styles.cardMain}>
                <Text style={styles.issueTitle}>{item.title}</Text>
                {item.description ? <Text style={styles.issueDesc} numberOfLines={2}>{item.description}</Text> : null}
              </View>
            </View>
            <View style={styles.cardBottom}>
              <Text style={styles.statusText}>{STATUS_LABEL[item.status] ?? item.status}</Text>
              <Text style={styles.reporterText}>by {item.reportedBy.name}</Text>
            </View>
          </View>
        )}
      />

      <Modal visible={showAdd} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={styles.modal} edges={["top", "bottom"]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAdd(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Report Issue</Text>
            <TouchableOpacity onPress={addIssue} disabled={saving}>
              <Text style={[styles.saveText, saving && { opacity: 0.5 }]}>{saving ? "Saving…" : "Save"}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle}
              placeholder="Leaking faucet, broken heater…" placeholderTextColor={Colors.textMuted} />
            <Text style={styles.fieldLabel}>Description (optional)</Text>
            <TextInput style={[styles.input, { height: 80, textAlignVertical: "top" }]}
              value={desc} onChangeText={setDesc} multiline
              placeholder="Add details…" placeholderTextColor={Colors.textMuted} />
            <Text style={styles.fieldLabel}>Urgency</Text>
            <View style={styles.chips}>
              {["low", "medium", "high", "emergency"].map(u => (
                <TouchableOpacity key={u}
                  style={[styles.chip, urgency === u && { backgroundColor: URGENCY_COLOR[u], borderColor: URGENCY_COLOR[u] }]}
                  onPress={() => setUrgency(u)}>
                  <Text style={[styles.chipText, urgency === u && { color: "#fff" }]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: 20, fontWeight: "700", color: Colors.text },
  addBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  list: { padding: 16, gap: 10, paddingBottom: 32 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 15, color: Colors.textSecondary },
  card: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  cardTop: { flexDirection: "row", gap: 12, marginBottom: 10 },
  urgencyDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  cardMain: { flex: 1 },
  issueTitle: { fontSize: 15, fontWeight: "600", color: Colors.text },
  issueDesc: { fontSize: 13, color: Colors.textSecondary, marginTop: 3, lineHeight: 18 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between" },
  statusText: { fontSize: 12, fontWeight: "600", color: Colors.primary },
  reporterText: { fontSize: 12, color: Colors.textMuted },
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
  chips: { flexDirection: "row", gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderStrong,
  },
  chipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: "500" },
});
