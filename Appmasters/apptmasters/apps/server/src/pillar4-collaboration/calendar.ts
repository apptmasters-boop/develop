import type { FastifyInstance } from "fastify";
import { eq, and, gte } from "drizzle-orm";
import { z } from "zod";
import { db, calendarEvents, apartmentMembers } from "../db";
import { generateId } from "../lib/id";
import { requireAuth, type JwtPayload } from "../auth/middleware";

async function getMembership(userId: string) {
  return db.query.apartmentMembers.findFirst({
    where: eq(apartmentMembers.userId, userId),
  });
}

export async function calendarRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    const query = req.query as { from?: string };
    const from = query.from ? new Date(query.from) : new Date();

    const events = await db.query.calendarEvents.findMany({
      where: and(
        eq(calendarEvents.apartmentId, membership.apartmentId),
        gte(calendarEvents.startAt, from)
      ),
      with: { createdBy: { columns: { id: true, name: true, color: true } } },
      orderBy: (e, { asc }) => [asc(e.startAt)],
    });

    return events;
  });

  app.post("/", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    const body = z.object({
      title: z.string().min(1).max(200),
      description: z.string().optional(),
      startAt: z.string().datetime(),
      endAt: z.string().datetime(),
      allDay: z.boolean().default(false),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const id = generateId();
    await db.insert(calendarEvents).values({
      id,
      apartmentId: membership.apartmentId,
      createdByUserId: payload.userId,
      title: body.data.title,
      description: body.data.description ?? null,
      startAt: new Date(body.data.startAt),
      endAt: new Date(body.data.endAt),
      allDay: body.data.allDay,
    });

    return { id, title: body.data.title };
  });

  app.patch("/:eventId", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const { eventId } = req.params as { eventId: string };
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    const event = await db.query.calendarEvents.findFirst({ where: eq(calendarEvents.id, eventId) });
    if (!event || event.apartmentId !== membership.apartmentId) {
      return reply.status(404).send({ error: "Event not found" });
    }
    if (event.createdByUserId !== payload.userId && membership.role !== "admin") {
      return reply.status(403).send({ error: "Not authorized" });
    }

    const body = z.object({
      title: z.string().min(1).max(200).optional(),
      description: z.string().optional().nullable(),
      startAt: z.string().datetime().optional(),
      endAt: z.string().datetime().optional(),
      allDay: z.boolean().optional(),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const updates: Record<string, unknown> = {};
    if (body.data.title) updates.title = body.data.title;
    if (body.data.description !== undefined) updates.description = body.data.description;
    if (body.data.startAt) updates.startAt = new Date(body.data.startAt);
    if (body.data.endAt) updates.endAt = new Date(body.data.endAt);
    if (body.data.allDay !== undefined) updates.allDay = body.data.allDay;

    await db.update(calendarEvents).set(updates).where(eq(calendarEvents.id, eventId));
    return { success: true };
  });

  app.delete("/:eventId", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const { eventId } = req.params as { eventId: string };
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    const event = await db.query.calendarEvents.findFirst({ where: eq(calendarEvents.id, eventId) });
    if (!event || event.apartmentId !== membership.apartmentId) {
      return reply.status(404).send({ error: "Event not found" });
    }
    if (event.createdByUserId !== payload.userId && membership.role !== "admin") {
      return reply.status(403).send({ error: "Not authorized" });
    }

    await db.delete(calendarEvents).where(eq(calendarEvents.id, eventId));
    return { success: true };
  });
}
