import Link from "next/link";
import { SearchX } from "lucide-react";
import { getViewer } from "@/lib/viewer";
import { getListings } from "@/lib/listings";
import { MarketplaceShell } from "@/components/marketplace/MarketplaceShell";
import { MarketplaceSearch } from "@/components/marketplace/MarketplaceSearch";
import { ListingGrid } from "@/components/marketplace/ListingCard";
import { parseSearchParams, toQueryString } from "@/components/marketplace/options";

export default async function ListingsPage({ searchParams }: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const search = parseSearchParams(searchParams);
  const query = toQueryString(search);
  const [viewer, results] = await Promise.all([getViewer(), getListings(query)]);

  return (
    <MarketplaceShell viewer={viewer} active="/listings">
      <section className="bg-gray-50 py-6 md:py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="mb-4 text-xl font-bold text-pine-900 sm:text-2xl">Find a home</h1>
          {/* key resets the form state when the URL changes */}
          <MarketplaceSearch key={query} initial={search} live />
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="mb-4 text-sm text-gray-600" aria-live="polite">
          {results.length} {results.length === 1 ? "home" : "homes"} found
        </p>
        {results.length ? (
          <ListingGrid listings={results} />
        ) : (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-200 px-6 py-14 text-center">
            <SearchX className="h-8 w-8 text-gray-400" aria-hidden />
            <p className="mt-3 font-medium text-gray-800">No homes match these filters</p>
            <p className="mt-1 text-sm text-gray-500">Try a different area, a later move-in date, or fewer filters.</p>
            <Link href="/listings" className="mt-4 text-sm font-semibold text-pine-700 hover:underline">
              Clear all filters
            </Link>
          </div>
        )}
      </main>
    </MarketplaceShell>
  );
}
