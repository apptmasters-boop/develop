import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, TextInput, Modal, ActivityIndicator, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "../../contexts/useApi";
import { Colors } from "../../constants/colors";

type CalEvent = {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  type: "chore" | "payment" | "event" | "reminder";
  createdBy: { name: string };
};

const TYPE_COLOR: Record<string, string> = {
  chore: Colors.primary,
  payment: Colors.success,
  event: "#8b5cf6",
  reminder: Colors.warning,
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

export default function Calendar() {
  const { request } = useApi();
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", startDate: toDateStr(new Date()), type: "event" as CalEvent["type"] });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const y = viewMonth.getFullYear(), m = viewMonth.getMonth() + 1;
      const data = await request<CalEvent[]>(`/api/calendar?year=${y}&month=${m}`);
      setEvents(data ?? []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [request, viewMonth]);

  useEffect(() => { load(); }, [viewMonth]);

  async function addEvent() {
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      await request("/api/calendar", {
        method: "POST",
        body: JSON.stringify({ ...form, title: form.title.trim(), description: form.description.trim() || null }),
      });
      setForm({ title: "", description: "", startDate: toDateStr(new Date()), type: "event" });
      setShowAdd(false);
      load();
    } catch {}
    finally { setSubmitting(false); }
  }

  function prevMonth() {
    setViewMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function nextMonth() {
    setViewMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  const calDays = buildCalendar(viewMonth);
  const eventsByDate: Record<string, CalEvent[]> = {};
  events.forEach(e => {
    const key = e.startDate.slice(0, 10);
    if (!eventsByDate[key]) eventsByDate[key] = [];
    eventsByDate[key].push(e);
  });

  const today = toDateStr(new Date());
  const displayDate = selectedDate ?? today;
  const dayEvents = eventsByDate[displayDate] ?? [];

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Calendar</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Month nav */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Day labels */}
      <View style={styles.dayLabels}>
        {DAYS.map(d => <Text key={d} style={styles.dayLabel}>{d}</Text>)}
      </View>

      {/* Calendar grid */}
      <View style={styles.grid}>
        {calDays.map((day, i) => {
          if (!day) return <View key={`empty-${i}`} style={styles.dayCell} />;
          const dots = eventsByDate[day] ?? [];
          const isToday = day === today;
          const isSel = day === selectedDate;
          return (
            <TouchableOpacity key={day} style={[styles.dayCell, isToday && styles.dayCellToday, isSel && styles.dayCellSel]} onPress={() => setSelectedDate(day)}>
              <Text style={[styles.dayNum, isToday && styles.dayNumToday, isSel && styles.dayNumSel]}>{parseInt(day.slice(8))}</Text>
              {dots.length > 0 && (
                <View style={styles.dots}>
                  {dots.slice(0, 3).map((e, j) => (
                    <View key={j} style={[styles.dot, { backgroundColor: TYPE_COLOR[e.type] ?? Colors.primary }]} />
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Day events list */}
      <View style={styles.dayHeader}>
        <Text style={styles.dayHeaderText}>{formatDisplayDate(displayDate)}</Text>
      </View>
      <FlatList
        data={dayEvents}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        contentContainerStyle={styles.eventList}
        ListEmptyComponent={<Text style={styles.noEvents}>No events</Text>}
        renderItem={({ item }) => (
          <View style={[styles.eventCard, { borderLeftColor: TYPE_COLOR[item.type] ?? Colors.primary }]}>
            <View style={styles.eventInfo}>
              <Text style={styles.eventTitle}>{item.title}</Text>
              {item.description && <Text style={styles.eventDesc}>{item.description}</Text>}
              <Text style={styles.eventMeta}>{item.type} · {item.createdBy.name}</Text>
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
            <Text style={styles.modalTitle}>New Event</Text>
            <TouchableOpacity onPress={addEvent} disabled={submitting || !form.title.trim()}>
              <Text style={[styles.saveText, (!form.title.trim() || submitting) && { opacity: 0.4 }]}>
                {submitting ? "Adding…" : "Add"}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} contentContainerStyle={{ gap: 14 }}>
            <Text style={styles.label}>Title</Text>
            <TextInput style={styles.input} value={form.title} onChangeText={v => setForm(f => ({ ...f, title: v }))} placeholder="Event title" placeholderTextColor={Colors.textMuted} />

            <Text style={styles.label}>Date</Text>
            <TextInput style={styles.input} value={form.startDate} onChangeText={v => setForm(f => ({ ...f, startDate: v }))} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textMuted} />

            <Text style={styles.label}>Type</Text>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {(["event", "chore", "payment", "reminder"] as const).map(t => (
                <TouchableOpacity key={t} style={[styles.typeChip, form.type === t && { backgroundColor: TYPE_COLOR[t], borderColor: TYPE_COLOR[t] }]} onPress={() => setForm(f => ({ ...f, type: t }))}>
                  <Text style={[styles.typeText, form.type === t && { color: "#fff" }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]} value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} placeholder="Details…" placeholderTextColor={Colors.textMuted} multiline />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function buildCalendar(month: Date): (string | null)[] {
  const y = month.getFullYear(), m = month.getMonth();
  const first = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells: (string | null)[] = Array(first).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function formatDisplayDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
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
  monthNav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface },
  navBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  monthLabel: { fontSize: 16, fontWeight: "700", color: Colors.text },
  dayLabels: { flexDirection: "row", paddingHorizontal: 8, paddingBottom: 6, backgroundColor: Colors.surface },
  dayLabel: { flex: 1, textAlign: "center", fontSize: 12, color: Colors.textMuted, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 8, backgroundColor: Colors.surface, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dayCell: { width: "14.28%", aspectRatio: 1, justifyContent: "center", alignItems: "center", borderRadius: 8 },
  dayCellToday: { backgroundColor: Colors.primaryLight },
  dayCellSel: { backgroundColor: Colors.primary },
  dayNum: { fontSize: 14, color: Colors.text, fontWeight: "500" },
  dayNumToday: { color: Colors.primary, fontWeight: "700" },
  dayNumSel: { color: "#fff", fontWeight: "700" },
  dots: { flexDirection: "row", gap: 2, marginTop: 2 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  dayHeader: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dayHeaderText: { fontSize: 14, fontWeight: "600", color: Colors.textSecondary },
  eventList: { padding: 16, gap: 8, paddingBottom: 32, flexGrow: 1 },
  noEvents: { textAlign: "center", color: Colors.textMuted, marginTop: 20, fontSize: 14 },
  eventCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 4 },
  eventInfo: { gap: 2 },
  eventTitle: { fontSize: 15, fontWeight: "600", color: Colors.text },
  eventDesc: { fontSize: 13, color: Colors.textSecondary },
  eventMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2, textTransform: "capitalize" },
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
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.borderStrong },
  typeText: { fontSize: 13, color: Colors.textSecondary, fontWeight: "500", textTransform: "capitalize" },
});
