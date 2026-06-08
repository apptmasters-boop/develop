import type { FastifyInstance } from "fastify";
import { db } from "../db";
import { inventoryItems } from "../db/schema";
import { eq, and, asc } from "drizzle-orm";
import { randomUUID } from "crypto";

async function getMembership(app: FastifyInstance, request: { headers: Record<string, string | string[] | undefined> }) {
  const auth = request.headers["authorization"] as string | undefined;
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    return app.jwt.verify<{ sub: string; apartmentId: string }>(auth.slice(7));
  } catch {
    return null;
  }
}

export async function inventoryRoutes(app: FastifyInstance) {
  // GET /api/inventory — list all items sorted by name
  app.get("/", async (request, reply) => {
    const m = await getMembership(app, request as never);
    if (!m) return reply.status(401).send({ error: "Unauthorized" });

    const items = await db.query.inventoryItems.findMany({
      where: eq(inventoryItems.apartmentId, m.apartmentId),
      orderBy: asc(inventoryItems.name),
      with: { addedBy: true },
    });

    return items.map((item) => ({
      ...item,
      lowStock: item.quantity <= item.lowStockThreshold,
      expired: item.expiresAt ? new Date(item.expiresAt) < new Date() : false,
      expiringSoon: item.expiresAt
        ? new Date(item.expiresAt) > new Date() &&
          new Date(item.expiresAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        : false,
    }));
  });

  // POST /api/inventory — add item
  app.post<{
    Body: {
      name: string;
      category?: string;
      quantity?: number;
      unit?: string;
      lowStockThreshold?: number;
      expiresAt?: string;
      photoUrl?: string;
    };
  }>("/", async (request, reply) => {
    const m = await getMembership(app, request as never);
    if (!m) return reply.status(401).send({ error: "Unauthorized" });

    const { name, category, quantity, unit, lowStockThreshold, expiresAt, photoUrl } = request.body ?? {};
    if (!name?.trim()) return reply.status(400).send({ error: "name required" });

    const [item] = await db.insert(inventoryItems).values({
      id: randomUUID(),
      apartmentId: m.apartmentId,
      addedByUserId: m.sub,
      name: name.trim(),
      category: category ?? "other",
      quantity: quantity ?? 1,
      unit: unit ?? "units",
      lowStockThreshold: lowStockThreshold ?? 1,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      photoUrl: photoUrl ?? null,
    }).returning();

    return item;
  });

  // PATCH /api/inventory/:id — update item (quantity, expiry, etc.)
  app.patch<{
    Params: { id: string };
    Body: {
      quantity?: number;
      name?: string;
      category?: string;
      unit?: string;
      lowStockThreshold?: number;
      expiresAt?: string | null;
      photoUrl?: string;
    };
  }>("/:id", async (request, reply) => {
    const m = await getMembership(app, request as never);
    if (!m) return reply.status(401).send({ error: "Unauthorized" });

    const item = await db.query.inventoryItems.findFirst({
      where: and(eq(inventoryItems.id, request.params.id), eq(inventoryItems.apartmentId, m.apartmentId)),
    });
    if (!item) return reply.status(404).send({ error: "Not found" });

    const { quantity, name, category, unit, lowStockThreshold, expiresAt, photoUrl } = request.body ?? {};
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (quantity !== undefined) updates.quantity = quantity;
    if (name) updates.name = name.trim();
    if (category) updates.category = category;
    if (unit) updates.unit = unit;
    if (lowStockThreshold !== undefined) updates.lowStockThreshold = lowStockThreshold;
    if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (photoUrl) updates.photoUrl = photoUrl;

    const [updated] = await db.update(inventoryItems).set(updates).where(eq(inventoryItems.id, request.params.id)).returning();
    return updated;
  });

  // PATCH /api/inventory/:id/adjust — increment/decrement quantity
  app.patch<{ Params: { id: string }; Body: { delta: number } }>("/:id/adjust", async (request, reply) => {
    const m = await getMembership(app, request as never);
    if (!m) return reply.status(401).send({ error: "Unauthorized" });

    const item = await db.query.inventoryItems.findFirst({
      where: and(eq(inventoryItems.id, request.params.id), eq(inventoryItems.apartmentId, m.apartmentId)),
    });
    if (!item) return reply.status(404).send({ error: "Not found" });

    const newQty = Math.max(0, item.quantity + (request.body?.delta ?? 0));
    const [updated] = await db.update(inventoryItems)
      .set({ quantity: newQty, updatedAt: new Date() })
      .where(eq(inventoryItems.id, request.params.id))
      .returning();
    return updated;
  });

  // DELETE /api/inventory/:id — remove item
  app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const m = await getMembership(app, request as never);
    if (!m) return reply.status(401).send({ error: "Unauthorized" });

    const item = await db.query.inventoryItems.findFirst({
      where: and(eq(inventoryItems.id, request.params.id), eq(inventoryItems.apartmentId, m.apartmentId)),
    });
    if (!item) return reply.status(404).send({ error: "Not found" });

    await db.delete(inventoryItems).where(eq(inventoryItems.id, request.params.id));
    return { ok: true };
  });
}
