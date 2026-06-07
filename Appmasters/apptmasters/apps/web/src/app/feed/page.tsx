"use client";
import { useEffect, useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const TYPE_ICON: Record<string, string> = {
  chore_completed: "✅",
  expense_added: "💰",
  maintenance_reported: "🔧",
  member_joined: "👋",
  rule_proposed: "📋",
  rule_passed: "✅",
  manual: "💬",
};

type Post = {
  id: string;
  type: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; color?: string };
};

export default function FeedPage() {
  const { data: session } = useSession();
  const token = (session as { token?: string })?.token ?? "";
  const currentUserId = (session?.user as { id?: string })?.id ?? "";

  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [, startTransition] = useTransition();

  async function load() {
    if (!token) return;
    const res = await fetch(`${API_URL}/api/feed`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setPosts(await res.json());
  }

  useEffect(() => { load(); }, [token]);

  async function post() {
    if (!content.trim()) return;
    setPosting(true);
    await fetch(`${API_URL}/api/feed`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.trim() }),
    });
    setContent("");
    setPosting(false);
    startTransition(() => load());
  }

  async function deletePost(id: string) {
    await fetch(`${API_URL}/api/feed/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    startTransition(() => load());
  }

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="font-bold text-gray-900">Activity Feed</h1>
          <Link href="/home" className="text-sm text-indigo-600 hover:underline">← Home</Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Compose */}
        <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex gap-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share something with your roommates…"
            rows={2}
            className="flex-1 text-sm resize-none focus:outline-none text-gray-800 placeholder-gray-400"
          />
          <button
            onClick={post}
            disabled={posting || !content.trim()}
            className="self-end bg-indigo-600 text-white text-sm px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {posting ? "…" : "Post"}
          </button>
        </div>

        {/* Posts */}
        {posts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center">
            <p className="text-sm text-gray-400">No activity yet. Be the first to post!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div key={post.id} className="bg-white rounded-2xl border border-gray-100 px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: post.user.color ?? "#6366f1" }}
                  >
                    {post.user.name[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-900">{post.user.name}</span>
                  <span className="text-xs text-gray-400 ml-auto">{timeAgo(post.createdAt)}</span>
                  <span className="text-base leading-none">{TYPE_ICON[post.type] ?? "💬"}</span>
                  {post.user.id === currentUserId && (
                    <button
                      onClick={() => deletePost(post.id)}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors"
                    >
                      ×
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-700">{post.content}</p>
              </div>
            ))}
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
