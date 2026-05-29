import type { FastifyInstance } from "fastify";
import { eq, and, lte, gte, sql } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  chores,
  choreSwapRequests,
  apartmentMembers,
  rooms,
} from "../db";
import { generateId } from "../lib/id";
import { requireAuth, type JwtPayload } from "../auth/middleware";
import { getNextAssignee } from "@apptmasters/utils";

const assignmentModeValues = ["rotating", "fixed", "voluntary"] as const;

const createChoreSchema = z.object({
  roomId: z.string(),
  name: z.string().min(1).max(100),
  points: z.number().int().min(1).max(10).default(1),
  assignmentMode: z.enum(assignmentModeValues).default("rotating"),
  assignedToUserId: z.string().nullable().optional(),
  dueAt: z.string().datetime(),
});

async function getMembership(userId: string) {
  return db.query.apartmentMembers.findFirst({
    where: eq(apartmentMembers.userId, userId),
  });
}

async function getWorkloads(apartmentId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const members = await db.query.apartmentMembers.findMany({
    where: and(
      eq(apartmentMembers.apartmentId, apartmentId),
      eq(apartmentMembers.status, "active"),
      eq(apartmentMembers.vacationMode, false)
    ),
    columns: { userId: true },
  });

  const workloads = await Promise.all(
    members.map(async ({ userId }) => {
      const result = await db
        .select({
          points: sql<number>`coalesce(sum(${chores.points}), 0)`,
          count: sql<number>`count(*)`,
        })
        .from(chores)
        .where(
          and(
            eq(chores.apartmentId, apartmentId),
            eq(chores.completedByUserId, userId),
            gte(chores.completedAt, thirtyDaysAgo)
          )
        );
      const overdueResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(chores)
        .where(
          and(
            eq(chores.apartmentId, apartmentId),
            eq(chores.assignedToUserId, userId),
            eq(chores.status, "overdue")
          )
        );
      return {
        userId,
        pointsLast30Days: Number(result[0]?.points ?? 0),
        choresDone: Number(result[0]?.count ?? 0),
        choresOverdue: Number(overdueResult[0]?.count ?? 0),
      };
    })
  );
  return workloads;
}

export async function choresRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    const query = req.query as { roomId?: string; mine?: string; today?: string };
    const filters: Parameters<typeof db.query.chores.findMany>[0] = {
      where: eq(chores.apartmentId, membership.apartmentId),
      with: {
        room: { columns: { id: true, name: true } },
        assignedTo: { columns: { id: true, name: true, color: true } },
      },
      orderBy: (c, { asc }) => [asc(c.dueAt)],
    };

    let result = await db.query.chores.findMany(filters);

    if (query.roomId) result = result.filter((c) => c.roomId === query.roomId);
    if (query.mine === "true") result = result.filter((c) => c.assignedToUserId === payload.userId);
    if (query.today === "true") {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end = new Date(); end.setHours(23, 59, 59, 999);
      result = result.filter((c) => c.dueAt >= start && c.dueAt <= end);
    }

    return result;
  });

  app.post("/", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    const body = createChoreSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const room = await db.query.rooms.findFirst({
      where: and(eq(rooms.id, body.data.roomId), eq(rooms.apartmentId, membership.apartmentId)),
    });
    if (!room) return reply.status(404).send({ error: "Room not found" });

    let assignedToUserId = body.data.assignedToUserId ?? null;
    if (body.data.assignmentMode === "rotating" && !assignedToUserId) {
      const workloads = await getWorkloads(membership.apartmentId);
      assignedToUserId = getNextAssignee(workloads);
    }

    const id = generateId();
    await db.insert(chores).values({
      id,
      apartmentId: membership.apartmentId,
      roomId: body.data.roomId,
      name: body.data.name,
      points: body.data.points,
      assignmentMode: body.data.assignmentMode,
      assignedToUserId,
      dueAt: new Date(body.data.dueAt),
    });

    return { id, name: body.data.name, assignedToUserId };
  });

  app.patch("/:choreId", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const { choreId } = req.params as { choreId: string };
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    const chore = await db.query.chores.findFirst({
      where: and(eq(chores.id, choreId), eq(chores.apartmentId, membership.apartmentId)),
    });
    if (!chore) return reply.status(404).send({ error: "Chore not found" });

    const body = z
      .object({
        name: z.string().min(1).max(100).optional(),
        assignedToUserId: z.string().nullable().optional(),
        dueAt: z.string().datetime().optional(),
        status: z.enum(["pending", "overdue"]).optional(),
      })
      .safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const updates: Record<string, unknown> = {};
    if (body.data.name !== undefined) updates.name = body.data.name;
    if (body.data.assignedToUserId !== undefined) updates.assignedToUserId = body.data.assignedToUserId;
    if (body.data.dueAt !== undefined) updates.dueAt = new Date(body.data.dueAt);
    if (body.data.status !== undefined) updates.status = body.data.status;

    await db.update(chores).set(updates).where(eq(chores.id, choreId));
    return { success: true };
  });

  app.post("/:choreId/complete", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const { choreId } = req.params as { choreId: string };
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    const chore = await db.query.chores.findFirst({
      where: and(eq(chores.id, choreId), eq(chores.apartmentId, membership.apartmentId)),
    });
    if (!chore) return reply.status(404).send({ error: "Chore not found" });
    if (chore.status === "completed") return reply.status(400).send({ error: "Already completed" });

    const body = z.object({ photoUrl: z.string().url().optional() }).safeParse(req.body);
    const photoUrl = body.success ? body.data.photoUrl ?? null : null;

    const now = new Date();
    await db.update(chores).set({
      status: "completed",
      completedAt: now,
      completedByUserId: payload.userId,
      photoUrl,
    }).where(eq(chores.id, choreId));

    // Update room's lastCleanedAt
    await db.update(rooms).set({ lastCleanedAt: now, status: "Clean" })
      .where(eq(rooms.id, chore.roomId));

    return { success: true, points: chore.points };
  });

  app.post("/:choreId/swap-request", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const { choreId } = req.params as { choreId: string };
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    const chore = await db.query.chores.findFirst({
      where: and(eq(chores.id, choreId), eq(chores.apartmentId, membership.apartmentId)),
    });
    if (!chore) return reply.status(404).send({ error: "Chore not found" });
    if (chore.assignedToUserId !== payload.userId) {
      return reply.status(403).send({ error: "You are not assigned to this chore" });
    }

    const body = z.object({ requestedToUserId: z.string() }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const id = generateId();
    await db.insert(choreSwapRequests).values({
      id,
      choreId,
      requestedByUserId: payload.userId,
      requestedToUserId: body.data.requestedToUserId,
    });

    return { id };
  });

  app.patch("/swap/:swapId", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const { swapId } = req.params as { swapId: string };

    const swap = await db.query.choreSwapRequests.findFirst({
      where: eq(choreSwapRequests.id, swapId),
    });
    if (!swap) return reply.status(404).send({ error: "Swap request not found" });
    if (swap.requestedToUserId !== payload.userId) {
      return reply.status(403).send({ error: "Not your swap request" });
    }
    if (swap.accepted !== null) return reply.status(400).send({ error: "Already resolved" });

    const body = z.object({ accept: z.boolean() }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const now = new Date();
    await db.update(choreSwapRequests).set({
      accepted: body.data.accept,
      resolvedAt: now,
    }).where(eq(choreSwapRequests.id, swapId));

    if (body.data.accept) {
      await db.update(chores).set({
        assignedToUserId: payload.userId,
        status: "swapped",
      }).where(eq(chores.id, swap.choreId));

      await db.update(chores).set({ status: "pending" })
        .where(eq(chores.id, swap.choreId));

      await db.update(chores).set({ assignedToUserId: payload.userId })
        .where(eq(chores.id, swap.choreId));
    }

    return { success: true, accepted: body.data.accept };
  });

  app.get("/workload", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });
    return getWorkloads(membership.apartmentId);
  });

  app.delete("/:choreId", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const { choreId } = req.params as { choreId: string };
    const membership = await getMembership(payload.userId);
    if (!membership || membership.role !== "admin") {
      return reply.status(403).send({ error: "Admin only" });
    }

    await db.delete(chores).where(
      and(eq(chores.id, choreId), eq(chores.apartmentId, membership.apartmentId))
    );
    return { success: true };
  });
}
