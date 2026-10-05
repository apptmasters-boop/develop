import Link from "next/link";
import { House, Search } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";

export type Viewer = { name: string; token: string } | null;

const NAV = [
  { href: "/", label: "Find a Home" },
  { href: "/home", label: "My Home" },
  { href: "/feed", label: "Community" },
  { href: "/#more", label: "Grow" },
];

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-pine-800">
      <House className="h-8 w-8 fill-pine-700 text-pine-700" strokeWidth={1.5} aria-hidden />
      <span className="text-[15px] font-bold leading-[1.05]">
        Apartment
        <br />
        Masters
      </span>
    </Link>
  );
}

export function SiteHeader({ viewer, active = "/" }: { viewer: Viewer; active?: string }) {
  const initials = viewer?.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav className="hidden h-full items-center gap-7 md:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex h-full items-center border-b-2 text-sm font-medium transition-colors ${
                active === item.href
                  ? "border-pine-700 text-pine-800"
                  : "border-transparent text-gray-600 hover:text-pine-700"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/listings"
            aria-label="Search listings"
            className="hidden rounded-full p-2 text-gray-700 hover:bg-gray-100 md:block"
          >
            <Search className="h-5 w-5" />
          </Link>
          {viewer ? (
            <>
              <NotificationBell token={viewer.token} />
              <Link
                href="/settings/profile"
                aria-label="Your profile"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-pine-100 text-sm font-semibold text-pine-800"
              >
                {initials}
              </Link>
            </>
          ) : (
            <Link
              href="/auth/signin"
              className="rounded-full bg-pine-700 px-4 py-2 text-sm font-semibold text-white hover:bg-pine-800"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
