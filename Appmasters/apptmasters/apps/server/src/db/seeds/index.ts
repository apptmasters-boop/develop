import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, users, listings } from "../index";
import { generateId } from "../../lib/id";

// Placeholder marketplace data matching the landing-page mockups.
// Safe to re-run: the demo owner's listings are replaced each time.

const DEMO_OWNER_EMAIL = "demo-owner@apptmasters.local";

type SeedListing = Omit<typeof listings.$inferInsert, "id" | "ownerUserId">;

const seedListings: SeedListing[] = [
  {
    title: "Sunny private room near the 7 train",
    listingType: "private_room",
    neighborhood: "Queens", city: "New York", state: "NY",
    priceCents: 85000, sharedExpensesCents: 7000,
    roommatesCount: 3, bathroomsCount: 2, maxOccupants: 1,
    availableFrom: new Date("2026-11-01"), minStayMonths: 3,
    photos: ["/landing/listing-1.jpg"], verified: true,
    tags: ["verified_people", "quiet_home", "furnished"],
    ratingAvg: 4.9, staysCount: 12,
  },
  {
    title: "Shared room in a friendly Brooklyn apartment",
    listingType: "shared_room",
    neighborhood: "Brooklyn", city: "New York", state: "NY",
    priceCents: 72000, sharedExpensesCents: 7000,
    roommatesCount: 4, bathroomsCount: 2, maxOccupants: 1,
    availableFrom: new Date("2026-11-15"), minStayMonths: 3,
    photos: ["/landing/listing-2.jpg"], verified: true,
    tags: ["verified_people", "affordable", "furnished", "same_language"],
    ratingAvg: 4.8, staysCount: 8,
  },
  {
    title: "Private room in a Manhattan community home",
    listingType: "private_room",
    neighborhood: "Manhattan", city: "New York", state: "NY",
    priceCents: 95000, sharedExpensesCents: 8000,
    roommatesCount: 2, bathroomsCount: 1, maxOccupants: 1,
    availableFrom: new Date("2026-12-01"), minStayMonths: 6,
    photos: ["/landing/listing-3.jpg"], verified: false,
    tags: ["community_match", "utilities_included"],
    ratingAvg: 5.0, staysCount: 15,
  },
  {
    title: "Room in a bright Astoria apartment",
    listingType: "room_in_apartment",
    neighborhood: "Astoria", city: "New York", state: "NY",
    priceCents: 78000, sharedExpensesCents: 6500,
    roommatesCount: 3, bathroomsCount: 2, maxOccupants: 2,
    availableFrom: new Date("2026-11-10"), minStayMonths: 3,
    photos: ["/landing/listing-4.jpg"], verified: true,
    tags: ["verified_people", "quiet_home", "utilities_included"],
    ratingAvg: 4.7, staysCount: 10,
  },
  {
    title: "Community home with shared dinners",
    listingType: "community_home",
    neighborhood: "Harlem", city: "New York", state: "NY",
    priceCents: 69000, sharedExpensesCents: 5000,
    roommatesCount: 5, bathroomsCount: 2, maxOccupants: 1,
    availableFrom: new Date("2026-11-20"), minStayMonths: 3,
    photos: ["/landing/listing-2.jpg"], verified: true,
    tags: ["verified_people", "community_match", "affordable", "furnished"],
    ratingAvg: 4.6, staysCount: 6,
  },
  {
    title: "Looking for a roommate to share a 2-bedroom",
    listingType: "roommate_wanted",
    neighborhood: "Bushwick", city: "New York", state: "NY",
    priceCents: 80000, sharedExpensesCents: 6000,
    roommatesCount: 1, bathroomsCount: 1, maxOccupants: 1,
    availableFrom: new Date("2026-12-15"), minStayMonths: 12,
    photos: ["/landing/listing-1.jpg"], verified: false,
    tags: ["same_language", "quiet_home"],
    ratingAvg: null, staysCount: null,
  },
  {
    title: "Affordable shared room, utilities included",
    listingType: "shared_room",
    neighborhood: "Jackson Heights", city: "New York", state: "NY",
    priceCents: 65000, sharedExpensesCents: 0,
    roommatesCount: 3, bathroomsCount: 1, maxOccupants: 1,
    availableFrom: new Date("2026-10-25"), minStayMonths: 1,
    photos: ["/landing/listing-4.jpg"], verified: true,
    tags: ["verified_people", "affordable", "utilities_included", "same_language"],
    ratingAvg: 4.5, staysCount: 4,
  },
];

async function main() {
  let owner = await db.query.users.findFirst({ where: eq(users.email, DEMO_OWNER_EMAIL) });
  if (!owner) {
    // Random password: the demo owner is not meant to sign in
    const passwordHash = await bcrypt.hash(randomBytes(24).toString("hex"), 10);
    const id = generateId();
    await db.insert(users).values({ id, email: DEMO_OWNER_EMAIL, name: "Demo Owner", passwordHash });
    owner = await db.query.users.findFirst({ where: eq(users.id, id) });
  }

  await db.delete(listings).where(eq(listings.ownerUserId, owner!.id));
  await db.insert(listings).values(
    seedListings.map((l) => ({ ...l, id: generateId(), ownerUserId: owner!.id }))
  );
  console.log(`Seeded ${seedListings.length} listings`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
