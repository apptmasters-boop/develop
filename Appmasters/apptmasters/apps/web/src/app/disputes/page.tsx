"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Dispute = {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_review" | "resolved" | "dismissed";
  resolution: string | null;
  evidenceUrls: string[];
  createdAt: string;
  resolvedAt: string | null;
  raisedBy: { id: string; name: string; color?: string };
  against: { id: string; name: string } | null;
  resolvedBy: { id: string; name: string } | null;
};

type Member = { id: string; role: string; user: { id: string; name: string } };

const STATUS_STYLE: Record<string, string> = {
  open: "bg-amber-100 text-amber-700",
  in_review: "bg-blue-100 text-blue-700",
  resolved: "bg-green-100 text-green-700",
  dismissed: "bg-gray-100 text-gray-500",
};

export default function DisputesPage() {
  const { data: session } = useSession();
  const token = (session as { token?: string })?.token ?? "";
  const myId = (session?.user as { id?: string })?.id ?? "";

  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [againstUserId, setAgainstUserId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");

  async function load() {
    if (!token) return;
    const [dRes, mRes, meRes] = await Promise.all([
      fetch(`${API_URL}/api/disputes`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/api/apartment/members`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (dRes.ok) setDisputes(await dRes.json());
    if (mRes.ok) setMembers(await mRes.json());
    if (meRes.ok) {
      const me = await meRes.json();
      setIsAdmin(me.membership?.role === "admin");
    }
  }

  useEffect(() => { load(); }, [token]);

  async function submit() {
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    await fetch(`${API_URL}/api/disputes`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim(),
        againstUserId: againstUserId || undefined,
      }),
    });
    setTitle(""); setDescription(""); setAgainstUserId("");
    setShowForm(false);
    setSubmitting(false);
    load();
  }

  async function resolve(id: string, status: "resolved" | "dismissed") {
    setResolving(id);
    await fetch(`${API_URL}/api/disputes/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status, resolution: resolution || undefined }),
    });
    setResolving(null);
    setResolution("");
    load();
  }

  const open = disputes.filter((d) => d.status === "open" || d.status === "in_review");
  const closed = disputes.filter((d) => d.status === "resolved" || d.status === "dismissed");

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="font-bold text-gray-900">Disputes</h1>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowForm((v) => !v)}
              className="text-sm text-indigo-600 font-semibold hover:text-indigo-800">
              {showForm ? "Cancel" : "+ Raise"}
            </button>
            <Link href="/home" className="text-sm text-gray-400 hover:underline">← Home</Link>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {showForm && (
          <div className="bg-white rounded-2xl border border-indigo-100 px-4 py-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">Raise a dispute</h2>
            <input type="text" placeholder="Title (e.g. Noise after 11pm)" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail…"
              rows={3}
              className="w-full text-sm resize-none border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Against (optional)</label>
              <select value={againstUserId} onChange={(e) => setAgainstUserId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">General complaint (no specific person)</option>
                {members.filter((m) => m.user.id !== myId).map((m) => (
                  <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
                ))}
              </select>
            </div>
            <button onClick={submit} disabled={submitting || !title.trim() || !description.trim()}
              className="w-full bg-indigo-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {submitting ? "Submitting…" : "Submit dispute"}
            </button>
          </div>
        )}

        {open.length === 0 && closed.length === 0 && !showForm && (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center">
            <p className="text-sm text-gray-400">No disputes raised. All good!</p>
          </div>
        )}

        {open.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Open disputes</h2>
            {open.map((d) => (
              <div key={d.id} className="bg-white rounded-2xl border border-amber-100 px-4 py-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">{d.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${STATUS_STYLE[d.status]}`}>
                    {d.status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{d.description}</p>
                <p className="text-xs text-gray-400">
                  By {d.raisedBy.name}
                  {d.against && ` · against ${d.against.name}`}
                  {" · "}{new Date(d.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
                {isAdmin && (
                  <div className="space-y-2 pt-1 border-t border-gray-100">
                    <input type="text" value={resolution} onChange={(e) => setResolution(e.target.value)}
                      placeholder="Resolution note (optional)"
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <div className="flex gap-2">
                      <button onClick={() => resolve(d.id, "resolved")} disabled={resolving === d.id}
                        className="flex-1 text-xs py-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 font-medium">
                        {resolving === d.id ? "…" : "Mark resolved"}
                      </button>
                      <button onClick={() => resolve(d.id, "dismissed")} disabled={resolving === d.id}
                        className="flex-1 text-xs py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 font-medium">
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {closed.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Closed</h2>
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
              {closed.map((d) => (
                <div key={d.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-gray-600">{d.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${STATUS_STYLE[d.status]}`}>
                      {d.status}
                    </span>
                  </div>
                  {d.resolution && <p className="text-xs text-gray-400 mt-1">{d.resolution}</p>}
                </div>
              ))}
            </div>
          </section>
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
