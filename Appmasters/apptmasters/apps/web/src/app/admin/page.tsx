"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type AuditEntry = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; name: string; color?: string };
};

type ChoreTemplate = {
  id: string;
  name: string;
  points: number;
  assignmentMode: string;
  frequencyDays: number;
  active: boolean;
  room: { id: string; name: string };
};

type Room = { id: string; name: string };

export default function AdminPage() {
  const { data: session } = useSession();
  const token = (session as { token?: string })?.token ?? "";
  const router = useRouter();

  const [tab, setTab] = useState<"automations" | "audit" | "templates">("automations");
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [templates, setTemplates] = useState<ChoreTemplate[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<Record<string, number> | null>(null);

  // Template form
  const [tmplRoomId, setTmplRoomId] = useState("");
  const [tmplName, setTmplName] = useState("");
  const [tmplPoints, setTmplPoints] = useState(1);
  const [tmplFreq, setTmplFreq] = useState(7);
  const [tmplMode, setTmplMode] = useState("rotating");
  const [savingTemplate, setSavingTemplate] = useState(false);

  async function load() {
    if (!token) return;
    const [meRes, auditRes, tmplRes, roomsRes] = await Promise.all([
      fetch(`${API_URL}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/api/audit`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/api/automations/templates`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/api/rooms`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    if (meRes.ok) {
      const me = await meRes.json();
      const admin = me.membership?.role === "admin";
      setIsAdmin(admin);
      if (!admin) { router.replace("/home"); return; }
    }
    if (auditRes.ok) setAuditLog(await auditRes.json());
    if (tmplRes.ok) setTemplates(await tmplRes.json());
    if (roomsRes.ok) setRooms(await roomsRes.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, [token]);

  async function runAutomations() {
    setRunning(true);
    setRunResult(null);
    const res = await fetch(`${API_URL}/api/automations/run`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setRunResult(await res.json());
    setRunning(false);
  }

  async function runWeeklySummary() {
    await fetch(`${API_URL}/api/automations/weekly-summary`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    alert("Weekly summary sent to all members.");
  }

  async function addTemplate() {
    if (!tmplName.trim() || !tmplRoomId) return;
    setSavingTemplate(true);
    await fetch(`${API_URL}/api/automations/templates`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: tmplName.trim(),
        roomId: tmplRoomId,
        points: tmplPoints,
        frequencyDays: tmplFreq,
        assignmentMode: tmplMode,
      }),
    });
    setTmplName(""); setTmplRoomId(""); setTmplPoints(1); setTmplFreq(7); setTmplMode("rotating");
    setSavingTemplate(false);
    load();
  }

  async function deleteTemplate(id: string) {
    await fetch(`${API_URL}/api/automations/templates/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    load();
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900">Admin Panel</h1>
            <p className="text-xs text-gray-400">Admin-only controls</p>
          </div>
          <Link href="/home" className="text-sm text-indigo-600 hover:underline">← Home</Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto flex">
          {(["automations", "audit", "templates"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium capitalize transition-colors border-b-2 ${
                tab === t ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-400 hover:text-gray-600"
              }`}>
              {t === "automations" ? "Automations" : t === "audit" ? "Audit Log" : "Chore Templates"}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* ── Automations tab ── */}
        {tab === "automations" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4 space-y-3">
              <h2 className="text-sm font-semibold text-gray-700">Run automations now</h2>
              <p className="text-xs text-gray-400">
                Marks overdue chores, sends reminders for chores due in 24h, generates upcoming recurring chores, sends rent reminders, flags stale maintenance issues.
              </p>
              <button onClick={runAutomations} disabled={running}
                className="w-full bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {running ? "Running…" : "Run all automations"}
              </button>
              {runResult && (
                <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-3 text-xs space-y-1">
                  <p className="font-semibold text-green-700">Completed</p>
                  <p className="text-green-600">{runResult.overdueMarked} chore{runResult.overdueMarked !== 1 ? "s" : ""} marked overdue</p>
                  <p className="text-green-600">{runResult.remindersCreated} reminder{runResult.remindersCreated !== 1 ? "s" : ""} sent</p>
                  <p className="text-green-600">{runResult.choresGenerated} recurring chore{runResult.choresGenerated !== 1 ? "s" : ""} generated</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4 space-y-3">
              <h2 className="text-sm font-semibold text-gray-700">Weekly summary</h2>
              <p className="text-xs text-gray-400">Send each member a summary of their chores done this week and pending tasks.</p>
              <button onClick={runWeeklySummary}
                className="w-full border border-indigo-300 text-indigo-600 rounded-xl py-2.5 text-sm font-semibold hover:bg-indigo-50 transition-colors">
                Send weekly summary
              </button>
            </div>
          </div>
        )}

        {/* ── Audit log tab ── */}
        {tab === "audit" && (
          <div className="space-y-2">
            {auditLog.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center">
                <p className="text-sm text-gray-400">No audit events yet.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                {auditLog.map((entry) => (
                  <div key={entry.id} className="px-4 py-3 flex items-start gap-3">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                      style={{ backgroundColor: entry.user.color ?? "#6366f1" }}
                    >
                      {entry.user.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800">
                        <span className="font-medium">{entry.user.name}</span>
                        {" "}<span className="text-indigo-600 font-mono text-xs">{entry.action}</span>
                        {" "}on <span className="text-gray-600">{entry.entity}</span>
                      </p>
                      {entry.metadata && (
                        <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">
                          {JSON.stringify(entry.metadata)}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">{formatTime(entry.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Templates tab ── */}
        {tab === "templates" && (
          <div className="space-y-4">
            {/* Add template form */}
            <div className="bg-white rounded-2xl border border-indigo-100 px-4 py-4 space-y-3">
              <h2 className="text-sm font-semibold text-gray-700">Add recurring chore template</h2>
              <input type="text" placeholder="Chore name" value={tmplName} onChange={(e) => setTmplName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Room</label>
                <select value={tmplRoomId} onChange={(e) => setTmplRoomId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select room…</option>
                  {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Points</label>
                  <input type="number" min={1} max={10} value={tmplPoints} onChange={(e) => setTmplPoints(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Every N days</label>
                  <input type="number" min={1} value={tmplFreq} onChange={(e) => setTmplFreq(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Assignment</label>
                  <select value={tmplMode} onChange={(e) => setTmplMode(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="rotating">Rotating</option>
                    <option value="fixed">Fixed</option>
                    <option value="voluntary">Voluntary</option>
                  </select>
                </div>
              </div>
              <button onClick={addTemplate} disabled={savingTemplate || !tmplName.trim() || !tmplRoomId}
                className="w-full bg-indigo-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {savingTemplate ? "Saving…" : "Add template"}
              </button>
            </div>

            {/* Template list */}
            {templates.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-center">
                <p className="text-sm text-gray-400">No templates yet. Add one above!</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                {templates.map((t) => (
                  <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-400">
                        {t.room.name} · every {t.frequencyDays}d · {t.assignmentMode} · {t.points}pt
                      </p>
                    </div>
                    <button onClick={() => deleteTemplate(t.id)}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
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
