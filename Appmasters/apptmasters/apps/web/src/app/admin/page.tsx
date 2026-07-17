"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Stats = { totalUsers: number; totalApartments: number; totalMessages: number; totalExpenses: number };
type UserRow = { id: string; email: string; name: string; platformRole: string; color: string; createdAt: string };

export default function SuperAdminPage() {
  const { data: session, status } = useSession();
  const token = (session as unknown as { token?: string })?.token ?? "";
  const platformRole = (session as unknown as { platformRole?: string })?.platformRole;
  const router = useRouter();

  const [tab, setTab] = useState<"stats" | "users" | "landlords">("stats");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [exportData, setExportData] = useState<Record<string, unknown> | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!token || platformRole !== "super_admin") {
      router.replace("/home");
    }
  }, [status, token, platformRole]);

  useEffect(() => {
    if (!token || platformRole !== "super_admin") return;
    fetch(`${API_URL}/api/admin/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setStats);
  }, [token, platformRole]);

  async function searchUsers(q: string) {
    setSearching(true);
    setExportData(null);
    const url = q.trim() ? `${API_URL}/api/admin/users?q=${encodeURIComponent(q)}` : `${API_URL}/api/admin/users`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setUsers(await res.json());
    setSearching(false);
  }

  async function exportUser(userId: string) {
    setExporting(userId);
    setExportData(null);
    const res = await fetch(`${API_URL}/api/admin/users/${userId}/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setExportData(await res.json());
    setExporting(null);
  }

  function downloadExport() {
    if (!exportData) return;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `user-export-${(exportData.user as UserRow)?.id ?? "unknown"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (status === "loading" || platformRole !== "super_admin") return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900 text-lg">Super Admin</h1>
            <p className="text-xs text-gray-400">Platform management — ApptMasters</p>
          </div>
          <button onClick={() => router.push("/home")} className="text-sm text-indigo-600 hover:underline">
            ← Tenant view
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto flex">
          {(["stats", "users", "landlords"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-6 py-3 text-sm font-medium capitalize transition-colors border-b-2 ${
                tab === t ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-400 hover:text-gray-600"
              }`}>
              {t === "stats" ? "Platform Stats" : t === "users" ? "User Lookup" : "Landlords"}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-6 space-y-6">

        {/* ── Stats ── */}
        {tab === "stats" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Users", value: stats?.totalUsers },
              { label: "Apartments", value: stats?.totalApartments },
              { label: "Messages", value: stats?.totalMessages },
              { label: "Expenses", value: stats?.totalExpenses },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 px-5 py-5">
                <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                <p className="text-3xl font-bold text-gray-900">{s.value ?? "…"}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── User Lookup ── */}
        {tab === "users" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4 space-y-3">
              <h2 className="text-sm font-semibold text-gray-700">Search users</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchUsers(query)}
                  placeholder="Search by name or email…"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button onClick={() => searchUsers(query)} disabled={searching}
                  className="bg-indigo-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
                  {searching ? "…" : "Search"}
                </button>
              </div>
              <p className="text-xs text-gray-400">Leave empty and press Search to list all users.</p>
            </div>

            {users.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                {users.map((u) => (
                  <div key={u.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: u.color ?? "#6366f1" }}>
                      {u.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email} · {u.platformRole}</p>
                    </div>
                    <button onClick={() => exportUser(u.id)} disabled={exporting === u.id}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50">
                      {exporting === u.id ? "Exporting…" : "Export data"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {exportData && (
              <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-green-800">Export ready</p>
                    <p className="text-xs text-green-600">
                      {(exportData.user as UserRow)?.name} · exported {new Date(exportData.exportedAt as string).toLocaleString()}
                    </p>
                  </div>
                  <button onClick={downloadExport}
                    className="bg-green-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-green-700">
                    Download JSON
                  </button>
                </div>
                <p className="text-xs text-green-600">
                  Includes profile, apartment memberships, messages, expenses, and disputes. Access has been logged.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Landlords (placeholder) ── */}
        {tab === "landlords" && (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 px-6 py-12 text-center">
            <p className="text-2xl mb-2">🏢</p>
            <p className="text-sm font-semibold text-gray-700">Landlord management coming soon</p>
            <p className="text-xs text-gray-400 mt-1">This section will let you create and manage landlord accounts and their properties.</p>
          </div>
        )}

      </main>
    </div>
  );
}
