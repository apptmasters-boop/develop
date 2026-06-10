import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator, TextInput, Modal, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "../../contexts/useApi";
import { Colors } from "../../constants/colors";

type ItemStatus = "pending" | "ok" | "needs_repair" | "missing";

type ChecklistItem = {
  id: string;
  label: string;
  status: ItemStatus;
  notes: string | null;
  room: { name: string } | null;
};

type Checklist = {
  id: string;
  scheduledDate: string | null;
  notes: string | null;
  submitted: boolean;
  items: ChecklistItem[];
};

const STATUS_META: Record<ItemStatus, { label: string; color: string; icon: string }> = {
  pending: { label: "Pending", color: Colors.textMuted, icon: "ellipse-outline" },
  ok: { label: "OK", color: Colors.success, icon: "checkmark-circle" },
  needs_repair: { label: "Needs Repair", color: Colors.warning, icon: "warning" },
  missing: { label: "Missing", color: Colors.error, icon: "close-circle" },
};

export default function MoveOut() {
  const { request } = useApi();
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editItem, setEditItem] = useState<ChecklistItem | null>(null);
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await request<Checklist>("/api/move-out");
      setChecklist(data);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [request]);

  useEffect(() => { load(); }, []);

  async function setStatus(itemId: string, status: ItemStatus) {
    try {
      await request(`/api/move-out/item/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setChecklist(prev => prev ? {
        ...prev,
        items: prev.items.map(i => i.id === itemId ? { ...i, status } : i),
      } : prev);
    } catch {}
  }

  async function saveNote() {
    if (!editItem) return;
    setSaving(true);
    try {
      await request(`/api/move-out/item/${editItem.id}`, {
        method: "PATCH",
        body: JSON.stringify({ notes: noteText }),
      });
      setChecklist(prev => prev ? {
        ...prev,
        items: prev.items.map(i => i.id === editItem.id ? { ...i, notes: noteText } : i),
      } : prev);
      setEditItem(null);
    } catch {}
    finally { setSaving(false); }
  }

  const doneCount = checklist?.items.filter(i => i.status === "ok").length ?? 0;
  const total = checklist?.items.length ?? 0;
  const progress = total > 0 ? doneCount / total : 0;

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  if (!checklist) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Could not load checklist.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Move-Out Checklist</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressCard}>
        <View style={styles.progressTop}>
          <Text style={styles.progressLabel}>{doneCount} of {total} complete</Text>
          <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` as never }]} />
        </View>
        {checklist.submitted && (
          <Text style={styles.submittedBadge}>✅ Submitted to landlord</Text>
        )}
      </View>

      <FlatList
        data={checklist.items}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const meta = STATUS_META[item.status];
          return (
            <View style={[styles.item, item.status === "ok" && styles.itemDone]}>
              <View style={styles.itemLeft}>
                {item.room && <Text style={styles.itemRoom}>{item.room.name}</Text>}
                <Text style={[styles.itemLabel, item.status === "ok" && styles.itemLabelDone]}>{item.label}</Text>
                {item.notes ? <Text style={styles.itemNotes}>{item.notes}</Text> : null}
              </View>
              <View style={styles.itemActions}>
                <TouchableOpacity onPress={() => { setEditItem(item); setNoteText(item.notes ?? ""); }}>
                  <Ionicons name="create-outline" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statusBtn, { borderColor: meta.color }]}
                  onPress={() => {
                    const cycle: ItemStatus[] = ["pending", "ok", "needs_repair", "missing"];
                    const next = cycle[(cycle.indexOf(item.status) + 1) % cycle.length];
                    setStatus(item.id, next);
                  }}
                >
                  <Ionicons name={meta.icon as never} size={18} color={meta.color} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Status legend */}
      <View style={styles.legend}>
        {(Object.entries(STATUS_META) as [ItemStatus, typeof STATUS_META[ItemStatus]][]).map(([key, m]) => (
          <View key={key} style={styles.legendItem}>
            <Ionicons name={m.icon as never} size={14} color={m.color} />
            <Text style={[styles.legendText, { color: m.color }]}>{m.label}</Text>
          </View>
        ))}
      </View>

      {/* Notes modal */}
      <Modal visible={!!editItem} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={styles.modal} edges={["top", "bottom"]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditItem(null)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Notes</Text>
            <TouchableOpacity onPress={saveNote} disabled={saving}>
              <Text style={[styles.saveText, saving && { opacity: 0.4 }]}>{saving ? "Saving…" : "Save"}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            {editItem && (
              <Text style={styles.itemLabelModal}>{editItem.label}</Text>
            )}
            <TextInput
              style={styles.noteInput}
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Add notes (e.g. scuff on east wall, photographed)…"
              placeholderTextColor={Colors.textMuted}
              multiline
              autoFocus
            />

            {editItem && (
              <View style={styles.statusRow}>
                <Text style={styles.statusRowLabel}>Status</Text>
                <View style={styles.statusChips}>
                  {(["pending", "ok", "needs_repair", "missing"] as ItemStatus[]).map(s => {
                    const m = STATUS_META[s];
                    return (
                      <TouchableOpacity
                        key={s}
                        style={[styles.statusChip, editItem.status === s && { borderColor: m.color, backgroundColor: m.color + "22" }]}
                        onPress={() => setEditItem(prev => prev ? { ...prev, status: s } : prev)}
                      >
                        <Text style={[styles.statusChipText, editItem.status === s && { color: m.color }]}>{m.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background },
  errorText: { fontSize: 14, color: Colors.textSecondary },
  header: {
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: 20, fontWeight: "700", color: Colors.text },
  progressCard: {
    margin: 16, backgroundColor: Colors.surface, borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 8,
  },
  progressTop: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontSize: 14, color: Colors.textSecondary },
  progressPct: { fontSize: 14, fontWeight: "700", color: Colors.primary },
  progressBar: { height: 8, backgroundColor: Colors.background, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: 8, backgroundColor: Colors.success, borderRadius: 4 },
  submittedBadge: { fontSize: 12, color: Colors.success, fontWeight: "600" },
  list: { paddingHorizontal: 16, paddingBottom: 80, gap: 8 },
  item: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  itemDone: { opacity: 0.6 },
  itemLeft: { flex: 1 },
  itemRoom: { fontSize: 11, color: Colors.textMuted, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  itemLabel: { fontSize: 14, color: Colors.text, fontWeight: "500" },
  itemLabelDone: { textDecorationLine: "line-through", color: Colors.textSecondary },
  itemNotes: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, fontStyle: "italic" },
  itemActions: { flexDirection: "row", gap: 10, alignItems: "center" },
  statusBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, justifyContent: "center", alignItems: "center" },
  legend: {
    flexDirection: "row", flexWrap: "wrap", gap: 12,
    paddingHorizontal: 16, paddingVertical: 10,
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendText: { fontSize: 11, fontWeight: "500" },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface,
  },
  cancelText: { fontSize: 15, color: Colors.textSecondary },
  modalTitle: { fontSize: 16, fontWeight: "700", color: Colors.text },
  saveText: { fontSize: 15, fontWeight: "600", color: Colors.primary },
  modalBody: { padding: 20, flex: 1, gap: 16 },
  itemLabelModal: { fontSize: 15, fontWeight: "600", color: Colors.text },
  noteInput: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
    fontSize: 15, color: Colors.text, textAlignVertical: "top",
    borderWidth: 1, borderColor: Colors.border, minHeight: 100,
  },
  statusRow: { gap: 8 },
  statusRowLabel: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  statusChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.borderStrong,
  },
  statusChipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: "500" },
});
