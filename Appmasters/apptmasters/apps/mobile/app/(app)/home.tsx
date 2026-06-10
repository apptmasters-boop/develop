import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { useApi } from "../../contexts/useApi";
import { Colors } from "../../constants/colors";

type Apartment = { id: string; name: string; inviteCode: string };
type Member = { id: string; role: string; user: { id: string; name: string; color?: string } };
type Chore = { id: string; name: string; status: string; points: number; dueAt: string; room?: { name: string } | null };
type Balance = { userId: string; name: string; net: number };

const CHORE_DOT: Record<string, string> = {
  pending: Colors.warning,
  overdue: Colors.error,
  completed: Colors.success,
};

export default function Home() {
  const { user } = useAuth();
  const { request } = useApi();
  const router = useRouter();
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [chores, setChores] = useState<Chore[]>([]);
  const [balance, setBalance] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [apt, mem, ch, bal] = await Promise.all([
        request<Apartment>("/api/apartment"),
        request<Member[]>("/api/apartment/members"),
        request<Chore[]>("/api/chores?today=true"),
        request<Balance[]>("/api/finances/balance"),
      ]);
      setApartment(apt);
      setMembers(mem);
      setChores(ch ?? []);
      setBalance(bal ?? []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [request]);

  useEffect(() => { load(); }, []);

  const myBalance = balance.find(b => b.userId === user?.id);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good {getTimeOfDay()},</Text>
            <Text style={styles.name}>{user?.name?.split(" ")[0] ?? "there"} 👋</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name ?? "?")[0].toUpperCase()}</Text>
          </View>
        </View>

        {/* Apartment card */}
        {apartment && (
          <View style={styles.aptCard}>
            <Text style={styles.aptName}>{apartment.name}</Text>
            <Text style={styles.aptMeta}>{members.length} member{members.length !== 1 ? "s" : ""}</Text>
          </View>
        )}

        {/* Balance summary */}
        {myBalance !== undefined && (
          <View style={[styles.balanceCard, { borderLeftColor: myBalance.net >= 0 ? Colors.success : Colors.error }]}>
            <Text style={styles.balanceLabel}>{myBalance.net >= 0 ? "You are owed" : "You owe"}</Text>
            <Text style={[styles.balanceAmount, { color: myBalance.net >= 0 ? Colors.success : Colors.error }]}>
              ${Math.abs(myBalance.net / 100).toFixed(2)}
            </Text>
          </View>
        )}

        {/* Today's chores */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Chores</Text>
            <TouchableOpacity onPress={() => router.push("/(app)/chores")}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          {chores.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>All caught up! No chores due today.</Text>
            </View>
          ) : (
            chores.slice(0, 4).map(chore => (
              <View key={chore.id} style={styles.choreRow}>
                <View style={[styles.choreDot, { backgroundColor: CHORE_DOT[chore.status] ?? Colors.textMuted }]} />
                <View style={styles.choreInfo}>
                  <Text style={styles.choreName}>{chore.name}</Text>
                  {chore.room && <Text style={styles.choreRoom}>{chore.room.name}</Text>}
                </View>
                <Text style={styles.chorePoints}>{chore.points}pt</Text>
              </View>
            ))
          )}
        </View>

        {/* Quick links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Links</Text>
          <View style={styles.quickGrid}>
            {[
              { icon: "chatbubbles", label: "Chat", route: "/(app)/chat" },
              { icon: "list", label: "Grocery", route: "/(app)/grocery" },
              { icon: "construct", label: "Maintenance", route: "/(app)/maintenance" },
              { icon: "shield-checkmark", label: "Disputes", route: "/(app)/disputes" },
              { icon: "cube-outline", label: "Supplies", route: "/(app)/inventory" },
              { icon: "calendar-outline", label: "Calendar", route: "/(app)/calendar" },
              { icon: "newspaper-outline", label: "Activity", route: "/(app)/feed" },
              { icon: "document-text-outline", label: "Rules", route: "/(app)/rules" },
              { icon: "exit-outline", label: "Move Out", route: "/(app)/move-out" },
            ].map(item => (
              <TouchableOpacity
                key={item.label}
                style={styles.quickCard}
                onPress={() => router.push(item.route as never)}
              >
                <Ionicons name={item.icon as never} size={22} color={Colors.primary} />
                <Text style={styles.quickLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  greeting: { fontSize: 14, color: Colors.textSecondary },
  name: { fontSize: 22, fontWeight: "700", color: Colors.text },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary,
    justifyContent: "center", alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  aptCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: Colors.border,
  },
  aptName: { fontSize: 17, fontWeight: "700", color: Colors.text },
  aptMeta: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  balanceCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    marginBottom: 20, borderLeftWidth: 4, borderWidth: 1, borderColor: Colors.border,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  balanceLabel: { fontSize: 14, color: Colors.textSecondary },
  balanceAmount: { fontSize: 20, fontWeight: "700" },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: Colors.text },
  seeAll: { fontSize: 13, color: Colors.primary, fontWeight: "500" },
  emptyCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: Colors.border, alignItems: "center",
  },
  emptyText: { fontSize: 14, color: Colors.textSecondary },
  choreRow: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 12,
    flexDirection: "row", alignItems: "center", gap: 10,
    marginBottom: 8, borderWidth: 1, borderColor: Colors.border,
  },
  choreDot: { width: 10, height: 10, borderRadius: 5 },
  choreInfo: { flex: 1 },
  choreName: { fontSize: 14, fontWeight: "600", color: Colors.text },
  choreRoom: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  chorePoints: { fontSize: 13, fontWeight: "600", color: Colors.primary },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  quickCard: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 16,
    alignItems: "center", gap: 8, width: "46%",
    borderWidth: 1, borderColor: Colors.border,
  },
  quickLabel: { fontSize: 13, fontWeight: "600", color: Colors.text },
});
