import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { FinanceView } from "./FinanceView";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

async function get<T>(path: string, token: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return res.ok ? (res.json() as Promise<T>) : fallback;
  } catch {
    return fallback;
  }
}

export default async function FinancePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");
  const token = (session as { token?: string }).token ?? "";
  const userId = (session.user as { id?: string })?.id ?? "";

  const [expenses, balance, recurring, settlements] = await Promise.all([
    get<unknown[]>("/api/finances", token, []),
    get<unknown[]>("/api/finances/balance", token, []),
    get<unknown[]>("/api/finances/recurring", token, []),
    get<unknown[]>("/api/finances/settlements", token, []),
  ]);

  const members = await get<unknown[]>("/api/apartment/members", token, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900">Finance</h1>
            <p className="text-xs text-gray-400">Expenses &amp; balances</p>
          </div>
          <a href="/home" className="text-sm text-brand hover:underline">← Home</a>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">
        <FinanceView
          expenses={expenses}
          balance={balance}
          recurring={recurring}
          settlements={settlements}
          members={members}
          currentUserId={userId}
          token={token}
        />
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
            className="flex-1 py-3 flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand transition-colors">
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
