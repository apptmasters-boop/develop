import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { NotificationPrefsForm } from "./NotificationPrefsForm";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

export default async function NotificationSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");
  const token = (session as { token?: string }).token ?? "";

  let prefs = null;
  try {
    const res = await fetch(`${API_URL}/api/notifications/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.ok) prefs = await res.json();
  } catch {}

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900">Notification Settings</h1>
            <p className="text-xs text-gray-400">Control what you get notified about</p>
          </div>
          <a href="/home" className="text-sm text-brand hover:underline">← Home</a>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">
        <NotificationPrefsForm prefs={prefs} token={token} />
      </main>
    </div>
  );
}
