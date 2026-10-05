import Image from "next/image";
import { getViewer } from "@/lib/viewer";
import { getListings } from "@/lib/listings";
import { MarketplaceShell } from "@/components/marketplace/MarketplaceShell";
import { MarketplaceSearch } from "@/components/marketplace/MarketplaceSearch";
import { ListingGrid } from "@/components/marketplace/ListingCard";
import { CommunityCards, CtaBand, SafetySection, SectionHeading } from "@/components/marketplace/LandingSections";
import { parseSearchParams } from "@/components/marketplace/options";

export default async function LandingPage() {
  const [viewer, featured] = await Promise.all([getViewer(), getListings("?limit=4")]);

  return (
    <MarketplaceShell viewer={viewer} active="/">
      <section className="bg-gray-50 pb-10">
        <div className="relative h-[290px] sm:h-[340px] md:h-[400px]">
          <Image src="/landing/hero.png" alt="" fill priority sizes="100vw" className="object-cover object-[50%_58%] md:object-[50%_45%]" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/5" />
          <div className="relative mx-auto max-w-7xl px-4 pt-8 text-white sm:px-6 md:pt-14 lg:px-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/85 sm:text-xs">
              Apartment Masters
            </p>
            <h1 className="mt-3 max-w-[15ch] text-3xl font-bold leading-[1.1] sm:text-4xl md:text-5xl">
              Find a safe place with people you can trust.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/90 sm:text-base">
              Temporary housing. Real community.
              <br />
              A path to your independence.
            </p>
          </div>
        </div>

        <div className="relative z-10 mx-auto -mt-8 max-w-7xl px-4 sm:px-6 md:-mt-20 lg:px-8">
          <MarketplaceSearch initial={parseSearchParams({})} />
        </div>
      </section>

      <main className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 md:space-y-16 md:py-14 lg:px-8">
        <section>
          <SectionHeading
            title="Featured Listings"
            subtitle="Verified homes. Real people. Trusted communities."
            link={{ href: "/listings", label: "View all listings" }}
          />
          {featured.length ? (
            <ListingGrid listings={featured} />
          ) : (
            <p className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
              No listings yet. Check back soon.
            </p>
          )}
        </section>

        <CommunityCards />
        <SafetySection />
      </main>

      <CtaBand />
    </MarketplaceShell>
  );
}
