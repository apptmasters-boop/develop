import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApi } from "../../contexts/useApi";
import { useAuth } from "../../contexts/AuthContext";
import { Colors } from "../../constants/colors";

type Balance = { userId: string; name: string; net: number };
type Expense = {
  id: string; description: string; amount: number; category: string;
  createdAt: string; payer: { name: string };
};
type Member = { id: string; role: string; user: { id: string; name: string } };

const CATEGORIES = ["food", "utilities", "cleaning", "rent", "entertainment", "other"];

export default function Finance() {
  const { request } = useApi();
  const { user } = useAuth();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  // Add form
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [bal, exp, mem] = await Promise.all([
        request<Balance[]>("/api/finances/balance"),
        request<Expense[]>("/api/finances/expenses"),
        request<Member[]>("/api/apartment/members"),
      ]);
      setBalances(bal ?? []);
      setExpenses(exp ?? []);
      setMembers(mem ?? []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [request]);

  useEffect(() => { load(); }, []);

  async function addExpense() {
    if (!desc.trim() || !amount) return;
    const cents = Math.round(parseFloat(amount) * 100);
    if (isNaN(cents) || cents <= 0) { Alert.alert("Invalid amount"); return; }
    setSaving(true);
    try {
      await request("/api/finances/expenses", {
        method: "POST",
        body: JSON.stringify({
          description: desc.trim(), amount: cents, category,
          splitMethod: "equal",
          participantIds: members.map(m => m.user.id),
        }),
      });
      setDesc(""); setAmount(""); setCategory("other");
      setShowAdd(false);
      load();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to add expense");
    } finally { setSaving(false); }
  }

  const myBalance = balances.find(b => b.userId === user?.id);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Finance</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            {/* My balance */}
            {myBalance !== undefined && (
              <View style={[styles.balanceCard, { borderLeftColor: myBalance.net >= 0 ? Colors.success : Colors.error }]}>
                <View>
                  <Text style={styles.balanceLabel}>{myBalance.net >= 0 ? "You are owed" : "You owe"}</Text>
                  <Text style={[styles.balanceAmount, { color: myBalance.net >= 0 ? Colors.success : Colors.error }]}>
                    ${Math.abs(myBalance.net / 100).toFixed(2)}
                  </Text>
                </View>
              </View>
            )}
            {/* All balances */}
            <View style={styles.balanceList}>
              {balances.filter(b => b.userId !== user?.id).map(b => (
                <View key={b.userId} style={styles.balanceRow}>
                  <View style={styles.avatarSmall}>
                    <Text style={styles.avatarSmallText}>{b.name[0].toUpperCase()}</Text>
                  </View>
                  <Text style={styles.balanceName}>{b.name}</Text>
                  <Text style={[styles.balanceNet, { color: b.net >= 0 ? Colors.success : Colors.error }]}>
                    {b.net >= 0 ? "+" : ""}${(b.net / 100).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={styles.sectionTitle}>Recent Expenses</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No expenses yet. Add one!</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.expCard}>
            <View style={[styles.categoryDot, { backgroundColor: Colors.primary }]} />
            <View style={styles.expMain}>
              <Text style={styles.expDesc}>{item.description}</Text>
              <Text style={styles.expMeta}>{item.payer.name} · {item.category}</Text>
            </View>
            <Text style={styles.expAmount}>${(item.amount / 100).toFixed(2)}</Text>
          </View>
        )}
      />

      {/* Add expense modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={styles.modal} edges={["top", "bottom"]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAdd(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Expense</Text>
            <TouchableOpacity onPress={addExpense} disabled={saving}>
              <Text style={[styles.saveText, saving && { opacity: 0.5 }]}>
                {saving ? "Saving…" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={styles.input}
              value={desc}
              onChangeText={setDesc}
              placeholder="Groceries, utilities…"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.fieldLabel}>Amount ($)</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.chips}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, category === cat && styles.chipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                    {cat}
                  </Text>
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
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: 20, fontWeight: "700", color: Colors.text },
  addBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  list: { padding: 16, gap: 10, paddingBottom: 32 },
  balanceCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    borderLeftWidth: 4, borderWidth: 1, borderColor: Colors.border, marginBottom: 12,
  },
  balanceLabel: { fontSize: 13, color: Colors.textSecondary },
  balanceAmount: { fontSize: 28, fontWeight: "700", marginTop: 2 },
  balanceList: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 8,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 20, gap: 2,
  },
  balanceRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, paddingHorizontal: 8 },
  avatarSmall: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary,
    justifyContent: "center", alignItems: "center",
  },
  avatarSmallText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  balanceName: { flex: 1, fontSize: 14, color: Colors.text },
  balanceNet: { fontSize: 14, fontWeight: "600" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: Colors.text, marginBottom: 8 },
  empty: { alignItems: "center", paddingTop: 32 },
  emptyText: { fontSize: 14, color: Colors.textSecondary },
  expCard: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  categoryDot: { width: 10, height: 10, borderRadius: 5 },
  expMain: { flex: 1 },
  expDesc: { fontSize: 14, fontWeight: "600", color: Colors.text },
  expMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  expAmount: { fontSize: 15, fontWeight: "700", color: Colors.text },
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
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: Colors.text,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderStrong,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: "500" },
  chipTextActive: { color: "#fff", fontWeight: "600" },
});
