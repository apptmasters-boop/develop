"use client";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MapPin, CalendarDays, Clock3, UserRound, Search, ChevronDown, type LucideIcon } from "lucide-react";
import type { ListingTag, ListingType } from "@apptmasters/types";
import {
  LOOKING_FOR, MATTERS, STAY_OPTIONS, GUEST_OPTIONS, toQueryString, type SearchState,
} from "./options";

function Field({ icon: Icon, label, htmlFor, children, className = "" }: {
  icon: LucideIcon; label: string; htmlFor: string; children: ReactNode; className?: string;
}) {
  return (
    <div
      className={`relative flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 focus-within:border-pine-500 focus-within:ring-2 focus-within:ring-pine-100 ${className}`}
    >
      <Icon className="h-5 w-5 shrink-0 text-gray-700" aria-hidden />
      <div className="min-w-0 flex-1">
        <label htmlFor={htmlFor} className="block text-[11px] leading-4 text-gray-500">
          {label}
        </label>
        {children}
      </div>
    </div>
  );
}

const control = "w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400";

function Select({ id, value, onChange, options }: {
  id: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${control} cursor-pointer appearance-none pr-6`}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden />
    </div>
  );
}

function Chip({ selected, onClick, icon: Icon, children }: {
  selected: boolean; onClick: () => void; icon: LucideIcon; children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium transition-colors sm:text-[13px] ${
        selected
          ? "border-pine-800 bg-pine-800 text-white"
          : "border-gray-200 bg-white text-gray-800 hover:border-pine-500"
      }`}
    >
      <Icon className={`h-4 w-4 ${selected ? "text-white" : "text-pine-800"}`} aria-hidden />
      {children}
    </button>
  );
}

/**
 * Search bar + "I'm looking for" + "What matters to you?" chips.
 * live=false (landing): chips only change the selection; Search navigates.
 * live=true (/listings): chip changes apply immediately.
 */
export function MarketplaceSearch({ initial, live = false }: { initial: SearchState; live?: boolean }) {
  const router = useRouter();
  const [s, setS] = useState<SearchState>(initial);
  const today = new Date().toISOString().slice(0, 10);

  function go(next: SearchState) {
    router.push(`/listings${toQueryString(next)}`);
  }

  function update(patch: Partial<SearchState>, applyNow = false) {
    const next = { ...s, ...patch };
    setS(next);
    if (applyNow && live) go(next);
  }

  const toggleType = (t: ListingType) => update({ type: s.type === t ? "" : t }, true);
  const toggleTag = (t: ListingTag) =>
    update({ tags: s.tags.includes(t) ? s.tags.filter((x) => x !== t) : [...s.tags, t] }, true);

  return (
    <div>
      <form
        role="search"
        onSubmit={(e) => { e.preventDefault(); go(s); }}
        className="grid grid-cols-2 gap-2.5 rounded-2xl bg-white p-3 shadow-[0_8px_30px_rgba(0,0,0,0.08)] ring-1 ring-black/5 sm:p-4 md:grid-cols-[1.6fr_1.2fr_1fr_1fr_auto] md:gap-2"
      >
        <Field icon={MapPin} label="Where are you going?" htmlFor="ms-city" className="col-span-2 md:col-span-1">
          <input
            id="ms-city"
            value={s.city}
            onChange={(e) => update({ city: e.target.value })}
            placeholder="City or neighborhood"
            autoComplete="address-level2"
            className={control}
          />
        </Field>
        <Field icon={CalendarDays} label="Move-in date" htmlFor="ms-movein">
          <input
            id="ms-movein"
            type="date"
            min={today}
            value={s.moveIn}
            onChange={(e) => update({ moveIn: e.target.value })}
            className={`${control} [&::-webkit-calendar-picker-indicator]:opacity-60`}
          />
        </Field>
        <Field icon={Clock3} label="Stay for" htmlFor="ms-stay">
          <Select id="ms-stay" value={s.stay} onChange={(v) => update({ stay: v })} options={STAY_OPTIONS} />
        </Field>
        <Field icon={UserRound} label="Who's coming?" htmlFor="ms-guests" className="col-span-2 md:col-span-1">
          <Select id="ms-guests" value={s.guests} onChange={(v) => update({ guests: v })} options={GUEST_OPTIONS} />
        </Field>
        <button
          type="submit"
          className="col-span-2 flex items-center justify-center gap-2 rounded-full bg-pine-700 px-7 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-pine-800 md:col-span-1"
        >
          <Search className="h-4 w-4" aria-hidden />
          Search
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
        <h2 className="shrink-0 text-sm font-semibold text-pine-900 md:text-[15px]">I&apos;m looking for...</h2>
        <div className="flex flex-wrap gap-2">
          {LOOKING_FOR.map((o) => (
            <Chip key={o.value} icon={o.icon} selected={s.type === o.value} onClick={() => toggleType(o.value)}>
              {o.label}
            </Chip>
          ))}
        </div>
      </div>

      <h2 className="mt-7 text-base font-semibold text-pine-900 md:text-lg">What matters to you?</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {MATTERS.map((o) => (
          <Chip key={o.value} icon={o.icon} selected={s.tags.includes(o.value)} onClick={() => toggleTag(o.value)}>
            {o.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}
