import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight, Users, HeartHandshake, House, Sprout, ShieldCheck,
  IdCard, Phone, MapPin, UsersRound, Lock, MessagesSquare, type LucideIcon,
} from "lucide-react";

const COMMUNITY: {
  title: string; body: string; icon: LucideIcon; iconBg: string; cardBg: string; href?: string;
}[] = [
  {
    title: "Build Friendships",
    body: "Connect with people from your community and make lasting friendships.",
    icon: Users, iconBg: "bg-green-700", cardBg: "bg-green-50/60", href: "/feed",
  },
  {
    title: "Get Mentorship",
    body: "Learn from experienced community members about housing, finances, and more.",
    icon: HeartHandshake, iconBg: "bg-violet-400", cardBg: "bg-violet-50/60",
  },
  {
    title: "Find Support",
    body: "Get help with shared expenses, house rules, and any challenges that come up.",
    icon: House, iconBg: "bg-amber-400", cardBg: "bg-amber-50/60", href: "/home",
  },
  {
    title: "Grow Your Future",
    body: "Build your rental history, save money, and work toward your own place.",
    icon: Sprout, iconBg: "bg-blue-500", cardBg: "bg-blue-50/60",
  },
];

export function SectionHeading({ title, subtitle, link }: {
  title: string; subtitle: string; link?: { href: string; label: string };
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold text-pine-900 sm:text-2xl">{title}</h2>
        <p className="mt-1 text-xs text-gray-500 sm:text-sm">{subtitle}</p>
      </div>
      {link && (
        <Link href={link.href} className="flex shrink-0 items-center gap-1 text-xs font-semibold text-pine-700 hover:underline sm:text-sm">
          {link.label} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}

export function CommunityCards() {
  return (
    <section id="more" className="scroll-mt-20">
      <SectionHeading
        title="More Than Just a Place"
        subtitle="You're not just finding a room. You're joining a community."
        link={{ href: "/feed", label: "Explore the community" }}
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {COMMUNITY.map(({ title, body, icon: Icon, iconBg, cardBg, href }) => {
          const inner = (
            <>
              <span className={`flex h-10 w-10 items-center justify-center rounded-full text-white sm:h-12 sm:w-12 ${iconBg}`}>
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
              </span>
              <h3 className="mt-3 text-sm font-semibold text-pine-900 sm:mt-5 sm:text-base">{title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-gray-600 sm:text-sm">{body}</p>
              {href && (
                <span className="mt-auto pt-4 text-gray-800">
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </span>
              )}
            </>
          );
          const cls = `flex h-full flex-col rounded-xl border border-gray-100 p-4 sm:p-6 ${cardBg}`;
          return href ? (
            <Link key={title} href={href} className={`${cls} transition-shadow hover:shadow-md`}>
              {inner}
            </Link>
          ) : (
            <div key={title} className={cls}>{inner}</div>
          );
        })}
      </div>
    </section>
  );
}

const SAFETY: { label: string; icon: LucideIcon }[] = [
  { label: "Identity verified", icon: IdCard },
  { label: "Phone verified", icon: Phone },
  { label: "Address verified", icon: MapPin },
  { label: "Community member", icon: UsersRound },
  { label: "Secure communication", icon: Lock },
  { label: "Dispute resolution", icon: MessagesSquare },
];

export function SafetySection() {
  return (
    <section className="overflow-hidden rounded-2xl bg-pine-50/70 ring-1 ring-pine-100 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,0.9fr)]">
      <div className="relative hidden md:block">
        <Image src="/landing/skyline.jpg" alt="" fill sizes="33vw" className="object-cover" />
      </div>
      <div className="flex gap-3 p-5 sm:p-8">
        <ShieldCheck className="h-7 w-7 shrink-0 fill-pine-800 text-white" aria-hidden />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-pine-700">Safety is not negotiable</p>
          <h2 className="mt-1.5 text-lg font-bold text-pine-900 sm:text-xl">Your safety, our priority.</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Every listing and member is verified. We provide secure messaging, clear house rules, and a dispute
            resolution process so you can feel confident and supported.
          </p>
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-pine-100 p-5 text-xs text-gray-700 sm:p-8 md:grid-cols-1 md:border-l md:border-t-0">
        {SAFETY.map(({ label, icon: Icon }) => (
          <li key={label} className="flex items-center gap-2.5">
            <Icon className="h-4 w-4 shrink-0 text-pine-800" aria-hidden />
            {label}
          </li>
        ))}
      </ul>
    </section>
  );
}

// PLACEHOLDER figures from the design mockup — replace with real numbers before launch
const STATS = [
  { value: "10K+", label: "Active members" },
  { value: "3K+", label: "Homes listed" },
  { value: "95%", label: "Feel safer with our verification" },
];

export function CtaBand() {
  return (
    <section className="bg-pine-900 text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 px-4 py-10 sm:px-6 md:flex-row md:justify-between lg:px-8">
        <div className="text-center md:flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-pine-200">Ready to find your next home?</p>
          <p className="mt-2 text-lg font-semibold sm:text-xl">Join a community that feels like home.</p>
          <Link
            href="/listings"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-pine-800 hover:bg-pine-50"
          >
            Find a Home <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <dl className="grid w-full grid-cols-3 divide-x divide-white/20 text-center md:w-auto">
          {STATS.map((s) => (
            <div key={s.label} className="px-3 sm:px-6">
              <dt className="sr-only">{s.label}</dt>
              <dd className="text-xl font-bold sm:text-2xl">{s.value}</dd>
              <dd className="mt-1 text-[11px] leading-snug text-pine-100 sm:text-xs">{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
