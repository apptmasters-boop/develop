import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, TextInput, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "../../contexts/useApi";
import { Colors } from "../../constants/colors";

type GroceryItem = {
  id: string;
  name: string;
  quantity: number | null;
  checked: boolean;
  checkedBy?: { name: string } | null;
};

export default function GroceryList() {
  const { request } = useApi();
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [newQty, setNewQty] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await request<GroceryItem[]>("/api/grocery");
      setItems(data ?? []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [request]);

  useEffect(() => { load(); }, []);

  async function addItem() {
    if (!newItem.trim()) return;
    setAdding(true);
    try {
      await request("/api/grocery", {
        method: "POST",
        body: JSON.stringify({ name: newItem.trim(), quantity: newQty ? parseInt(newQty) : null }),
      });
      setNewItem(""); setNewQty("");
      load();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to add item");
    } finally { setAdding(false); }
  }

  async function toggleItem(id: string) {
    try {
      await request(`/api/grocery/${id}/check`, { method: "PATCH" });
      load();
    } catch {}
  }

  async function deleteItem(id: string) {
    try {
      await request(`/api/grocery/${id}`, { method: "DELETE" });
      load();
    } catch {}
  }

  async function clearChecked() {
    try {
      await request("/api/grocery/clear-checked", { method: "DELETE" });
      load();
    } catch {}
  }

  const unchecked = items.filter(i => !i.checked);
  const checked = items.filter(i => i.checked);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Grocery List</Text>
        {checked.length > 0 && (
          <TouchableOpacity onPress={clearChecked}>
            <Text style={styles.clearText}>Clear done</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Add item row */}
      <View style={styles.addRow}>
        <TextInput
          style={[styles.addInput, { flex: 1 }]}
          value={newItem}
          onChangeText={setNewItem}
          placeholder="Add item…"
          placeholderTextColor={Colors.textMuted}
          returnKeyType="next"
        />
        <TextInput
          style={[styles.addInput, { width: 64 }]}
          value={newQty}
          onChangeText={setNewQty}
          placeholder="Qty"
          placeholderTextColor={Colors.textMuted}
          keyboardType="number-pad"
          returnKeyType="done"
          onSubmitEditing={addItem}
        />
        <TouchableOpacity
          style={[styles.addBtn, (!newItem.trim() || adding) && styles.addBtnDisabled]}
          onPress={addItem}
          disabled={!newItem.trim() || adding}
        >
          {adding ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="add" size={20} color="#fff" />}
        </TouchableOpacity>
      </View>

      <FlatList
        data={[...unchecked, ...checked]}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🛒</Text>
            <Text style={styles.emptyText}>List is empty. Add your first item!</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.item, item.checked && styles.itemChecked]} onPress={() => toggleItem(item.id)}>
            <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
              {item.checked && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>{item.name}</Text>
              {item.quantity != null && (
                <Text style={styles.itemQty}>× {item.quantity}</Text>
              )}
            </View>
            {item.checked && item.checkedBy && (
              <Text style={styles.checkedBy}>{item.checkedBy.name}</Text>
            )}
            <TouchableOpacity onPress={() => deleteItem(item.id)} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
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
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: 20, fontWeight: "700", color: Colors.text },
  clearText: { fontSize: 14, color: Colors.error, fontWeight: "500" },
  addRow: {
    flexDirection: "row", gap: 8, padding: 12,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  addInput: {
    backgroundColor: Colors.background, borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 10, fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.borderStrong,
  },
  addBtn: {
    width: 44, height: 44, borderRadius: 10, backgroundColor: Colors.primary,
    justifyContent: "center", alignItems: "center",
  },
  addBtnDisabled: { backgroundColor: Colors.border },
  list: { padding: 16, gap: 8, paddingBottom: 32 },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 14, color: Colors.textSecondary },
  item: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  itemChecked: { opacity: 0.55 },
  checkbox: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    borderColor: Colors.borderStrong, justifyContent: "center", alignItems: "center",
  },
  checkboxChecked: { backgroundColor: Colors.success, borderColor: Colors.success },
  itemInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  itemName: { fontSize: 15, color: Colors.text, fontWeight: "500" },
  itemNameChecked: { textDecorationLine: "line-through", color: Colors.textSecondary },
  itemQty: { fontSize: 13, color: Colors.textMuted },
  checkedBy: { fontSize: 11, color: Colors.textMuted },
  deleteBtn: { padding: 4 },
});
