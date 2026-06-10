import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "../../contexts/useApi";
import { useAuth } from "../../contexts/AuthContext";
import { Colors } from "../../constants/colors";

type Chore = {
  id: string;
  name: string;
  status: string;
  points: number;
  dueAt: string;
  room?: { name: string } | null;
  assignedTo?: { id: string; name: string } | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: Colors.warning, bg: Colors.warningLight },
  overdue: { label: "Overdue", color: Colors.error, bg: Colors.errorLight },
  completed: { label: "Done", color: Colors.success, bg: Colors.successLight },
  swapped: { label: "Swapped", color: Colors.textSecondary, bg: Colors.border },
};

export default function Chores() {
  const { request } = useApi();
  const { user } = useAuth();
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"mine" | "all">("mine");

  const load = useCallback(async () => {
    try {
      const data = await request<Chore[]>("/api/chores");
      setChores(data ?? []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [request]);

  useEffect(() => { load(); }, []);

  async function markComplete(id: string) {
    try {
      await request(`/api/chores/${id}/complete`, { method: "PATCH" });
      load();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to complete chore");
    }
  }

  const filtered = filter === "mine"
    ? chores.filter(c => c.assignedTo?.id === user?.id || !c.assignedTo)
    : chores;

  const active = filtered.filter(c => c.status !== "completed");
  const done = filtered.filter(c => c.status === "completed");

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Chores</Text>
        <View style={styles.toggle}>
          {(["mine", "all"] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.toggleBtn, filter === f && styles.toggleActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.toggleText, filter === f && styles.toggleTextActive]}>
                {f === "mine" ? "Mine" : "All"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={[...active, ...done]}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
            <Text style={styles.emptyText}>No chores here!</Text>
          </View>
        }
        renderItem={({ item }) => {
          const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
          const isCompleted = item.status === "completed";
          return (
            <View style={[styles.card, isCompleted && styles.cardDone]}>
              <View style={styles.cardTop}>
                <View style={styles.cardMain}>
                  <Text style={[styles.choreName, isCompleted && styles.choreNameDone]}>{item.name}</Text>
                  <View style={styles.choreMeta}>
                    {item.room && <Text style={styles.metaText}>{item.room.name}</Text>}
                    {item.room && item.assignedTo && <Text style={styles.metaDot}>·</Text>}
                    {item.assignedTo && <Text style={styles.metaText}>{item.assignedTo.name}</Text>}
                  </View>
                </View>
                <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>
              <View style={styles.cardBottom}>
                <Text style={styles.points}>{item.points} pts</Text>
                <Text style={styles.due}>{formatDue(item.dueAt)}</Text>
                {!isCompleted && (
                  <TouchableOpacity style={styles.completeBtn} onPress={() => markComplete(item.id)}>
                    <Text style={styles.completeBtnText}>Mark Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

function formatDue(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < 0) return `${Math.abs(diff)}d ago`;
  return `In ${diff}d`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: 20, fontWeight: "700", color: Colors.text },
  toggle: { flexDirection: "row", backgroundColor: Colors.background, borderRadius: 10, padding: 2 },
  toggleBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  toggleActive: { backgroundColor: Colors.surface },
  toggleText: { fontSize: 13, fontWeight: "500", color: Colors.textSecondary },
  toggleTextActive: { color: Colors.text, fontWeight: "600" },
  list: { padding: 16, gap: 10, paddingBottom: 32 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16, color: Colors.textSecondary, fontWeight: "500" },
  card: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  cardDone: { opacity: 0.6 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  cardMain: { flex: 1, marginRight: 8 },
  choreName: { fontSize: 15, fontWeight: "600", color: Colors.text },
  choreNameDone: { textDecorationLine: "line-through", color: Colors.textSecondary },
  choreMeta: { flexDirection: "row", gap: 4, marginTop: 3 },
  metaText: { fontSize: 12, color: Colors.textSecondary },
  metaDot: { fontSize: 12, color: Colors.textMuted },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: "600" },
  cardBottom: { flexDirection: "row", alignItems: "center", gap: 12 },
  points: { fontSize: 13, fontWeight: "600", color: Colors.primary },
  due: { fontSize: 12, color: Colors.textSecondary, flex: 1 },
  completeBtn: {
    backgroundColor: Colors.primaryLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  completeBtnText: { fontSize: 12, fontWeight: "600", color: Colors.primary },
});
