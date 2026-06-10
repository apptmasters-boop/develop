import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, TextInput, Modal, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApi } from "../../contexts/useApi";
import { useAuth } from "../../contexts/AuthContext";
import { Colors } from "../../constants/colors";

type FeedPost = {
  id: string;
  type: string;
  content: string;
  createdAt: string;
  user?: { id: string; name: string; color?: string } | null;
};

const TYPE_EMOJI: Record<string, string> = {
  announcement: "📢",
  chore_completed: "✅",
  expense_added: "💸",
  maintenance: "🔧",
  milestone: "🎉",
  manual: "💬",
};

export default function Feed() {
  const { request } = useApi();
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await request<FeedPost[]>("/api/feed");
      setPosts(data ?? []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [request]);

  useEffect(() => { load(); }, []);

  async function post() {
    if (!content.trim()) return;
    setPosting(true);
    try {
      await request("/api/feed", {
        method: "POST",
        body: JSON.stringify({ type: "manual", content: content.trim() }),
      });
      setContent(""); setShowAdd(false);
      load();
    } catch {}
    finally { setPosting(false); }
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Activity Feed</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={styles.addBtnText}>Post</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No activity yet.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <Text style={styles.typeEmoji}>{TYPE_EMOJI[item.type] ?? "📌"}</Text>
            </View>
            <View style={styles.cardRight}>
              {item.user && (
                <Text style={styles.userName}>{item.user.name}</Text>
              )}
              <Text style={styles.cardContent}>{item.content}</Text>
              <Text style={styles.cardTime}>{formatTime(item.createdAt)}</Text>
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
            <Text style={styles.modalTitle}>New Post</Text>
            <TouchableOpacity onPress={post} disabled={posting || !content.trim()}>
              <Text style={[styles.saveText, (!content.trim() || posting) && { opacity: 0.4 }]}>
                {posting ? "Posting…" : "Post"}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <TextInput
              style={styles.textArea}
              value={content}
              onChangeText={setContent}
              placeholder="Share something with your apartment…"
              placeholderTextColor={Colors.textMuted}
              multiline
              autoFocus
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diff < 1) return "Just now";
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 14, color: Colors.textSecondary },
  card: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
    flexDirection: "row", gap: 12, borderWidth: 1, borderColor: Colors.border,
  },
  cardLeft: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.background,
    justifyContent: "center", alignItems: "center",
  },
  typeEmoji: { fontSize: 20 },
  cardRight: { flex: 1 },
  userName: { fontSize: 13, fontWeight: "700", color: Colors.primary, marginBottom: 2 },
  cardContent: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  cardTime: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
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
  textArea: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
    fontSize: 15, color: Colors.text, textAlignVertical: "top",
    borderWidth: 1, borderColor: Colors.border,
  },
});
