"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type GroceryItem = {
  id: string;
  name: string;
  quantity?: string | null;
  checked: boolean;
  addedBy: { id: string; name: string };
  checkedBy?: { id: string; name: string } | null;
};

export default function GroceryPage() {
  const { data: session } = useSession();
  const token = (session as { token?: string })?.token ?? "";

  const [items, setItems] = useState<GroceryItem[]>([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [adding, setAdding] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    const res = await fetch(`${API_URL}/api/grocery`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setItems(await res.json());
  }

  useEffect(() => { load(); }, [token]);

  async function addItem() {
    if (!name.trim()) return;
    setAdding(true);
    await fetch(`${API_URL}/api/grocery`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), quantity: quantity.trim() || undefined }),
    });
    setName(""); setQuantity("");
    setAdding(false);
    load();
  }

  async function toggleCheck(id: string) {
    setToggling(id);
    await fetch(`${API_URL}/api/grocery/${id}/check`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    setToggling(null);
    load();
  }

  async function deleteItem(id: string) {
    await fetch(`${API_URL}/api/grocery/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    load();
  }

  async function clearChecked() {
    await fetch(`${API_URL}/api/grocery/clear-checked`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    load();
  }

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="font-bold text-gray-900">Grocery List</h1>
          <Link href="/home" className="text-sm text-indigo-600 hover:underline">← Home</Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Add item */}
        <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex gap-2">
          <input
            type="text"
            placeholder="Add item…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            className="flex-1 text-sm focus:outline-none text-gray-800 placeholder-gray-400"
          />
          <input
            type="text"
            placeholder="Qty"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-16 text-sm text-center border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={addItem}
            disabled={adding || !name.trim()}
            className="bg-indigo-600 text-white text-sm px-3 py-1 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {adding ? "…" : "Add"}
          </button>
        </div>

        {/* Unchecked items */}
        {unchecked.length === 0 && checked.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center">
            <p className="text-sm text-gray-400">List is empty. Add something to buy!</p>
          </div>
        ) : (
          <>
            {unchecked.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                {unchecked.map((item) => (
                  <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                    <button
                      onClick={() => toggleCheck(item.id)}
                      disabled={toggling === item.id}
                      className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-indigo-500 flex items-center justify-center shrink-0 transition-colors disabled:opacity-50"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      {item.quantity && <p className="text-xs text-gray-400">{item.quantity}</p>}
                    </div>
                    <p className="text-xs text-gray-400">{item.addedBy.name}</p>
                    <button onClick={() => deleteItem(item.id)}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors">×</button>
                  </div>
                ))}
              </div>
            )}

            {/* Checked items */}
            {checked.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Checked ({checked.length})</h2>
                  <button onClick={clearChecked} className="text-xs text-red-400 hover:text-red-600">Clear all</button>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                  {checked.map((item) => (
                    <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                      <button
                        onClick={() => toggleCheck(item.id)}
                        disabled={toggling === item.id}
                        className="w-5 h-5 rounded-full bg-green-500 border-2 border-green-500 flex items-center justify-center shrink-0 disabled:opacity-50"
                      >
                        <span className="text-white text-xs leading-none">✓</span>
                      </button>
                      <p className="text-sm text-gray-400 line-through flex-1">{item.name}</p>
                      {item.checkedBy && <p className="text-xs text-gray-400">{item.checkedBy.name}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
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
