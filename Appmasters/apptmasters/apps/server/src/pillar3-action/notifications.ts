import type { FastifyInstance } from "fastify";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  notifications,
  notificationPreferences,
  apartmentMembers,
} from "../db";
import { generateId } from "../lib/id";
import { requireAuth, type JwtPayload } from "../auth/middleware";

async function getMembership(userId: string) {
  return db.query.apartmentMembers.findFirst({
    where: eq(apartmentMembers.userId, userId),
  });
}

export async function notificationsRoutes(app: FastifyInstance) {
  // ── List ─────────────────────────────────────────────

  app.get("/", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const query = req.query as { unread?: string; limit?: string };
    const limit = Math.min(parseInt(query.limit ?? "50", 10), 100);

    const where = query.unread === "true"
      ? and(eq(notifications.userId, payload.userId), eq(notifications.read, false))
      : eq(notifications.userId, payload.userId);

    const list = await db.query.notifications.findMany({
      where,
      orderBy: [desc(notifications.sentAt)],
      limit,
    });

    return list;
  });

  app.get("/count", { preHandler: [requireAuth] }, async (req) => {
    const payload = req.user as JwtPayload;
    const unread = await db.query.notifications.findMany({
      where: and(eq(notifications.userId, payload.userId), eq(notifications.read, false)),
      columns: { id: true },
    });
    return { count: unread.length };
  });

  // ── Mark read ─────────────────────────────────────────

  app.patch("/:id/read", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const { id } = req.params as { id: string };
    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, payload.userId)));
    return { success: true };
  });

  app.post("/read-all", { preHandler: [requireAuth] }, async (req) => {
    const payload = req.user as JwtPayload;
    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.userId, payload.userId), eq(notifications.read, false)));
    return { success: true };
  });

  // ── Preferences ───────────────────────────────────────

  app.get("/preferences", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    let prefs = await db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, payload.userId),
    });

    if (!prefs) {
      const id = generateId();
      await db.insert(notificationPreferences).values({ id, userId: payload.userId });
      prefs = await db.query.notificationPreferences.findFirst({
        where: eq(notificationPreferences.userId, payload.userId),
      });
    }

    return prefs;
  });

  app.patch("/preferences", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const body = z.object({
      choreReminders: z.boolean().optional(),
      expenseAlerts: z.boolean().optional(),
      settleReminders: z.boolean().optional(),
      weeklyDigest: z.boolean().optional(),
      nudgesEnabled: z.boolean().optional(),
      settleThresholdDollars: z.number().min(0).optional(),
      quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const existing = await db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, payload.userId),
    });

    const updates: Record<string, unknown> = { ...body.data };
    if (body.data.settleThresholdDollars !== undefined) {
      updates.settleThresholdCents = Math.round(body.data.settleThresholdDollars * 100);
      delete updates.settleThresholdDollars;
    }

    if (existing) {
      await db.update(notificationPreferences).set(updates)
        .where(eq(notificationPreferences.userId, payload.userId));
    } else {
      await db.insert(notificationPreferences).values({
        id: generateId(),
        userId: payload.userId,
        ...updates,
      });
    }

    return { success: true };
  });

  // ── Nudge ─────────────────────────────────────────────

  app.post("/nudge/:choreId", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const { choreId } = req.params as { choreId: string };
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    const { chores } = await import("../db");
    const chore = await db.query.chores.findFirst({
      where: and(eq(chores.id, choreId), eq(chores.apartmentId, membership.apartmentId)),
      with: { assignedTo: { columns: { id: true, name: true } } },
    });
    if (!chore) return reply.status(404).send({ error: "Chore not found" });
    if (!chore.assignedToUserId) return reply.status(400).send({ error: "No one assigned" });

    const { createNotification } = await import("../lib/notificationService");
    await createNotification(
      chore.assignedToUserId,
      membership.apartmentId,
      "chore_nudge",
      "Gentle reminder 👋",
      `${req.headers["x-user-name"] ?? "A roommate"} is kindly asking about "${chore.name}"`,
      choreId
    );

    return { success: true };
  });
}
