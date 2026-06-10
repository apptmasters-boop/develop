import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, TextInput, Modal, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApi } from "../../contexts/useApi";
import { useAuth } from "../../contexts/AuthContext";
import { Colors } from "../../constants/colors";

type HouseRule = {
  id: string;
  content: string;
  status: "proposed" | "active" | "rejected";
  proposedBy: { id: string; name: string };
  yesCount: number;
  noCount: number;
  myVote: boolean | null;
  createdAt: string;
};

const STATUS_COLOR: Record<string, string> = {
  proposed: Colors.warning,
  active: Colors.success,
  rejected: Colors.error,
};

const STATUS_LABEL: Record<string, string> = {
  proposed: "Proposed",
  active: "Active",
  rejected: "Rejected",
};

export default function HouseRules() {
  const { request } = useApi();
  const { user } = useAuth();
  const [rules, setRules] = useState<HouseRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await request<HouseRule[]>("/api/rules");
      setRules(data ?? []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [request]);

  useEffect(() => { load(); }, []);

  async function propose() {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await request("/api/rules", {
        method: "POST",
        body: JSON.stringify({ content: content.trim() }),
      });
      setContent(""); setShowAdd(false);
      load();
    } catch {}
    finally { setSubmitting(false); }
  }

  async function vote(ruleId: string, v: boolean) {
    try {
      await request(`/api/rules/${ruleId}/vote`, {
        method: "POST",
        body: JSON.stringify({ vote: v }),
      });
      load();
    } catch {}
  }

  const active = rules.filter(r => r.status === "active");
  const proposed = rules.filter(r => r.status === "proposed");
  const rejected = rules.filter(r => r.status === "rejected");

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>House Rules</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={styles.addBtnText}>+ Propose</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={[...proposed, ...active, ...rejected]}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          active.length > 0 ? (
            <View style={styles.activeBanner}>
              <Text style={styles.activeBannerText}>✅ {active.length} active rule{active.length > 1 ? "s" : ""} in effect</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No house rules yet. Propose the first one!</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, item.status === "active" && styles.cardActive]}>
            <View style={styles.cardTop}>
              <View style={[styles.statusChip, { backgroundColor: STATUS_COLOR[item.status] + "22" }]}>
                <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>
                  {STATUS_LABEL[item.status]}
                </Text>
              </View>
              <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
            </View>

            <Text style={styles.cardContent}>{item.content}</Text>
            <Text style={styles.cardAuthor}>Proposed by {item.proposedBy.name}</Text>

            {item.status === "proposed" && (
              <View style={styles.voteRow}>
                <View style={styles.voteCount}>
                  <Text style={styles.voteCountText}>👍 {item.yesCount}  👎 {item.noCount}</Text>
                </View>
                <View style={styles.voteBtns}>
                  <TouchableOpacity
                    style={[styles.voteBtn, item.myVote === true && styles.voteBtnYes]}
                    onPress={() => vote(item.id, true)}
                  >
                    <Text style={[styles.voteBtnText, item.myVote === true && styles.voteBtnTextActive]}>Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.voteBtn, item.myVote === false && styles.voteBtnNo]}
                    onPress={() => vote(item.id, false)}
                  >
                    <Text style={[styles.voteBtnText, item.myVote === false && styles.voteBtnTextActive]}>No</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      />

      <Modal visible={showAdd} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={styles.modal} edges={["top", "bottom"]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAdd(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Propose Rule</Text>
            <TouchableOpacity onPress={propose} disabled={submitting || !content.trim()}>
              <Text style={[styles.saveText, (!content.trim() || submitting) && { opacity: 0.4 }]}>
                {submitting ? "Proposing…" : "Propose"}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.modalHint}>All members must vote yes for a rule to become active.</Text>
            <TextInput
              style={styles.textArea}
              value={content}
              onChangeText={setContent}
              placeholder="e.g. No dishes left in the sink overnight."
              placeholderTextColor={Colors.textMuted}
              multiline
              autoFocus
              maxLength={500}
            />
            <Text style={styles.charCount}>{content.length}/500</Text>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
  list: { padding: 16, gap: 12, paddingBottom: 32 },
  activeBanner: {
    backgroundColor: Colors.successLight, borderRadius: 12, padding: 12,
    marginBottom: 4, borderWidth: 1, borderColor: Colors.success,
  },
  activeBannerText: { fontSize: 13, fontWeight: "600", color: Colors.success },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: "center" },
  card: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.border, gap: 8,
  },
  cardActive: { borderColor: Colors.success },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  cardDate: { fontSize: 11, color: Colors.textMuted },
  cardContent: { fontSize: 15, color: Colors.text, lineHeight: 22 },
  cardAuthor: { fontSize: 12, color: Colors.textMuted },
  voteRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  voteCount: {},
  voteCountText: { fontSize: 14, color: Colors.textSecondary },
  voteBtns: { flexDirection: "row", gap: 8 },
  voteBtn: {
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.borderStrong,
  },
  voteBtnYes: { backgroundColor: Colors.successLight, borderColor: Colors.success },
  voteBtnNo: { backgroundColor: Colors.errorLight, borderColor: Colors.error },
  voteBtnText: { fontSize: 14, fontWeight: "600", color: Colors.textSecondary },
  voteBtnTextActive: { color: Colors.text },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface,
  },
  cancelText: { fontSize: 15, color: Colors.textSecondary },
  modalTitle: { fontSize: 16, fontWeight: "700", color: Colors.text },
  saveText: { fontSize: 15, fontWeight: "600", color: Colors.primary },
  modalBody: { padding: 20, flex: 1 },
  modalHint: { fontSize: 13, color: Colors.textSecondary, marginBottom: 14, lineHeight: 18 },
  textArea: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
    fontSize: 15, color: Colors.text, textAlignVertical: "top",
    borderWidth: 1, borderColor: Colors.border,
  },
  charCount: { textAlign: "right", fontSize: 11, color: Colors.textMuted, marginTop: 4 },
});
