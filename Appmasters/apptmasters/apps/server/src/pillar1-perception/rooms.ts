import type { FastifyInstance } from "fastify";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db, rooms, apartmentMembers } from "../db";
import { generateId } from "../lib/id";
import { requireAuth, type JwtPayload } from "../auth/middleware";

const roomTypeValues = ["kitchen", "living", "bathroom", "hallway", "balcony", "laundry", "custom"] as const;

const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(roomTypeValues),
});

async function getMembership(userId: string) {
  return db.query.apartmentMembers.findFirst({
    where: eq(apartmentMembers.userId, userId),
  });
}

export async function roomRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    return db.query.rooms.findMany({
      where: eq(rooms.apartmentId, membership.apartmentId),
    });
  });

  app.post("/", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    const body = createRoomSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const id = generateId();
    await db.insert(rooms).values({
      id,
      apartmentId: membership.apartmentId,
      name: body.data.name,
      type: body.data.type,
    });
    return { id, name: body.data.name, type: body.data.type };
  });

  app.patch("/:roomId", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const { roomId } = req.params as { roomId: string };
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    const body = z
      .object({
        name: z.string().min(1).max(100).optional(),
        status: z.enum(["Clean", "Acceptable", "NeedsAttention", "Overdue"]).optional(),
        lastCleanedAt: z.string().datetime().optional(),
      })
      .safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const room = await db.query.rooms.findFirst({
      where: and(eq(rooms.id, roomId), eq(rooms.apartmentId, membership.apartmentId)),
    });
    if (!room) return reply.status(404).send({ error: "Room not found" });

    const updates: Record<string, unknown> = {};
    if (body.data.name) updates.name = body.data.name;
    if (body.data.status) updates.status = body.data.status;
    if (body.data.lastCleanedAt) updates.lastCleanedAt = new Date(body.data.lastCleanedAt);

    await db.update(rooms).set(updates).where(eq(rooms.id, roomId));
    return { success: true };
  });

  app.delete("/:roomId", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const { roomId } = req.params as { roomId: string };
    const membership = await getMembership(payload.userId);
    if (!membership || membership.role !== "admin") {
      return reply.status(403).send({ error: "Admin only" });
    }

    await db
      .delete(rooms)
      .where(and(eq(rooms.id, roomId), eq(rooms.apartmentId, membership.apartmentId)));
    return { success: true };
  });
}
