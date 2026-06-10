// This file is superseded by chat/index.tsx + chat/_layout.tsx.
// Expo Router v3 gives the directory priority over the same-name file.
// Keeping it here only as a fallback; it should not be reached in normal routing.
import { Redirect } from "expo-router";
export default function ChatFallback() { return <Redirect href="/chat" />; }
/*
import { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useApi } from "../../contexts/useApi";
import { useAuth } from "../../contexts/AuthContext";
import { Colors } from "../../constants/colors";

type Message = { id: string; content: string; createdAt: string; from: { id: string; name: string; color?: string } };
type Member = { id: string; role: string; user: { id: string; name: string; color?: string } };

export default function ChatHub() {
  const { request } = useApi();
  const { user } = useAuth();
  const router = useRouter();
  const [lastGroupMsg, setLastGroupMsg] = useState<Message | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [msgs, mem] = await Promise.all([
        request<Message[]>("/api/comms/messages"),
        request<Member[]>("/api/apartment/members"),
      ]);
      setLastGroupMsg(msgs?.[0] ?? null);
      setMembers(mem ?? []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [request]);

  useEffect(() => { load(); }, []);

  const roommates = members.filter(m => m.user.id !== user?.id);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>

      <FlatList
        data={roommates}
        keyExtractor={item => item.user.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <TouchableOpacity
            style={styles.groupCard}
            onPress={() => router.push("/(app)/chat/group" as never)}
          >
            <View style={[styles.groupAvatar, { backgroundColor: Colors.primary }]}>
              <Text style={styles.groupAvatarText}>G</Text>
            </View>
            <View style={styles.groupInfo}>
              <Text style={styles.groupName}>Group Chat</Text>
              <Text style={styles.groupLast} numberOfLines={1}>
                {lastGroupMsg
                  ? `${lastGroupMsg.from.name}: ${lastGroupMsg.content}`
                  : "Start the conversation"}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No roommates yet.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.dmCard}
            onPress={() => router.push(`/(app)/chat/dm/${item.user.id}` as never)}
          >
            <View style={[styles.avatar, { backgroundColor: item.user.color ?? Colors.primary }]}>
              <Text style={styles.avatarText}>{item.user.name[0].toUpperCase()}</Text>
            </View>
            <View style={styles.dmInfo}>
              <Text style={styles.dmName}>{item.user.name}</Text>
              <Text style={styles.dmSub}>Tap to message</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: 20, fontWeight: "700", color: Colors.text },
  list: { padding: 16, gap: 10, paddingBottom: 32 },
  groupCard: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 8,
  },
  groupAvatar: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: "center", alignItems: "center",
  },
  groupAvatarText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 15, fontWeight: "700", color: Colors.text },
  groupLast: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  chevron: { fontSize: 20, color: Colors.textMuted },
  empty: { alignItems: "center", paddingTop: 32 },
  emptyText: { fontSize: 14, color: Colors.textSecondary },
  dmCard: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: "center", alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  dmInfo: { flex: 1 },
  dmName: { fontSize: 15, fontWeight: "600", color: Colors.text },
  dmSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
});
