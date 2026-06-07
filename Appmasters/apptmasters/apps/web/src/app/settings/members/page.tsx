"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Member = {
  id: string;
  role: string;
  user: { id: string; name: string; email: string; color?: string };
};

export default function MembersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const token = (session as { token?: string })?.token ?? "";
  const currentUserId = (session?.user as { id?: string })?.id ?? "";

  const [members, setMembers] = useState<Member[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [transferring, setTransferring] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    const [membersRes, userRes] = await Promise.all([
      fetch(`${API_URL}/api/apartment/members`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (membersRes.ok) setMembers(await membersRes.json());
    if (userRes.ok) {
      const u = await userRes.json();
      setIsAdmin(u.membership?.role === "admin");
    }
  }

  useEffect(() => { load(); }, [token]);

  async function removeMember(userId: string) {
    if (!confirm("Remove this member from the apartment?")) return;
    setRemoving(userId);
    await fetch(`${API_URL}/api/apartment/members/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setRemoving(null);
    load();
  }

  async function transferAdmin(userId: string) {
    if (!confirm("Transfer admin role to this member? You will become a regular member.")) return;
    setTransferring(userId);
    await fetch(`${API_URL}/api/apartment/transfer-admin`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ newAdminId: userId }),
    });
    setTransferring(null);
    load();
  }

  const ROLE_COLOR: Record<string, string> = {
    admin: "bg-indigo-100 text-indigo-700",
    member: "bg-gray-100 text-gray-600",
    guest: "bg-yellow-100 text-yellow-700",
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-xl leading-none">←</button>
          <h1 className="font-bold text-gray-900">Members</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-3">
        {members.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center">
            <p className="text-sm text-gray-400">No members found.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {members.map((m) => {
              const isSelf = m.user.id === currentUserId;
              return (
                <div key={m.id} className="px-4 py-3 flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ backgroundColor: m.user.color ?? "#6366f1" }}
                  >
                    {m.user.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{m.user.name}</p>
                      {isSelf && <span className="text-xs text-gray-400">(you)</span>}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{m.user.email}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${ROLE_COLOR[m.role] ?? "bg-gray-100 text-gray-600"}`}>
                    {m.role}
                  </span>
                  {isAdmin && !isSelf && (
                    <div className="flex items-center gap-2 shrink-0">
                      {m.role !== "admin" && (
                        <button
                          onClick={() => transferAdmin(m.user.id)}
                          disabled={transferring === m.user.id}
                          className="text-xs text-indigo-500 hover:text-indigo-700 disabled:opacity-50"
                        >
                          {transferring === m.user.id ? "…" : "Make admin"}
                        </button>
                      )}
                      <button
                        onClick={() => removeMember(m.user.id)}
                        disabled={removing === m.user.id}
                        className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
                      >
                        {removing === m.user.id ? "…" : "Remove"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {isAdmin && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
            <p className="text-xs text-amber-700">
              As admin you can remove members or transfer the admin role. Removed members lose access immediately.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
