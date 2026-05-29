import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

async function getApartment(token: string) {
  try {
    const res = await fetch(`${API_URL}/api/apartment`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getMembers(token: string) {
  try {
    const res = await fetch(`${API_URL}/api/apartment/members`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function getRooms(token: string) {
  try {
    const res = await fetch(`${API_URL}/api/rooms`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

const STATUS_COLOR: Record<string, string> = {
  Clean: "bg-green-100 text-green-700",
  Acceptable: "bg-lime-100 text-lime-700",
  NeedsAttention: "bg-amber-100 text-amber-700",
  Overdue: "bg-red-100 text-red-700",
};

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  const token = (session as { token?: string }).token ?? "";
  const [apartment, members, rooms] = await Promise.all([
    getApartment(token),
    getMembers(token),
    getRooms(token),
  ]);

  if (!apartment) redirect("/onboarding");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900">{apartment.name}</h1>
            <p className="text-xs text-gray-400">Invite code: <span className="font-mono font-medium text-gray-600">{apartment.inviteCode}</span></p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-brand text-sm font-semibold">
              {session.user?.name?.[0]?.toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Members */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Roommates</h2>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {members.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400">No members yet</p>
            ) : (
              members.map((m: { id: string; user: { name: string; color?: string }; role: string }) => (
                <div key={m.id} className="px-4 py-3 flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                    style={{ backgroundColor: m.user.color ?? "#6366f1" }}
                  >
                    {m.user.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{m.user.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{m.role}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Rooms */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Rooms</h2>
          {rooms.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 px-4 py-6 text-center">
              <p className="text-sm text-gray-400">No rooms configured</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {rooms.map((room: { id: string; name: string; status: string }) => (
                <div key={room.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <p className="font-medium text-gray-900 text-sm">{room.name}</p>
                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[room.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {room.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Coming Soon */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Coming in Phase 2</h2>
          <div className="grid grid-cols-2 gap-3">
            {["Chores", "Finance", "Maintenance", "Inventory", "Rules", "Calendar"].map((label) => (
              <div key={label} className="bg-white rounded-2xl border border-dashed border-gray-200 p-4 text-center">
                <p className="text-sm text-gray-400">{label}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
