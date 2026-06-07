import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

const SETTINGS_ITEMS = [
  { href: "/settings/profile", icon: "👤", label: "Profile", description: "Edit your name and dietary preferences" },
  { href: "/settings/rooms", icon: "🏠", label: "Rooms", description: "Add, remove, and manage apartment rooms" },
  { href: "/settings/members", icon: "👥", label: "Members", description: "View and manage roommates" },
  { href: "/settings/notifications", icon: "🔔", label: "Notifications", description: "Control what you get notified about" },
];

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="font-bold text-gray-900">Settings</h1>
          <Link href="/home" className="text-sm text-indigo-600 hover:underline">← Home</Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {SETTINGS_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-xl shrink-0">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{item.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
              </div>
              <span className="text-gray-300 group-hover:text-indigo-400 transition-colors">→</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
