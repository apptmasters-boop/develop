import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, users, apartmentMembers } from "../db";
import { requireAuth, type JwtPayload } from "./middleware";

const DIETARY_OPTIONS = ["vegan", "vegetarian", "gluten-free", "dairy-free", "nut-free", "halal", "kosher"] as const;

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  dietaryFlags: z.array(z.enum(DIETARY_OPTIONS)).optional(),
});

export async function userRoutes(app: FastifyInstance) {
  app.get("/me", { preHandler: [requireAuth] }, async (req) => {
    const payload = req.user as JwtPayload;
    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.userId),
      columns: { id: true, email: true, name: true, avatarUrl: true, color: true },
    });
    if (!user) return { error: "Not found" };

    const membership = await db.query.apartmentMembers.findFirst({
      where: eq(apartmentMembers.userId, payload.userId),
      columns: { role: true, dietaryFlags: true, vacationMode: true, moveInDate: true },
    });

    return { ...user, membership: membership ?? null };
  });

  app.patch("/me", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const body = updateSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const { dietaryFlags, ...userFields } = body.data;

    if (Object.keys(userFields).length > 0) {
      await db.update(users).set(userFields).where(eq(users.id, payload.userId));
    }

    if (dietaryFlags !== undefined) {
      await db
        .update(apartmentMembers)
        .set({ dietaryFlags })
        .where(eq(apartmentMembers.userId, payload.userId));
    }

    return { success: true };
  });
}
