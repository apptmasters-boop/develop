import type { FastifyInstance } from "fastify";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  maintenanceIssues,
  maintenanceLogs,
  landlordContacts,
  apartmentMembers,
  rooms,
} from "../db";
import { generateId } from "../lib/id";
import { requireAuth, type JwtPayload } from "../auth/middleware";

const statusValues = ["Reported", "ContactedLandlord", "InProgress", "Resolved", "Closed"] as const;
const urgencyValues = ["low", "medium", "high", "emergency"] as const;
const contactMethodValues = ["phone", "email", "in-person", "text"] as const;

async function getMembership(userId: string) {
  return db.query.apartmentMembers.findFirst({
    where: eq(apartmentMembers.userId, userId),
  });
}

export async function maintenanceRoutes(app: FastifyInstance) {
  // ── Issues ───────────────────────────────────────────

  app.get("/", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    return db.query.maintenanceIssues.findMany({
      where: eq(maintenanceIssues.apartmentId, membership.apartmentId),
      with: {
        reportedBy: { columns: { id: true, name: true, color: true } },
        room: { columns: { id: true, name: true } },
        logs: {
          with: { changedBy: { columns: { id: true, name: true } } },
          orderBy: (l, { asc }) => [asc(l.createdAt)],
        },
      },
      orderBy: [desc(maintenanceIssues.createdAt)],
    });
  });

  app.post("/", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    const body = z.object({
      roomId: z.string().optional(),
      description: z.string().min(1),
      urgency: z.enum(urgencyValues).default("medium"),
      photoUrls: z.array(z.string().url()).default([]),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    if (body.data.roomId) {
      const room = await db.query.rooms.findFirst({
        where: and(eq(rooms.id, body.data.roomId), eq(rooms.apartmentId, membership.apartmentId)),
      });
      if (!room) return reply.status(404).send({ error: "Room not found" });
    }

    const id = generateId();
    await db.insert(maintenanceIssues).values({
      id,
      apartmentId: membership.apartmentId,
      roomId: body.data.roomId ?? null,
      reportedByUserId: payload.userId,
      description: body.data.description,
      urgency: body.data.urgency,
      photoUrls: body.data.photoUrls,
    });

    await db.insert(maintenanceLogs).values({
      id: generateId(),
      issueId: id,
      changedByUserId: payload.userId,
      newStatus: "Reported",
      note: "Issue reported",
    });

    return { id, description: body.data.description };
  });

  app.patch("/:issueId", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const { issueId } = req.params as { issueId: string };
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    const issue = await db.query.maintenanceIssues.findFirst({
      where: and(
        eq(maintenanceIssues.id, issueId),
        eq(maintenanceIssues.apartmentId, membership.apartmentId)
      ),
    });
    if (!issue) return reply.status(404).send({ error: "Issue not found" });

    const body = z.object({
      status: z.enum(statusValues).optional(),
      note: z.string().default(""),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    if (body.data.status) {
      await db.update(maintenanceIssues).set({
        status: body.data.status,
        resolvedAt: body.data.status === "Resolved" ? new Date() : undefined,
      }).where(eq(maintenanceIssues.id, issueId));

      await db.insert(maintenanceLogs).values({
        id: generateId(),
        issueId,
        changedByUserId: payload.userId,
        newStatus: body.data.status,
        note: body.data.note || `Status changed to ${body.data.status}`,
      });
    }

    return { success: true };
  });

  // ── Landlord contacts ────────────────────────────────

  app.post("/contacts", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    const body = z.object({
      issueId: z.string().optional(),
      method: z.enum(contactMethodValues),
      summary: z.string().min(1),
      promise: z.string().optional(),
      contactedAt: z.string().datetime(),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const id = generateId();
    await db.insert(landlordContacts).values({
      id,
      apartmentId: membership.apartmentId,
      issueId: body.data.issueId ?? null,
      contactedByUserId: payload.userId,
      method: body.data.method,
      summary: body.data.summary,
      promise: body.data.promise ?? null,
      contactedAt: new Date(body.data.contactedAt),
    });

    if (body.data.issueId) {
      await db.update(maintenanceIssues).set({ status: "ContactedLandlord" })
        .where(eq(maintenanceIssues.id, body.data.issueId));
      await db.insert(maintenanceLogs).values({
        id: generateId(),
        issueId: body.data.issueId,
        changedByUserId: payload.userId,
        newStatus: "ContactedLandlord",
        note: `Landlord contacted via ${body.data.method}: ${body.data.summary}`,
      });
    }

    return { id };
  });

  app.get("/contacts", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    return db.query.landlordContacts.findMany({
      where: eq(landlordContacts.apartmentId, membership.apartmentId),
      with: {
        contactedBy: { columns: { id: true, name: true } },
        issue: { columns: { id: true, description: true } },
      },
      orderBy: [desc(landlordContacts.contactedAt)],
    });
  });
}
