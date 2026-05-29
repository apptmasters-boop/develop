import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

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

const STATUS_COLOR: Record<string, string> = {
  Clean: "bg-green-100 text-green-700",
  Acceptable: "bg-lime-100 text-lime-700",
  NeedsAttention: "bg-amber-100 text-amber-700",
  Overdue: "bg-red-100 text-red-700",
};

const CHORE_STATUS_DOT: Record<string, string> = {
  pending: "bg-amber-400",
  overdue: "bg-red-500",
  completed: "bg-green-500",
};

type Apartment = { id: string; name: string; inviteCode: string };
type Member = { id: string; role: string; user: { id: string; name: string; color?: string } };
type Room = { id: string; name: string; status: string };
type Chore = {
  id: string; name: string; status: string; points: number;
  assignedToUserId: string | null;
  assignedTo?: { name: string } | null;
  room?: { name: string } | null;
  dueAt: string;
};

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");
  const token = (session as { token?: string }).token ?? "";

  const [apartment, members, rooms, todayChores] = await Promise.all([
    get<Apartment | null>("/api/apartment", token, null),
    get<Member[]>("/api/apartment/members", token, []),
    get<Room[]>("/api/rooms", token, []),
    get<Chore[]>("/api/chores?today=true", token, []),
  ]);

  if (!apartment) redirect("/onboarding");

  const userId = (session.user as { id?: string })?.id ?? "";
  const myChores = todayChores.filter((c) => c.assignedToUserId === userId);
  const pendingCount = todayChores.filter((c) => c.status === "pending").length;
  const overdueCount = todayChores.filter((c) => c.status === "overdue").length;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900">{apartment.name}</h1>
            <p className="text-xs text-gray-400">
              Code: <span className="font-mono font-medium text-gray-600">{apartment.inviteCode}</span>
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-brand text-sm font-semibold">
            {session.user?.name?.[0]?.toUpperCase()}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Today summary */}
        {(pendingCount > 0 || overdueCount > 0) && (
          <div className={`rounded-2xl p-4 ${overdueCount > 0 ? "bg-red-50 border border-red-100" : "bg-amber-50 border border-amber-100"}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {overdueCount > 0
                    ? `${overdueCount} overdue chore${overdueCount > 1 ? "s" : ""}`
                    : `${pendingCount} chore${pendingCount > 1 ? "s" : ""} due today`}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {myChores.length > 0 ? `${myChores.length} assigned to you` : "None assigned to you"}
                </p>
              </div>
              <Link href="/chores" className="text-sm font-medium text-brand hover:underline">
                View →
              </Link>
            </div>
          </div>
        )}

        {/* Today's chores (mine) */}
        {myChores.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">My Chores Today</h2>
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
              {myChores.map((chore) => (
                <div key={chore.id} className="px-4 py-3 flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${CHORE_STATUS_DOT[chore.status] ?? "bg-gray-300"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{chore.name}</p>
                    <p className="text-xs text-gray-400">{chore.room?.name ?? "No room"} · {chore.points}pt</p>
                  </div>
                  <span className="text-xs text-gray-400 capitalize">{chore.status}</span>
                </div>
              ))}
            </div>
            <Link href="/chores" className="text-xs text-brand hover:underline mt-2 inline-block">
              See all chores →
            </Link>
          </section>
        )}

        {/* Rooms */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Rooms</h2>
          </div>
          {rooms.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-center">
              <p className="text-sm text-gray-400">No rooms configured</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {rooms.map((room) => {
                const roomChores = todayChores.filter((c) => c.room?.name === room.name);
                const hasOverdue = roomChores.some((c) => c.status === "overdue");
                return (
                  <div key={room.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                    <p className="font-medium text-gray-900 text-sm">{room.name}</p>
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[room.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {room.status}
                    </span>
                    {hasOverdue && (
                      <p className="text-xs text-red-500 mt-1">⚠ overdue chore</p>
                    )}
                    {roomChores.length > 0 && !hasOverdue && (
                      <p className="text-xs text-gray-400 mt-1">{roomChores.length} chore{roomChores.length > 1 ? "s" : ""} today</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Roommates */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Roommates</h2>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {members.map((m) => (
              <div key={m.id} className="px-4 py-3 flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                  style={{ backgroundColor: m.user.color ?? "#6366f1" }}
                >
                  {m.user.name[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{m.user.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{m.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Coming Soon modules */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Coming Soon</h2>
          <div className="grid grid-cols-2 gap-3">
            {["Finance", "Maintenance", "Inventory", "Rules", "Calendar", "Feed"].map((label) => (
              <div key={label} className="bg-white rounded-2xl border border-dashed border-gray-200 p-4 text-center">
                <p className="text-sm text-gray-400">{label}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex">
        {[
          { href: "/home", label: "Home", icon: "⌂" },
          { href: "/chores", label: "Chores", icon: "✓" },
          { href: "/home", label: "Finance", icon: "$" },
          { href: "/home", label: "More", icon: "⋯" },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex-1 py-3 flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand transition-colors"
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
