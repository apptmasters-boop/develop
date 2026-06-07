"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const DIETARY_OPTIONS = [
  { key: "vegan", label: "Vegan", emoji: "🌱" },
  { key: "vegetarian", label: "Vegetarian", emoji: "🥦" },
  { key: "gluten-free", label: "Gluten-free", emoji: "🌾" },
  { key: "dairy-free", label: "Dairy-free", emoji: "🥛" },
  { key: "nut-free", label: "Nut-free", emoji: "🥜" },
  { key: "halal", label: "Halal", emoji: "☪️" },
  { key: "kosher", label: "Kosher", emoji: "✡️" },
] as const;

type Profile = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  color: string;
  membership: { role: string; dietaryFlags: string[] } | null;
};

export default function ProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const token = (session as { token?: string })?.token ?? "";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [dietary, setDietary] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data: Profile) => {
        setProfile(data);
        setName(data.name);
        setDietary(data.membership?.dietaryFlags ?? []);
      });
  }, [token]);

  function toggleDietary(key: string) {
    setDietary((prev) =>
      prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key]
    );
  }

  async function save() {
    setSaving(true);
    await fetch(`${API_URL}/api/users/me`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name, dietaryFlags: dietary }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-xl leading-none">←</button>
          <h1 className="font-bold text-gray-900">Profile</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shrink-0"
            style={{ backgroundColor: profile.color ?? "#6366f1" }}
          >
            {name[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{profile.email}</p>
            <p className="text-xs text-gray-400 capitalize">{profile.membership?.role ?? "member"}</p>
          </div>
        </div>

        {/* Name */}
        <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Display name</h2>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Dietary flags */}
        <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Dietary preferences</h2>
          <div className="flex flex-wrap gap-2">
            {DIETARY_OPTIONS.map((opt) => {
              const active = dietary.includes(opt.key);
              return (
                <button
                  key={opt.key}
                  onClick={() => toggleDietary(opt.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    active
                      ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-medium"
                      : "bg-gray-50 border-gray-200 text-gray-500"
                  }`}
                >
                  <span>{opt.emoji}</span> {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Save */}
        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-indigo-600 text-white rounded-2xl py-3 font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saved ? "Saved ✓" : saving ? "Saving…" : "Save changes"}
        </button>
      </main>
    </div>
  );
}
