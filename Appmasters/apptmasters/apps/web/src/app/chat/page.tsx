"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Member = { id: string; role: string; user: { id: string; name: string; color?: string } };
type LastMessage = { content: string | null; createdAt: string; from: { name: string } } | null;

export default function ChatHubPage() {
  const { data: session } = useSession();
  const token = (session as { token?: string })?.token ?? "";
  const myId = (session?.user as { id?: string })?.id ?? "";

  const [members, setMembers] = useState<Member[]>([]);
  const [groupLast, setGroupLast] = useState<LastMessage>(null);

  async function load() {
    if (!token) return;
    const [mRes, gRes] = await Promise.all([
      fetch(`${API_URL}/api/apartment/members`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/api/comms/messages`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (mRes.ok) setMembers(await mRes.json());
    if (gRes.ok) {
      const msgs = await gRes.json();
      if (msgs.length > 0) setGroupLast(msgs[msgs.length - 1]);
    }
  }

  useEffect(() => { load(); }, [token]);

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  const roommates = members.filter((m) => m.user.id !== myId);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="font-bold text-gray-900">Messages</h1>
          <Link href="/home" className="text-sm text-indigo-600 hover:underline">← Home</Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Group chat */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Group</h2>
          <Link href="/chat/group"
            className="bg-white rounded-2xl border border-gray-100 px-4 py-4 flex items-center gap-3 hover:border-indigo-200 transition-colors group block">
            <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center text-xl shrink-0">
              🏠
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">Group Chat</p>
              {groupLast ? (
                <p className="text-xs text-gray-400 truncate">
                  {groupLast.from.name}: {groupLast.content ?? "📷 Image"}
                </p>
              ) : (
                <p className="text-xs text-gray-400">No messages yet</p>
              )}
            </div>
            {groupLast && (
              <span className="text-xs text-gray-400 shrink-0">{timeAgo(groupLast.createdAt)}</span>
            )}
          </Link>
        </section>

        {/* Direct messages */}
        {roommates.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Direct Messages</h2>
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
              {roommates.map((m) => (
                <Link key={m.user.id} href={`/chat/dm/${m.user.id}`}
                  className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors group">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ backgroundColor: m.user.color ?? "#6366f1" }}
                  >
                    {m.user.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {m.user.name}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">{m.role}</p>
                  </div>
                  <span className="text-gray-300 group-hover:text-indigo-400 transition-colors text-sm">→</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {roommates.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center">
            <p className="text-sm text-gray-400">No roommates yet. Share your invite code!</p>
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
