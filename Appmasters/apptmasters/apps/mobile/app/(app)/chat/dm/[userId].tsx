import { useEffect, useRef, useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useApi } from "../../../../contexts/useApi";
import { useAuth } from "../../../../contexts/AuthContext";
import { Colors } from "../../../../constants/colors";

type Message = {
  id: string;
  content: string;
  createdAt: string;
  from: { id: string; name: string };
};
type Member = { id: string; role: string; user: { id: string; name: string } };

export default function DmChat() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { request } = useApi();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<{ name: string } | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  const load = useCallback(async () => {
    try {
      const data = await request<Message[]>(`/api/comms/dm/${userId}`);
      setMessages((data ?? []).reverse());
    } catch {}
    finally { setLoading(false); }
  }, [request, userId]);

  useEffect(() => {
    request<Member[]>("/api/apartment/members").then(members => {
      const m = members?.find(m => m.user.id === userId);
      if (m) setOtherUser({ name: m.user.name });
    }).catch(() => {});
    load();
    pollRef.current = setInterval(load, 3000);
    return () => clearInterval(pollRef.current);
  }, [userId]);

  async function send() {
    const content = text.trim();
    if (!content) return;
    setText("");
    setSending(true);
    try {
      await request(`/api/comms/dm/${userId}`, { method: "POST", body: JSON.stringify({ content }) });
      load();
    } catch {}
    finally { setSending(false); }
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Say hello to {otherUser?.name}!</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMe = item.from.id === user?.id;
            return (
              <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.content}</Text>
                <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
                  {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            );
          }}
        />
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={`Message ${otherUser?.name ?? ""}…`}
            placeholderTextColor={Colors.textMuted}
            onSubmitEditing={send}
            returnKeyType="send"
            multiline
          />
          <TouchableOpacity style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]} onPress={send} disabled={!text.trim() || sending}>
            <Text style={styles.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background },
  container: { flex: 1 },
  list: { padding: 16, gap: 8, paddingBottom: 8, flexGrow: 1 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 15, color: Colors.textSecondary },
  bubble: {
    maxWidth: "80%", borderRadius: 16, padding: 10,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    alignSelf: "flex-start",
  },
  bubbleMe: { alignSelf: "flex-end", backgroundColor: Colors.primary, borderColor: Colors.primary },
  bubbleText: { fontSize: 15, color: Colors.text, lineHeight: 20 },
  bubbleTextMe: { color: "#fff" },
  bubbleTime: { fontSize: 10, color: Colors.textMuted, marginTop: 4, alignSelf: "flex-end" },
  bubbleTimeMe: { color: "rgba(255,255,255,0.7)" },
  inputRow: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    padding: 12, backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  input: {
    flex: 1, backgroundColor: Colors.background, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15,
    color: Colors.text, maxHeight: 100,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primary,
    justifyContent: "center", alignItems: "center",
  },
  sendBtnDisabled: { backgroundColor: Colors.border },
  sendBtnText: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
