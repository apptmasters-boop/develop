"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Chore = {
  id: string;
  name: string;
  points: number;
  status: "pending" | "completed" | "overdue" | "swapped";
  assignedToUserId: string | null;
  assignedTo?: { id: string; name: string; color?: string } | null;
  room?: { id: string; name: string } | null;
  dueAt: string;
  photoUrl: string | null;
  assignmentMode: string;
};

type Room = { id: string; name: string; status: string };
type Member = { id: string; role: string; user: { id: string; name: string; color?: string } };
type Workload = { userId: string; pointsLast30Days: number; choresDone: number; choresOverdue: number };

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  swapped: "bg-blue-100 text-blue-700",
};

export function ChoresList({
  chores,
  rooms,
  members,
  workload,
  currentUserId,
  token,
}: {
  chores: Chore[];
  rooms: Room[];
  members: Member[];
  workload: Workload[];
  currentUserId: string;
  token: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<"all" | "mine">("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [swapChoreId, setSwapChoreId] = useState<string | null>(null);
  const [swapTargetId, setSwapTargetId] = useState("");

  const filtered = filter === "mine"
    ? chores.filter((c) => c.assignedToUserId === currentUserId)
    : chores;

  const byRoom = rooms.map((room) => ({
    room,
    chores: filtered.filter((c) => c.room?.id === room.id),
  })).filter((g) => g.chores.length > 0);

  const unassignedToRoom = filtered.filter((c) => !c.room);

  async function completeChore(choreId: string) {
    await fetch(`${API_URL}/api/chores/${choreId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
    startTransition(() => router.refresh());
  }

  async function submitSwap() {
    if (!swapChoreId || !swapTargetId) return;
    await fetch(`${API_URL}/api/chores/${swapChoreId}/swap-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ requestedToUserId: swapTargetId }),
    });
    setSwapChoreId(null);
    setSwapTargetId("");
    startTransition(() => router.refresh());
  }

  const myWorkload = workload.find((w) => w.userId === currentUserId);

  return (
    <div className="space-y-6">
      {/* Workload bar */}
      {myWorkload && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-brand">{myWorkload.pointsLast30Days}</p>
            <p className="text-xs text-gray-400">pts (30d)</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{myWorkload.choresDone}</p>
            <p className="text-xs text-gray-400">done</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-500">{myWorkload.choresOverdue}</p>
            <p className="text-xs text-gray-400">overdue</p>
          </div>
          <div className="ml-auto flex items-center">
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-brand text-white text-sm px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors"
            >
              + Add Chore
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "mine"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? "bg-brand text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-brand"
            }`}
          >
            {f === "all" ? "All chores" : "My chores"}
          </button>
        ))}
      </div>

      {/* Add chore form */}
      {showAddForm && (
        <AddChoreForm
          rooms={rooms}
          members={members}
          token={token}
          onDone={() => {
            setShowAddForm(false);
            startTransition(() => router.refresh());
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Swap modal */}
      {swapChoreId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-4">Request Swap</h3>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Swap with:
            </label>
            <select
              value={swapTargetId}
              onChange={(e) => setSwapTargetId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm mb-4"
            >
              <option value="">Choose a roommate…</option>
              {members
                .filter((m) => m.user.id !== currentUserId)
                .map((m) => (
                  <option key={m.user.id} value={m.user.id}>
                    {m.user.name}
                  </option>
                ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={submitSwap}
                disabled={!swapTargetId}
                className="flex-1 bg-brand text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
              >
                Send Request
              </button>
              <button
                onClick={() => setSwapChoreId(null)}
                className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chores by room */}
      {byRoom.length === 0 && !showAddForm && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
          <p className="text-gray-400 text-sm">No chores yet. Add the first one!</p>
        </div>
      )}

      {byRoom.map(({ room, chores: roomChores }) => (
        <section key={room.id}>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {room.name}
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {roomChores.map((chore) => (
              <ChoreRow
                key={chore.id}
                chore={chore}
                currentUserId={currentUserId}
                isPending={isPending}
                onComplete={() => completeChore(chore.id)}
                onSwap={() => setSwapChoreId(chore.id)}
              />
            ))}
          </div>
        </section>
      ))}

      {unassignedToRoom.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Unassigned Room
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {unassignedToRoom.map((chore) => (
              <ChoreRow
                key={chore.id}
                chore={chore}
                currentUserId={currentUserId}
                isPending={isPending}
                onComplete={() => completeChore(chore.id)}
                onSwap={() => setSwapChoreId(chore.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ChoreRow({
  chore,
  currentUserId,
  isPending,
  onComplete,
  onSwap,
}: {
  chore: Chore;
  currentUserId: string;
  isPending: boolean;
  onComplete: () => void;
  onSwap: () => void;
}) {
  const isAssignedToMe = chore.assignedToUserId === currentUserId;
  const canComplete = isAssignedToMe && chore.status !== "completed";
  const dueDate = new Date(chore.dueAt);
  const isOverdue = chore.status !== "completed" && dueDate < new Date();

  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <button
        onClick={onComplete}
        disabled={!canComplete || isPending}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
          chore.status === "completed"
            ? "bg-green-500 border-green-500 text-white"
            : canComplete
            ? "border-gray-300 hover:border-brand"
            : "border-gray-200 opacity-40 cursor-not-allowed"
        }`}
      >
        {chore.status === "completed" && <span className="text-xs leading-none">✓</span>}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${chore.status === "completed" ? "line-through text-gray-400" : "text-gray-900"}`}>
          {chore.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {chore.assignedTo && (
            <span className="text-xs text-gray-400">{chore.assignedTo.name}</span>
          )}
          <span className={`text-xs ${isOverdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
            {isOverdue ? "Overdue — " : ""}
            {dueDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">{chore.points}pt</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[chore.status] ?? ""}`}>
          {chore.status}
        </span>
        {isAssignedToMe && chore.status === "pending" && (
          <button
            onClick={onSwap}
            className="text-xs text-gray-400 hover:text-brand transition-colors ml-1"
            title="Request swap"
          >
            ⇄
          </button>
        )}
      </div>
    </div>
  );
}

function AddChoreForm({
  rooms,
  members,
  token,
  onDone,
  onCancel,
}: {
  rooms: Room[];
  members: Member[];
  token: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? "");
  const [points, setPoints] = useState(1);
  const [mode, setMode] = useState<"rotating" | "fixed" | "voluntary">("rotating");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueAt, setDueAt] = useState(() => {
    const d = new Date(); d.setHours(23, 59, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch(`${API_URL}/api/chores`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        roomId,
        name,
        points,
        assignmentMode: mode,
        assignedToUserId: mode === "fixed" && assignedTo ? assignedTo : null,
        dueAt: new Date(dueAt).toISOString(),
      }),
    });
    setLoading(false);
    onDone();
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-brand/30 p-4 space-y-3">
      <h3 className="font-semibold text-gray-900 text-sm">New Chore</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Chore name (e.g. Vacuum living room)"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <select
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <input
          type="datetime-local"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as typeof mode)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="rotating">Rotating</option>
          <option value="fixed">Fixed</option>
          <option value="voluntary">Voluntary</option>
        </select>
        <input
          type="number"
          min={1}
          max={10}
          value={points}
          onChange={(e) => setPoints(Number(e.target.value))}
          placeholder="Points"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        {mode === "fixed" && (
          <div className="col-span-2">
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Auto-assign to…</option>
              {members.map((m) => <option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}
            </select>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !name.trim() || !roomId}
          className="bg-brand text-white text-sm px-4 py-2 rounded-lg hover:bg-brand-dark disabled:opacity-50"
        >
          {loading ? "Adding…" : "Add Chore"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-gray-500 px-4 py-2">
          Cancel
        </button>
      </div>
    </form>
  );
}
