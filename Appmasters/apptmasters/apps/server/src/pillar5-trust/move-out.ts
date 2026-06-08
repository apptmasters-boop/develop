import type { FastifyInstance } from "fastify";
import { db } from "../db";
import { moveOutChecklists, moveOutChecklistItems, rooms } from "../db/schema";
import { eq, and } from "drizzle-orm";
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

const DEFAULT_CHECKLIST_ITEMS = [
  "Clean oven and stovetop",
  "Clean refrigerator inside/out",
  "Clean bathroom tiles and grout",
  "Clean toilet and sink",
  "Vacuum and mop all floors",
  "Wipe down all walls and baseboards",
  "Clean all windows inside",
  "Remove all personal belongings",
  "Return all keys",
  "Check all lightbulbs working",
  "Test smoke detectors",
  "Document any damage with photos",
];

export async function moveOutRoutes(app: FastifyInstance) {
  // GET /api/move-out — get my checklist (or create one)
  app.get("/", async (request, reply) => {
    const m = await getMembership(app, request as never);
    if (!m) return reply.status(401).send({ error: "Unauthorized" });

    let checklist = await db.query.moveOutChecklists.findFirst({
      where: and(
        eq(moveOutChecklists.apartmentId, m.apartmentId),
        eq(moveOutChecklists.userId, m.sub),
      ),
      with: { items: { with: { room: true } } },
    });

    if (!checklist) {
      const [newChecklist] = await db.insert(moveOutChecklists).values({
        id: randomUUID(),
        apartmentId: m.apartmentId,
        userId: m.sub,
      }).returning();

      const roomList = await db.query.rooms.findMany({
        where: eq(rooms.apartmentId, m.apartmentId),
      });

      const itemValues = DEFAULT_CHECKLIST_ITEMS.map((label, i) => ({
        id: randomUUID(),
        checklistId: newChecklist.id,
        roomId: null,
        label,
        status: "pending" as const,
        sortOrder: i,
      }));

      // Add per-room items
      roomList.forEach((room, ri) => {
        itemValues.push({
          id: randomUUID(),
          checklistId: newChecklist.id,
          roomId: room.id,
          label: `${room.name} — inspect for damage`,
          status: "pending" as const,
          sortOrder: DEFAULT_CHECKLIST_ITEMS.length + ri,
        });
      });

      await db.insert(moveOutChecklistItems).values(itemValues);

      checklist = await db.query.moveOutChecklists.findFirst({
        where: eq(moveOutChecklists.id, newChecklist.id),
        with: { items: { with: { room: true } } },
      }) as typeof checklist;
    }

    return checklist;
  });

  // PATCH /api/move-out/item/:itemId — update a checklist item
  app.patch<{
    Params: { itemId: string };
    Body: { status?: "pending" | "ok" | "needs_repair" | "missing"; notes?: string; photoUrl?: string };
  }>("/item/:itemId", async (request, reply) => {
    const m = await getMembership(app, request as never);
    if (!m) return reply.status(401).send({ error: "Unauthorized" });

    const item = await db.query.moveOutChecklistItems.findFirst({
      where: eq(moveOutChecklistItems.id, request.params.itemId),
      with: { checklist: true },
    });

    if (!item || (item.checklist as { userId: string }).userId !== m.sub) {
      return reply.status(404).send({ error: "Not found" });
    }

    const { status, notes, photoUrl } = request.body ?? {};
    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (photoUrl) updates.photoUrl = photoUrl;

    const [updated] = await db.update(moveOutChecklistItems)
      .set(updates)
      .where(eq(moveOutChecklistItems.id, request.params.itemId))
      .returning();

    return updated;
  });

  // PATCH /api/move-out — update checklist meta (scheduled date, notes, submit)
  app.patch<{
    Body: { scheduledDate?: string; notes?: string; submitted?: boolean };
  }>("/", async (request, reply) => {
    const m = await getMembership(app, request as never);
    if (!m) return reply.status(401).send({ error: "Unauthorized" });

    const checklist = await db.query.moveOutChecklists.findFirst({
      where: and(
        eq(moveOutChecklists.apartmentId, m.apartmentId),
        eq(moveOutChecklists.userId, m.sub),
      ),
    });
    if (!checklist) return reply.status(404).send({ error: "No checklist found" });

    const { scheduledDate, notes, submitted } = request.body ?? {};
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (scheduledDate) updates.scheduledDate = new Date(scheduledDate);
    if (notes !== undefined) updates.notes = notes;
    if (submitted !== undefined) updates.submitted = submitted;

    const [updated] = await db.update(moveOutChecklists)
      .set(updates)
      .where(eq(moveOutChecklists.id, checklist.id))
      .returning();

    return updated;
  });
}
