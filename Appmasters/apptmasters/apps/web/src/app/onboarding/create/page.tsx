"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function CreateApartmentPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [rooms, setRooms] = useState([
    { name: "Kitchen", type: "kitchen" },
    { name: "Living Room", type: "living" },
    { name: "Bathroom", type: "bathroom" },
  ]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const token = (session as { token?: string })?.token;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/apartment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Failed to create apartment");
        setLoading(false);
        return;
      }

      const data = await res.json();

      // Add the default rooms
      await Promise.all(
        rooms.map((room) =>
          fetch(`${API_URL}/api/rooms`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(room),
          })
        )
      );

      setInviteCode(data.inviteCode);
    } catch {
      setError("Something went wrong.");
    }
    setLoading(false);
  }

  function copyCode() {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (inviteCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-gray-900">Apartment created!</h2>
          <p className="text-sm text-gray-500 mt-2 mb-6">Share this code with your roommates:</p>
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <p className="text-3xl font-mono font-bold tracking-widest text-brand">{inviteCode}</p>
          </div>
          <button
            onClick={copyCode}
            className="w-full border border-brand text-brand rounded-lg py-2 text-sm font-medium hover:bg-brand/5 transition-colors mb-3"
          >
            {copied ? "Copied!" : "Copy Code"}
          </button>
          <button
            onClick={() => router.push("/home")}
            className="w-full bg-brand text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-dark transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Create your apartment</h1>
          <p className="text-sm text-gray-500 mt-1">You can always change the name later.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Apartment name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="e.g. The Riverside Flat"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Starting rooms</label>
            <p className="text-xs text-gray-400 mb-3">You can add or edit rooms later.</p>
            <div className="space-y-2">
              {rooms.map((room, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={room.name}
                    onChange={(e) => {
                      const next = [...rooms];
                      next[i] = { ...next[i], name: e.target.value };
                      setRooms(next);
                    }}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                  <button
                    type="button"
                    onClick={() => setRooms(rooms.filter((_, j) => j !== i))}
                    className="text-gray-400 hover:text-red-400 transition-colors text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setRooms([...rooms, { name: "", type: "custom" }])}
                className="text-sm text-brand hover:underline"
              >
                + Add room
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full bg-brand text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create Apartment"}
          </button>
        </form>
      </div>
    </div>
  );
}
