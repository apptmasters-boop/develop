import type { FastifyInstance } from "fastify";
import { eq, and, or, ilike, lte, gte, desc, arrayContains, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db, listings } from "../db";

const listingTypeValues = [
  "private_room", "shared_room", "room_in_apartment", "community_home", "roommate_wanted",
] as const;

const tagValues = [
  "verified_people", "community_match", "affordable", "quiet_home",
  "same_language", "furnished", "utilities_included",
] as const;

const searchSchema = z.object({
  // "New York, NY" → matches city or neighborhood on the part before the comma
  city: z.string().trim().max(100).optional(),
  moveIn: z.string().date().optional(),
  // Longest stay the searcher wants, in months; listing minimum must fit within it
  stay: z.coerce.number().int().min(1).max(120).optional(),
  guests: z.coerce.number().int().min(1).max(20).optional(),
  type: z.enum(listingTypeValues).optional(),
  tags: z.string().optional()
    .transform((s) => (s ? s.split(",").filter(Boolean) : []))
    .pipe(z.array(z.enum(tagValues))),
  limit: z.coerce.number().int().min(1).max(100).default(48),
});

// Public: the landing page and /listings are visible without signing in
export async function listingsRoutes(app: FastifyInstance) {
  app.get("/", async (req, reply) => {
    const query = searchSchema.safeParse(req.query);
    if (!query.success) return reply.status(400).send({ error: query.error.flatten() });
    const q = query.data;

    const filters: SQL[] = [eq(listings.status, "active")];
    const place = q.city?.split(",")[0].trim();
    if (place) {
      filters.push(or(ilike(listings.city, `%${place}%`), ilike(listings.neighborhood, `%${place}%`))!);
    }
    if (q.moveIn) filters.push(lte(listings.availableFrom, new Date(`${q.moveIn}T23:59:59`)));
    if (q.stay) filters.push(lte(listings.minStayMonths, q.stay));
    if (q.guests) filters.push(gte(listings.maxOccupants, q.guests));
    if (q.type) filters.push(eq(listings.listingType, q.type));
    if (q.tags.length) filters.push(arrayContains(listings.tags, q.tags));

    return db
      .select()
      .from(listings)
      .where(and(...filters))
      .orderBy(desc(listings.createdAt))
      .limit(q.limit);
  });

  app.get("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const listing = await db.query.listings.findFirst({
      where: and(eq(listings.id, id), eq(listings.status, "active")),
    });
    if (!listing) return reply.status(404).send({ error: "Listing not found" });
    return listing;
  });
}
