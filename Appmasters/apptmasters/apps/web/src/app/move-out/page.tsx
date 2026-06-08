"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type ChecklistItem = {
  id: string;
  label: string;
  status: "pending" | "ok" | "needs_repair" | "missing";
  notes: string | null;
  photoUrl: string | null;
  sortOrder: number;
  room: { id: string; name: string } | null;
};

type Checklist = {
  id: string;
  scheduledDate: string | null;
  notes: string | null;
  submitted: boolean;
  items: ChecklistItem[];
};

const ITEM_STATUS_STYLE: Record<string, string> = {
  pending: "bg-gray-100 text-gray-500",
  ok: "bg-green-100 text-green-700",
  needs_repair: "bg-amber-100 text-amber-700",
  missing: "bg-red-100 text-red-700",
};

const ITEM_STATUS_ICON: Record<string, string> = {
  pending: "○",
  ok: "✓",
  needs_repair: "⚠",
  missing: "✗",
};

export default function MoveOutPage() {
  const { data: session } = useSession();
  const token = (session as { token?: string })?.token ?? "";

  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [scheduledDate, setScheduledDate] = useState("");
  const [notes, setNotes] = useState("");
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    if (!token) return;
    const res = await fetch(`${API_URL}/api/move-out`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data: Checklist = await res.json();
      setChecklist(data);
      setScheduledDate(data.scheduledDate ? new Date(data.scheduledDate).toISOString().split("T")[0] : "");
      setNotes(data.notes ?? "");
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [token]);

  async function updateItem(itemId: string, status: ChecklistItem["status"]) {
    setUpdatingItem(itemId);
    await fetch(`${API_URL}/api/move-out/item/${itemId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setUpdatingItem(null);
    load();
  }

  async function saveMeta() {
    await fetch(`${API_URL}/api/move-out`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduledDate: scheduledDate || undefined,
        notes: notes || undefined,
      }),
    });
    load();
  }

  async function submit() {
    setSubmitting(true);
    await fetch(`${API_URL}/api/move-out`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ submitted: true }),
    });
    setSubmitting(false);
    load();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading checklist…</p>
      </div>
    );
  }

  if (!checklist) return null;

  const total = checklist.items.length;
  const done = checklist.items.filter((i) => i.status !== "pending").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const byRoom = checklist.items.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
    const key = item.room?.name ?? "General";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="font-bold text-gray-900">Move-out Checklist</h1>
          <Link href="/home" className="text-sm text-indigo-600 hover:underline">← Home</Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Progress */}
        <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Progress</p>
            <p className="text-sm font-bold text-indigo-600">{pct}%</p>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-gray-400">{done} of {total} items checked</p>
        </div>

        {/* Meta */}
        {!checklist.submitted && (
          <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">Details</h2>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Move-out date</label>
              <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special notes for landlord…" rows={2}
                className="w-full text-sm resize-none border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <button onClick={saveMeta}
              className="text-sm text-indigo-600 font-medium hover:underline">Save details</button>
          </div>
        )}

        {checklist.submitted && (
          <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-3">
            <p className="text-sm font-semibold text-green-700">Checklist submitted</p>
            <p className="text-xs text-green-600 mt-0.5">Your move-out checklist has been submitted to the admin.</p>
          </div>
        )}

        {/* Items by room */}
        {Object.entries(byRoom).map(([roomName, roomItems]) => (
          <section key={roomName} className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{roomName}</h2>
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
              {roomItems.sort((a, b) => a.sortOrder - b.sortOrder).map((item) => (
                <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ITEM_STATUS_STYLE[item.status]}`}>
                    {ITEM_STATUS_ICON[item.status]}
                  </span>
                  <p className="text-sm text-gray-800 flex-1">{item.label}</p>
                  {!checklist.submitted && (
                    <select
                      value={item.status}
                      disabled={updatingItem === item.id}
                      onChange={(e) => updateItem(item.id, e.target.value as ChecklistItem["status"])}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      <option value="pending">Pending</option>
                      <option value="ok">OK</option>
                      <option value="needs_repair">Needs repair</option>
                      <option value="missing">Missing</option>
                    </select>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Submit */}
        {!checklist.submitted && done === total && total > 0 && (
          <button onClick={submit} disabled={submitting}
            className="w-full bg-green-500 text-white rounded-2xl py-3 text-sm font-semibold hover:bg-green-600 disabled:opacity-50 transition-colors">
            {submitting ? "Submitting…" : "Submit checklist to admin"}
          </button>
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
