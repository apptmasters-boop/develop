import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, TextInput, Modal, ActivityIndicator, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "../../contexts/useApi";
import { Colors } from "../../constants/colors";

type InventoryItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minQuantity: number | null;
  unit: string | null;
  lastUpdated: string;
};

const CATEGORIES = ["All", "Cleaning", "Kitchen", "Bathroom", "Food", "Other"];

export default function Inventory() {
  const { request } = useApi();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", category: "Cleaning", quantity: "1", unit: "", minQuantity: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await request<InventoryItem[]>("/api/inventory");
      setItems(data ?? []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [request]);

  useEffect(() => { load(); }, []);

  async function addItem() {
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      await request("/api/inventory", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category,
          quantity: parseInt(form.quantity) || 1,
          unit: form.unit.trim() || null,
          minQuantity: form.minQuantity ? parseInt(form.minQuantity) : null,
        }),
      });
      setForm({ name: "", category: "Cleaning", quantity: "1", unit: "", minQuantity: "" });
      setShowAdd(false);
      load();
    } catch {}
    finally { setSubmitting(false); }
  }

  async function updateQty(id: string, delta: number) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const newQty = Math.max(0, item.quantity + delta);
    try {
      await request(`/api/inventory/${id}`, { method: "PATCH", body: JSON.stringify({ quantity: newQty }) });
      setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: newQty } : i));
    } catch {}
  }

  async function deleteItem(id: string) {
    try {
      await request(`/api/inventory/${id}`, { method: "DELETE" });
      load();
    } catch {}
  }

  const filtered = category === "All" ? items : items.filter(i => i.category === category);
  const lowStock = filtered.filter(i => i.minQuantity != null && i.quantity <= i.minQuantity);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Supplies</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {lowStock.length > 0 && (
        <View style={styles.alertBanner}>
          <Ionicons name="alert-circle" size={16} color={Colors.warning} />
          <Text style={styles.alertText}>{lowStock.length} item{lowStock.length > 1 ? "s" : ""} running low</Text>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catRow}>
        {CATEGORIES.map(c => (
          <TouchableOpacity key={c} style={[styles.catChip, category === c && styles.catChipActive]} onPress={() => setCategory(c)}>
            <Text style={[styles.catText, category === c && styles.catTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>No supplies tracked yet.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isLow = item.minQuantity != null && item.quantity <= item.minQuantity;
          return (
            <View style={[styles.item, isLow && styles.itemLow]}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemCategory}>{item.category}{item.unit ? ` · ${item.unit}` : ""}</Text>
                {isLow && <Text style={styles.itemLowText}>Low stock</Text>}
              </View>
              <View style={styles.itemRight}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.id, -1)}>
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={[styles.qty, isLow && styles.qtyLow]}>{item.quantity}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.id, 1)}>
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteItem(item.id)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
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
            <Text style={styles.modalTitle}>Add Supply</Text>
            <TouchableOpacity onPress={addItem} disabled={submitting || !form.name.trim()}>
              <Text style={[styles.saveText, (!form.name.trim() || submitting) && { opacity: 0.4 }]}>
                {submitting ? "Adding…" : "Add"}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} contentContainerStyle={{ gap: 14 }}>
            <Text style={styles.label}>Name</Text>
            <TextInput style={styles.input} value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Dish soap" placeholderTextColor={Colors.textMuted} />

            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {CATEGORIES.filter(c => c !== "All").map(c => (
                  <TouchableOpacity key={c} style={[styles.catChip, form.category === c && styles.catChipActive]} onPress={() => setForm(f => ({ ...f, category: c }))}>
                    <Text style={[styles.catText, form.category === c && styles.catTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Quantity</Text>
                <TextInput style={styles.input} value={form.quantity} onChangeText={v => setForm(f => ({ ...f, quantity: v }))} keyboardType="number-pad" placeholder="1" placeholderTextColor={Colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Unit</Text>
                <TextInput style={styles.input} value={form.unit} onChangeText={v => setForm(f => ({ ...f, unit: v }))} placeholder="bottles" placeholderTextColor={Colors.textMuted} />
              </View>
            </View>

            <Text style={styles.label}>Low stock alert below</Text>
            <TextInput style={styles.input} value={form.minQuantity} onChangeText={v => setForm(f => ({ ...f, minQuantity: v }))} keyboardType="number-pad" placeholder="e.g. 2 (optional)" placeholderTextColor={Colors.textMuted} />
          </ScrollView>
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
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: 20, fontWeight: "700", color: Colors.text },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center" },
  alertBanner: { flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: Colors.warningLight, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  alertText: { fontSize: 13, color: Colors.warning, fontWeight: "600" },
  catScroll: { backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  catRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  catChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.borderStrong },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catText: { fontSize: 13, color: Colors.textSecondary, fontWeight: "500" },
  catTextActive: { color: "#fff" },
  list: { padding: 16, gap: 8, paddingBottom: 32 },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 14, color: Colors.textSecondary },
  item: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderWidth: 1, borderColor: Colors.border,
  },
  itemLow: { borderColor: Colors.warning },
  itemLeft: { flex: 1 },
  itemName: { fontSize: 15, color: Colors.text, fontWeight: "500" },
  itemCategory: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  itemLowText: { fontSize: 11, color: Colors.warning, fontWeight: "600", marginTop: 2 },
  itemRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.borderStrong, justifyContent: "center", alignItems: "center" },
  qtyBtnText: { fontSize: 18, color: Colors.text, lineHeight: 22 },
  qty: { fontSize: 16, fontWeight: "700", color: Colors.text, minWidth: 28, textAlign: "center" },
  qtyLow: { color: Colors.warning },
  deleteBtn: { padding: 4 },
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
  label: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  input: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.borderStrong },
});
