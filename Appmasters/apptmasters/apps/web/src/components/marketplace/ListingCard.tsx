import Image from "next/image";
import { Users, CalendarCheck, Star, ShieldCheck, UsersRound, UserRound } from "lucide-react";
import type { Listing } from "@apptmasters/types";
import { TYPE_LABEL } from "./options";

const AVATAR_TINTS = ["bg-amber-200", "bg-rose-200", "bg-sky-200"];

function dollars(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

function Badge({ listing }: { listing: Listing }) {
  if (listing.verified) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-medium text-pine-800 shadow-sm">
        <ShieldCheck className="h-3.5 w-3.5 fill-pine-700 text-white" aria-hidden />
        Verified home
      </span>
    );
  }
  if (listing.listingType === "community_home" || listing.tags.includes("community_match")) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100/95 px-2 py-0.5 text-[11px] font-medium text-violet-800 shadow-sm">
        <UsersRound className="h-3.5 w-3.5" aria-hidden />
        Community home
      </span>
    );
  }
  return null;
}

export function ListingCard({ listing }: { listing: Listing }) {
  const photo = listing.photos[0] ?? "/landing/listing-1.jpg";
  const available = new Date(listing.availableFrom).toLocaleDateString("en-US", {
    month: "short", day: "numeric", timeZone: "UTC",
  });
  const shownAvatars = Math.min(listing.roommatesCount, 3);
  const extra = listing.roommatesCount - shownAvatars;

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="relative aspect-[16/11]">
        <Image src={photo} alt={listing.title} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" />
        <div className="absolute bottom-2 left-2">
          <Badge listing={listing} />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3 text-[11px] text-gray-600 sm:p-4 sm:text-xs">
        <p className="text-gray-500">
          <span className="text-lg font-bold text-pine-900 sm:text-xl">{dollars(listing.priceCents)}</span> / month
        </p>
        {listing.sharedExpensesCents > 0 && (
          <p className="text-gray-500">+ {dollars(listing.sharedExpensesCents)} est. shared expenses</p>
        )}

        <p className="mt-2.5 font-medium text-gray-800">
          {TYPE_LABEL[listing.listingType]} · {listing.neighborhood}, {listing.state}
        </p>
        <p className="mt-1.5 flex items-start gap-1.5">
          <Users className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            {listing.roommatesCount} roommate{listing.roommatesCount === 1 ? "" : "s"} · {listing.bathroomsCount} bathroom
            {listing.bathroomsCount === 1 ? "" : "s"}
          </span>
        </p>
        <p className="mt-1.5 flex items-start gap-1.5">
          <CalendarCheck className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>Available {available} · {listing.minStayMonths} month minimum</span>
        </p>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 pt-3">
          {/* Placeholder avatars until roommate profiles are linked to listings */}
          <div className="flex items-center -space-x-1.5" aria-label={`${listing.roommatesCount} roommates`}>
            {Array.from({ length: shownAvatars }, (_, i) => (
              <span key={i} className={`flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-white ${AVATAR_TINTS[i]}`}>
                <UserRound className="h-3.5 w-3.5 text-gray-600" aria-hidden />
              </span>
            ))}
            {extra > 0 && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold text-gray-700 ring-2 ring-white">
                +{extra}
              </span>
            )}
          </div>
          {/* Placeholder rating until reviews exist */}
          {listing.ratingAvg != null && (
            <span className="flex items-center gap-1 whitespace-nowrap text-gray-600">
              <Star className="h-3.5 w-3.5 fill-gray-800 text-gray-800" aria-hidden />
              {listing.ratingAvg.toFixed(1)}
              {listing.staysCount != null && <span className="text-gray-500"> ({listing.staysCount} stays)</span>}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export function ListingGrid({ listings }: { listings: Listing[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
      {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
    </div>
  );
}
