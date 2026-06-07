"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type CalEvent = {
  id: string;
  title: string;
  description?: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  createdBy: { id: string; name: string; color?: string };
};

export default function CalendarPage() {
  const { data: session } = useSession();
  const token = (session as { token?: string })?.token ?? "";
  const currentUserId = (session?.user as { id?: string })?.id ?? "";

  const [events, setEvents] = useState<CalEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    const res = await fetch(`${API_URL}/api/calendar`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setEvents(await res.json());
  }

  useEffect(() => { load(); }, [token]);

  async function addEvent() {
    if (!title.trim() || !startAt || !endAt) return;
    setSaving(true);
    await fetch(`${API_URL}/api/calendar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || undefined,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        allDay,
      }),
    });
    setTitle(""); setDescription(""); setStartAt(""); setEndAt(""); setAllDay(false);
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function deleteEvent(id: string) {
    setDeleting(id);
    await fetch(`${API_URL}/api/calendar/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setDeleting(null);
    load();
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  // Group events by month
  const grouped = events.reduce<Record<string, CalEvent[]>>((acc, e) => {
    const key = new Date(e.startAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="font-bold text-gray-900">Calendar</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowForm((v) => !v)}
              className="text-sm text-indigo-600 font-semibold hover:text-indigo-800"
            >
              {showForm ? "Cancel" : "+ Add event"}
            </button>
            <Link href="/home" className="text-sm text-gray-400 hover:underline">← Home</Link>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {showForm && (
          <div className="bg-white rounded-2xl border border-indigo-100 px-4 py-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">New event</h2>
            <input type="text" placeholder="Event title" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <input type="text" placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Start</label>
                <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">End</label>
                <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="rounded" />
              All day
            </label>
            <button onClick={addEvent} disabled={saving || !title.trim() || !startAt || !endAt}
              className="w-full bg-indigo-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {saving ? "Adding…" : "Add event"}
            </button>
          </div>
        )}

        {Object.keys(grouped).length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center">
            <p className="text-sm text-gray-400">No upcoming events. Add one!</p>
          </div>
        ) : (
          Object.entries(grouped).map(([month, monthEvents]) => (
            <section key={month} className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{month}</h2>
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                {monthEvents.map((event) => (
                  <div key={event.id} className="px-4 py-3 flex items-start gap-3">
                    <div className="w-10 text-center shrink-0">
                      <p className="text-lg font-bold text-indigo-600 leading-none">
                        {new Date(event.startAt).getDate()}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(event.startAt).toLocaleDateString("en-US", { weekday: "short" })}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{event.title}</p>
                      {event.description && <p className="text-xs text-gray-400 mt-0.5">{event.description}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {event.allDay ? "All day" : `${formatDate(event.startAt)} → ${new Date(event.endAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`}
                      </p>
                      <p className="text-xs text-gray-400">by {event.createdBy.name}</p>
                    </div>
                    {event.createdBy.id === currentUserId && (
                      <button onClick={() => deleteEvent(event.id)} disabled={deleting === event.id}
                        className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50 shrink-0">
                        {deleting === event.id ? "…" : "Remove"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex">
        {[
          { href: "/home", label: "Home", icon: "⌂" },
          { href: "/chores", label: "Chores", icon: "✓" },
          { href: "/finance", label: "Finance", icon: "$" },
          { href: "/maintenance", label: "Issues", icon: "🔧" },
          { href: "/settings", label: "Settings", icon: "⚙" },
        ].map((item) => (
          <Link key={item.label} href={item.href}
            className="flex-1 py-3 flex flex-col items-center gap-0.5 text-gray-400 hover:text-indigo-600 transition-colors">
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
