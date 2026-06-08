"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const CATEGORIES = ["food", "cleaning", "toiletries", "kitchen", "laundry", "other"] as const;

type InventoryItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  lowStockThreshold: number;
  expiresAt: string | null;
  photoUrl: string | null;
  lowStock: boolean;
  expired: boolean;
  expiringSoon: boolean;
  addedBy: { id: string; name: string };
};

export default function InventoryPage() {
  const { data: session } = useSession();
  const token = (session as { token?: string })?.token ?? "";

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("other");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("units");
  const [lowStockThreshold, setLowStockThreshold] = useState(1);
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [adjusting, setAdjusting] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    const res = await fetch(`${API_URL}/api/inventory`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setItems(await res.json());
  }

  useEffect(() => { load(); }, [token]);

  async function addItem() {
    if (!name.trim()) return;
    setSaving(true);
    await fetch(`${API_URL}/api/inventory`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(), category, quantity, unit, lowStockThreshold,
        expiresAt: expiresAt || undefined,
      }),
    });
    setName(""); setCategory("other"); setQuantity(1); setUnit("units"); setLowStockThreshold(1); setExpiresAt("");
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function adjust(id: string, delta: number) {
    setAdjusting(id);
    await fetch(`${API_URL}/api/inventory/${id}/adjust`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ delta }),
    });
    setAdjusting(null);
    load();
  }

  async function deleteItem(id: string) {
    await fetch(`${API_URL}/api/inventory/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    load();
  }

  const grouped = items.reduce<Record<string, InventoryItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const alertItems = items.filter((i) => i.lowStock || i.expired || i.expiringSoon);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="font-bold text-gray-900">Inventory</h1>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowForm((v) => !v)}
              className="text-sm text-indigo-600 font-semibold hover:text-indigo-800">
              {showForm ? "Cancel" : "+ Add item"}
            </button>
            <Link href="/home" className="text-sm text-gray-400 hover:underline">← Home</Link>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {showForm && (
          <div className="bg-white rounded-2xl border border-indigo-100 px-4 py-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">New item</h2>
            <input type="text" placeholder="Item name" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Unit</label>
                <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Qty</label>
                <input type="number" min={0} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Low stock alert at</label>
                <input type="number" min={0} value={lowStockThreshold} onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Expiry date (optional)</label>
              <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <button onClick={addItem} disabled={saving || !name.trim()}
              className="w-full bg-indigo-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {saving ? "Adding…" : "Add item"}
            </button>
          </div>
        )}

        {/* Alerts */}
        {alertItems.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-red-500 uppercase tracking-wide">Needs attention</h2>
            <div className="bg-white rounded-2xl border border-red-100 divide-y divide-gray-50">
              {alertItems.map((item) => (
                <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                  <span className="text-base leading-none">
                    {item.expired ? "⛔" : item.expiringSoon ? "⚠️" : "📉"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-red-500">
                      {item.expired ? "Expired" : item.expiringSoon ? "Expiring soon" : `Only ${item.quantity} ${item.unit} left`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* By category */}
        {Object.keys(grouped).length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center">
            <p className="text-sm text-gray-400">No items tracked yet. Add something!</p>
          </div>
        ) : (
          Object.entries(grouped).map(([cat, catItems]) => (
            <section key={cat} className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide capitalize">{cat}</h2>
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                {catItems.map((item) => (
                  <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-400">
                        {item.expiresAt && `Exp: ${new Date(item.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · `}
                        {item.addedBy.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => adjust(item.id, -1)} disabled={adjusting === item.id}
                        className="w-6 h-6 rounded-full border border-gray-200 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 text-sm font-bold flex items-center justify-center disabled:opacity-50">−</button>
                      <span className={`text-sm font-semibold w-8 text-center ${item.lowStock ? "text-red-500" : "text-gray-800"}`}>
                        {item.quantity}
                      </span>
                      <button onClick={() => adjust(item.id, 1)} disabled={adjusting === item.id}
                        className="w-6 h-6 rounded-full border border-gray-200 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 text-sm font-bold flex items-center justify-center disabled:opacity-50">+</button>
                    </div>
                    <span className="text-xs text-gray-400">{item.unit}</span>
                    <button onClick={() => deleteItem(item.id)}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors ml-1">×</button>
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
