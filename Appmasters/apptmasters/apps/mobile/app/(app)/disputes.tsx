import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, TextInput, Modal, ActivityIndicator, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApi } from "../../contexts/useApi";
import { useAuth } from "../../contexts/AuthContext";
import { Colors } from "../../constants/colors";

type Dispute = {
  id: string;
  title: string;
  description: string;
  status: "open" | "resolved" | "closed";
  createdAt: string;
  createdBy: { id: string; name: string };
  votes?: { userId: string; vote: "agree" | "disagree" }[];
};

const STATUS_COLOR: Record<string, string> = {
  open: Colors.primary,
  resolved: Colors.success,
  closed: Colors.textMuted,
};

export default function Disputes() {
  const { request } = useApi();
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "open" | "resolved">("all");

  const load = useCallback(async () => {
    try {
      const data = await request<Dispute[]>("/api/disputes");
      setDisputes(data ?? []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [request]);

  useEffect(() => { load(); }, []);

  async function submit() {
    if (!title.trim() || !desc.trim()) return;
    setSubmitting(true);
    try {
      await request("/api/disputes", {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), description: desc.trim() }),
      });
      setTitle(""); setDesc(""); setShowAdd(false);
      load();
    } catch {}
    finally { setSubmitting(false); }
  }

  async function vote(id: string, vote: "agree" | "disagree") {
    try {
      await request(`/api/disputes/${id}/vote`, { method: "POST", body: JSON.stringify({ vote }) });
      load();
    } catch {}
  }

  async function resolve(id: string) {
    try {
      await request(`/api/disputes/${id}/resolve`, { method: "PATCH" });
      load();
    } catch {}
  }

  const filtered = activeFilter === "all" ? disputes : disputes.filter(d => d.status === activeFilter);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Disputes</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        {(["all", "open", "resolved"] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>⚖️</Text>
            <Text style={styles.emptyText}>No disputes. Good vibes only! 🙌</Text>
          </View>
        }
        renderItem={({ item }) => {
          const agrees = item.votes?.filter(v => v.vote === "agree").length ?? 0;
          const disagrees = item.votes?.filter(v => v.vote === "disagree").length ?? 0;
          const myVote = item.votes?.find(v => v.userId === user?.id)?.vote;
          const isAuthor = item.createdBy.id === user?.id;

          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardMeta}>
                  <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[item.status] ?? Colors.textMuted }]} />
                  <Text style={styles.cardStatus}>{item.status}</Text>
                </View>
                <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
              </View>

              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc}>{item.description}</Text>
              <Text style={styles.cardAuthor}>by {item.createdBy.name}</Text>

              {item.status === "open" && (
                <View style={styles.voteRow}>
                  <TouchableOpacity
                    style={[styles.voteBtn, myVote === "agree" && styles.voteBtnActive]}
                    onPress={() => vote(item.id, "agree")}
                  >
                    <Text style={[styles.voteBtnText, myVote === "agree" && styles.voteBtnTextActive]}>
                      👍 {agrees}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.voteBtn, myVote === "disagree" && styles.voteBtnNeg]}
                    onPress={() => vote(item.id, "disagree")}
                  >
                    <Text style={[styles.voteBtnText, myVote === "disagree" && styles.voteBtnTextActive]}>
                      👎 {disagrees}
                    </Text>
                  </TouchableOpacity>
                  {isAuthor && (
                    <TouchableOpacity style={styles.resolveBtn} onPress={() => resolve(item.id)}>
                      <Text style={styles.resolveBtnText}>Mark Resolved</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        }}
      />

      <Modal visible={showAdd} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={styles.modal} edges={["top", "bottom"]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAdd(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Dispute</Text>
            <TouchableOpacity onPress={submit} disabled={submitting || !title.trim() || !desc.trim()}>
              <Text style={[styles.saveText, (!title.trim() || !desc.trim() || submitting) && { opacity: 0.4 }]}>
                {submitting ? "Submitting…" : "Submit"}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} contentContainerStyle={{ gap: 14 }}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="What's the issue?"
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={desc}
              onChangeText={setDesc}
              placeholder="Describe the dispute in detail…"
              placeholderTextColor={Colors.textMuted}
              multiline
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
  filters: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.borderStrong },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 13, color: Colors.textSecondary, fontWeight: "500" },
  filterTextActive: { color: "#fff" },
  list: { padding: 16, gap: 12, paddingBottom: 32 },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 14, color: Colors.textSecondary },
  card: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 6 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  cardStatus: { fontSize: 11, color: Colors.textSecondary, textTransform: "uppercase", fontWeight: "600", letterSpacing: 0.5 },
  cardDate: { fontSize: 11, color: Colors.textMuted },
  cardTitle: { fontSize: 16, fontWeight: "700", color: Colors.text },
  cardDesc: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  cardAuthor: { fontSize: 12, color: Colors.textMuted },
  voteRow: { flexDirection: "row", gap: 8, marginTop: 6, alignItems: "center", flexWrap: "wrap" },
  voteBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.borderStrong },
  voteBtnActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  voteBtnNeg: { backgroundColor: Colors.errorLight, borderColor: Colors.error },
  voteBtnText: { fontSize: 13, color: Colors.textSecondary, fontWeight: "500" },
  voteBtnTextActive: { color: Colors.primary },
  resolveBtn: { marginLeft: "auto", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.successLight, borderWidth: 1, borderColor: Colors.success },
  resolveBtnText: { fontSize: 13, color: Colors.success, fontWeight: "600" },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface,
  },
  cancelText: { fontSize: 15, color: Colors.textSecondary },
  modalTitle: { fontSize: 16, fontWeight: "700", color: Colors.text },
  saveText: { fontSize: 15, fontWeight: "600", color: Colors.primary },
  modalBody: { padding: 20 },
  label: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.borderStrong },
  textArea: { minHeight: 120, textAlignVertical: "top" },
});
