"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Rule = {
  id: string;
  content: string;
  status: "proposed" | "active" | "rejected";
  yesCount: number;
  noCount: number;
  myVote: boolean | null;
  proposedBy: { id: string; name: string };
  createdAt: string;
};

const STATUS_STYLE: Record<string, string> = {
  proposed: "bg-amber-100 text-amber-700",
  active: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function RulesPage() {
  const { data: session } = useSession();
  const token = (session as { token?: string })?.token ?? "";

  const [rules, setRules] = useState<Rule[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [content, setContent] = useState("");
  const [proposing, setProposing] = useState(false);
  const [voting, setVoting] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    const [rulesRes, userRes] = await Promise.all([
      fetch(`${API_URL}/api/rules`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (rulesRes.ok) setRules(await rulesRes.json());
    if (userRes.ok) {
      const u = await userRes.json();
      setIsAdmin(u.membership?.role === "admin");
    }
  }

  useEffect(() => { load(); }, [token]);

  async function propose() {
    if (!content.trim()) return;
    setProposing(true);
    await fetch(`${API_URL}/api/rules`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.trim() }),
    });
    setContent("");
    setProposing(false);
    load();
  }

  async function vote(ruleId: string, v: boolean) {
    setVoting(ruleId);
    await fetch(`${API_URL}/api/rules/${ruleId}/vote`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ vote: v }),
    });
    setVoting(null);
    load();
  }

  async function adminResolve(ruleId: string, status: "active" | "rejected") {
    await fetch(`${API_URL}/api/rules/${ruleId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  const active = rules.filter((r) => r.status === "active");
  const proposed = rules.filter((r) => r.status === "proposed");
  const rejected = rules.filter((r) => r.status === "rejected");

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="font-bold text-gray-900">House Rules</h1>
          <Link href="/home" className="text-sm text-indigo-600 hover:underline">← Home</Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Propose */}
        <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Propose a rule</h2>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="e.g. No dishes left in the sink overnight"
            rows={2}
            className="w-full text-sm resize-none border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={propose}
            disabled={proposing || !content.trim()}
            className="w-full bg-indigo-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {proposing ? "Proposing…" : "Propose"}
          </button>
        </div>

        {/* Active rules */}
        {active.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Active rules</h2>
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
              {active.map((rule) => (
                <div key={rule.id} className="px-4 py-3 flex items-start gap-3">
                  <span className="text-green-500 text-lg leading-none mt-0.5">✓</span>
                  <p className="text-sm text-gray-800 flex-1">{rule.content}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Voting */}
        {proposed.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Voting in progress</h2>
            {proposed.map((rule) => (
              <div key={rule.id} className="bg-white rounded-2xl border border-amber-100 px-4 py-4 space-y-3">
                <p className="text-sm text-gray-800">{rule.content}</p>
                <p className="text-xs text-gray-400">Proposed by {rule.proposedBy.name}</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => vote(rule.id, true)}
                    disabled={voting === rule.id}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${rule.myVote === true ? "bg-green-500 text-white border-green-500" : "border-green-300 text-green-700 hover:bg-green-50"}`}
                  >
                    👍 Yes ({rule.yesCount})
                  </button>
                  <button
                    onClick={() => vote(rule.id, false)}
                    disabled={voting === rule.id}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${rule.myVote === false ? "bg-red-500 text-white border-red-500" : "border-red-300 text-red-700 hover:bg-red-50"}`}
                  >
                    👎 No ({rule.noCount})
                  </button>
                </div>
                {isAdmin && (
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => adminResolve(rule.id, "active")} className="text-xs text-green-600 hover:underline">Force pass</button>
                    <button onClick={() => adminResolve(rule.id, "rejected")} className="text-xs text-red-500 hover:underline">Reject</button>
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {rejected.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Rejected</h2>
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
              {rejected.map((rule) => (
                <div key={rule.id} className="px-4 py-3">
                  <p className="text-sm text-gray-400 line-through">{rule.content}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {rules.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center">
            <p className="text-sm text-gray-400">No rules yet. Propose the first one!</p>
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
