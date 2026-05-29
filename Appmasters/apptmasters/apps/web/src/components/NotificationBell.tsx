"use client";
import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  sentAt: string;
  referenceId: string | null;
};

const TYPE_ICON: Record<string, string> = {
  chore_reminder: "⏰",
  chore_overdue: "⚠️",
  chore_nudge: "👋",
  expense_added: "💰",
  settle_up_reminder: "💸",
  low_stock: "📦",
  rent_due: "🏠",
  maintenance_followup: "🔧",
  weekly_summary: "📊",
  house_rule_vote: "🗳️",
  dispute_raised: "⚡",
};

export function NotificationBell({ token }: { token: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCount();
  }, []);

  async function fetchCount() {
    try {
      const res = await fetch(`${API_URL}/api/notifications/count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCount(data.count);
      }
    } catch {}
  }

  async function openPanel() {
    if (open) { setOpen(false); return; }
    setLoading(true);
    setOpen(true);
    try {
      const res = await fetch(`${API_URL}/api/notifications?limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setNotifications(await res.json());
    } catch {}
    setLoading(false);
  }

  async function markRead(id: string) {
    await fetch(`${API_URL}/api/notifications/${id}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    setCount((c) => Math.max(0, c - 1));
  }

  async function markAllRead() {
    await fetch(`${API_URL}/api/notifications/read-all`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setCount(0);
  }

  return (
    <div className="relative">
      <button
        onClick={openPanel}
        className="relative w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
        aria-label="Notifications"
      >
        <span className="text-base">🔔</span>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-40 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
              {count > 0 && (
                <button onClick={markAllRead} className="text-xs text-brand hover:underline">
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
              {loading && (
                <div className="px-4 py-6 text-center text-sm text-gray-400">Loading…</div>
              )}
              {!loading && notifications.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <p className="text-2xl mb-2">✓</p>
                  <p className="text-sm text-gray-400">All caught up!</p>
                </div>
              )}
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${!n.read ? "bg-brand/5" : ""}`}
                >
                  <div className="flex gap-3">
                    <span className="text-lg shrink-0 mt-0.5">{TYPE_ICON[n.type] ?? "📬"}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${!n.read ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(n.sentAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-brand mt-1.5 shrink-0" />}
                  </div>
                </button>
              ))}
            </div>

            <div className="px-4 py-3 border-t border-gray-100">
              <button
                onClick={() => { setOpen(false); startTransition(() => router.push("/settings/notifications")); }}
                className="text-xs text-gray-400 hover:text-brand"
              >
                Notification preferences →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
