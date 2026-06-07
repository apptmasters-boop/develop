import type { FastifyInstance } from "fastify";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db, groceryItems, apartmentMembers } from "../db";
import { generateId } from "../lib/id";
import { requireAuth, type JwtPayload } from "../auth/middleware";

async function getMembership(userId: string) {
  return db.query.apartmentMembers.findFirst({
    where: eq(apartmentMembers.userId, userId),
  });
}

export async function groceryRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    const items = await db.query.groceryItems.findMany({
      where: eq(groceryItems.apartmentId, membership.apartmentId),
      with: {
        addedBy: { columns: { id: true, name: true } },
        checkedBy: { columns: { id: true, name: true } },
      },
      orderBy: (g, { asc, desc }) => [asc(g.checked), desc(g.createdAt)],
    });

    return items;
  });

  app.post("/", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    const body = z.object({
      name: z.string().min(1).max(200),
      quantity: z.string().max(50).optional(),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const id = generateId();
    await db.insert(groceryItems).values({
      id,
      apartmentId: membership.apartmentId,
      addedByUserId: payload.userId,
      name: body.data.name,
      quantity: body.data.quantity ?? null,
    });

    return { id, name: body.data.name };
  });

  app.patch("/:itemId/check", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const { itemId } = req.params as { itemId: string };
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    const item = await db.query.groceryItems.findFirst({ where: eq(groceryItems.id, itemId) });
    if (!item || item.apartmentId !== membership.apartmentId) {
      return reply.status(404).send({ error: "Item not found" });
    }

    const now = new Date();
    await db.update(groceryItems).set({
      checked: !item.checked,
      checkedByUserId: !item.checked ? payload.userId : null,
      checkedAt: !item.checked ? now : null,
    }).where(eq(groceryItems.id, itemId));

    return { success: true, checked: !item.checked };
  });

  app.delete("/:itemId", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const { itemId } = req.params as { itemId: string };
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    const item = await db.query.groceryItems.findFirst({ where: eq(groceryItems.id, itemId) });
    if (!item || item.apartmentId !== membership.apartmentId) {
      return reply.status(404).send({ error: "Item not found" });
    }
    if (item.addedByUserId !== payload.userId && membership.role !== "admin") {
      return reply.status(403).send({ error: "Not authorized" });
    }

    await db.delete(groceryItems).where(eq(groceryItems.id, itemId));
    return { success: true };
  });

  app.delete("/clear-checked", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    await db.delete(groceryItems).where(
      and(eq(groceryItems.apartmentId, membership.apartmentId), eq(groceryItems.checked, true))
    );
    return { success: true };
  });
}
