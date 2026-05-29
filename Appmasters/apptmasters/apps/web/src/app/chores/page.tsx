import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ChoresList } from "./ChoresList";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

async function getChores(token: string) {
  const res = await fetch(`${API_URL}/api/chores`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return res.ok ? res.json() : [];
}

async function getRooms(token: string) {
  const res = await fetch(`${API_URL}/api/rooms`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return res.ok ? res.json() : [];
}

async function getMembers(token: string) {
  const res = await fetch(`${API_URL}/api/apartment/members`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return res.ok ? res.json() : [];
}

async function getWorkload(token: string) {
  const res = await fetch(`${API_URL}/api/chores/workload`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return res.ok ? res.json() : [];
}

export default async function ChoresPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");
  const token = (session as { token?: string }).token ?? "";

  const [chores, rooms, members, workload] = await Promise.all([
    getChores(token),
    getRooms(token),
    getMembers(token),
    getWorkload(token),
  ]);

  const userId = (session.user as { id?: string })?.id ?? "";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900">Chores</h1>
            <p className="text-xs text-gray-400">Track and complete household tasks</p>
          </div>
          <a href="/home" className="text-sm text-brand hover:underline">← Home</a>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <ChoresList
          chores={chores}
          rooms={rooms}
          members={members}
          workload={workload}
          currentUserId={userId}
          token={token}
        />
      </main>
    </div>
  );
}
