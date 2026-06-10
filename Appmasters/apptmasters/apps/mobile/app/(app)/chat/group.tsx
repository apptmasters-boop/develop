import { useEffect, useRef, useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApi } from "../../../contexts/useApi";
import { useAuth } from "../../../contexts/AuthContext";
import { Colors } from "../../../constants/colors";

type Message = {
  id: string;
  content: string;
  createdAt: string;
  from: { id: string; name: string; color?: string };
};

export default function GroupChat() {
  const { request } = useApi();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  const load = useCallback(async () => {
    try {
      const data = await request<Message[]>("/api/comms/messages");
      setMessages((data ?? []).reverse());
    } catch {}
    finally { setLoading(false); }
  }, [request]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 3000);
    return () => clearInterval(pollRef.current);
  }, []);

  async function send() {
    const content = text.trim();
    if (!content) return;
    setText("");
    setSending(true);
    try {
      await request("/api/comms/messages", { method: "POST", body: JSON.stringify({ content }) });
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
          renderItem={({ item }) => {
            const isMe = item.from.id === user?.id;
            return (
              <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                {!isMe && <Text style={styles.senderName}>{item.from.name}</Text>}
                <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.content}</Text>
                <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
                  {formatTime(item.createdAt)}
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
            placeholder="Message…"
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

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background },
  container: { flex: 1 },
  list: { padding: 16, gap: 8, paddingBottom: 8 },
  bubble: {
    maxWidth: "80%", borderRadius: 16, padding: 10,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    alignSelf: "flex-start",
  },
  bubbleMe: {
    alignSelf: "flex-end", backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  senderName: { fontSize: 11, fontWeight: "600", color: Colors.primary, marginBottom: 3 },
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
