"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const ROOM_TYPES = ["kitchen", "living", "bathroom", "hallway", "balcony", "laundry", "custom"] as const;
type RoomType = typeof ROOM_TYPES[number];

type Room = { id: string; name: string; type: RoomType; status: string };

const STATUS_COLOR: Record<string, string> = {
  Clean: "bg-green-100 text-green-700",
  Acceptable: "bg-lime-100 text-lime-700",
  NeedsAttention: "bg-amber-100 text-amber-700",
  Overdue: "bg-red-100 text-red-700",
};

export default function RoomsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const token = (session as { token?: string })?.token ?? "";

  const [rooms, setRooms] = useState<Room[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<RoomType>("custom");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    const [roomsRes, userRes] = await Promise.all([
      fetch(`${API_URL}/api/rooms`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (roomsRes.ok) setRooms(await roomsRes.json());
    if (userRes.ok) {
      const u = await userRes.json();
      setIsAdmin(u.membership?.role === "admin");
    }
  }

  useEffect(() => { load(); }, [token]);

  async function addRoom() {
    if (!newName.trim()) return;
    setSaving(true);
    await fetch(`${API_URL}/api/rooms`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), type: newType }),
    });
    setNewName("");
    setNewType("custom");
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function deleteRoom(id: string) {
    setDeleting(id);
    await fetch(`${API_URL}/api/rooms/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setDeleting(null);
    load();
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-xl leading-none">←</button>
            <h1 className="font-bold text-gray-900">Rooms</h1>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="text-sm text-indigo-600 font-semibold hover:text-indigo-800"
            >
              {showForm ? "Cancel" : "+ Add room"}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Add room form */}
        {showForm && isAdmin && (
          <div className="bg-white rounded-2xl border border-indigo-100 px-4 py-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">New room</h2>
            <input
              type="text"
              placeholder="Room name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as RoomType)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {ROOM_TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
            <button
              onClick={addRoom}
              disabled={saving || !newName.trim()}
              className="w-full bg-indigo-600 text-white rounded-xl py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Adding…" : "Add room"}
            </button>
          </div>
        )}

        {/* Room list */}
        {rooms.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center">
            <p className="text-sm text-gray-400">No rooms yet.{isAdmin ? " Add one above." : ""}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {rooms.map((room) => (
              <div key={room.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{room.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400 capitalize">{room.type}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[room.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {room.status}
                    </span>
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => deleteRoom(room.id)}
                    disabled={deleting === room.id}
                    className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50 transition-colors"
                  >
                    {deleting === room.id ? "…" : "Remove"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
