import Link from "next/link";
import { House, Search, CirclePlus, Users, UserRound } from "lucide-react";

const ITEMS = [
  { href: "/", label: "Home", icon: House },
  { href: "/listings", label: "Search", icon: Search },
  // Listing creation is not built yet
  { href: null, label: "List a Space", icon: CirclePlus },
  { href: "/feed", label: "Community", icon: Users },
  { href: "/settings/profile", label: "Profile", icon: UserRound },
];

export function MobileBottomNav({ active }: { active: string }) {
  return (
    <nav
      aria-label="Bottom"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-gray-100 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const cls = "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px]";
        if (!href) {
          return (
            <span key={label} className={`${cls} text-gray-300`} aria-disabled title="Coming soon">
              <Icon className="h-5 w-5" />
              {label}
            </span>
          );
        }
        const on = active === href;
        return (
          <Link
            key={label}
            href={href}
            aria-current={on ? "page" : undefined}
            className={`${cls} ${on ? "font-semibold text-pine-700" : "text-gray-500"}`}
          >
            <Icon className={`h-5 w-5 ${on ? "fill-pine-100" : ""}`} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
