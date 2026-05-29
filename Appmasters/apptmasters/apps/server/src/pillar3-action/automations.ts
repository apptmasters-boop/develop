import type { FastifyInstance } from "fastify";
import { eq, and, lt, gte, lte, isNull } from "drizzle-orm";
import {
  db,
  chores,
  choreTemplates,
  apartmentMembers,
  apartments,
  recurringExpenses,
  maintenanceIssues,
} from "../db";
import { generateId } from "../lib/id";
import { requireAuth, type JwtPayload } from "../auth/middleware";
import {
  createNotification,
  createNotificationForMembers,
} from "../lib/notificationService";
import { getNextAssignee } from "@apptmasters/utils";

async function getMembership(userId: string) {
  return db.query.apartmentMembers.findFirst({
    where: eq(apartmentMembers.userId, userId),
  });
}

// ── Core automation functions ──────────────────────────

export async function runOverdueChoreDetection(apartmentId?: string) {
  const now = new Date();
  const filter = apartmentId
    ? and(eq(chores.status, "pending"), lt(chores.dueAt, now), eq(chores.apartmentId, apartmentId))
    : and(eq(chores.status, "pending"), lt(chores.dueAt, now));

  const overdue = await db.query.chores.findMany({
    where: filter,
    with: { assignedTo: { columns: { id: true, name: true } } },
  });

  for (const chore of overdue) {
    await db.update(chores).set({ status: "overdue" }).where(eq(chores.id, chore.id));
    if (chore.assignedToUserId) {
      await createNotification(
        chore.assignedToUserId,
        chore.apartmentId,
        "chore_overdue",
        "Chore overdue ⚠️",
        `"${chore.name}" was due and hasn't been completed yet.`,
        chore.id
      );
    }
  }
  return overdue.length;
}

export async function runChoreReminders(apartmentId?: string) {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const filter = apartmentId
    ? and(eq(chores.status, "pending"), gte(chores.dueAt, now), lte(chores.dueAt, in24h), eq(chores.apartmentId, apartmentId))
    : and(eq(chores.status, "pending"), gte(chores.dueAt, now), lte(chores.dueAt, in24h));

  const upcoming = await db.query.chores.findMany({ where: filter });

  for (const chore of upcoming) {
    if (chore.assignedToUserId) {
      await createNotification(
        chore.assignedToUserId,
        chore.apartmentId,
        "chore_reminder",
        "Chore due soon ⏰",
        `"${chore.name}" is due within 24 hours.`,
        chore.id
      );
    }
  }
  return upcoming.length;
}

export async function runRecurringChoreGeneration(apartmentId?: string) {
  const filter = apartmentId
    ? and(eq(choreTemplates.active, true), eq(choreTemplates.apartmentId, apartmentId))
    : eq(choreTemplates.active, true);

  const templates = await db.query.choreTemplates.findMany({ where: filter });
  let generated = 0;

  for (const tmpl of templates) {
    const latest = await db.query.chores.findFirst({
      where: and(eq(chores.apartmentId, tmpl.apartmentId), eq(chores.name, tmpl.name), eq(chores.roomId, tmpl.roomId)),
      orderBy: (c, { desc }) => [desc(c.dueAt)],
    });

    const lastDue = latest?.dueAt ?? new Date(0);
    const nextDue = new Date(lastDue.getTime() + tmpl.frequencyDays * 24 * 60 * 60 * 1000);

    if (nextDue <= new Date(Date.now() + 24 * 60 * 60 * 1000)) {
      // Get workloads to pick the next rotating assignee
      const members = await db.query.apartmentMembers.findMany({
        where: and(eq(apartmentMembers.apartmentId, tmpl.apartmentId), eq(apartmentMembers.status, "active"), eq(apartmentMembers.vacationMode, false)),
      });
      const workloads = members.map((m) => ({ userId: m.userId, pointsLast30Days: 0, choresDone: 0, choresOverdue: 0 }));
      const assignedToUserId = tmpl.assignmentMode === "rotating" ? getNextAssignee(workloads) : null;

      await db.insert(chores).values({
        id: generateId(),
        apartmentId: tmpl.apartmentId,
        roomId: tmpl.roomId,
        name: tmpl.name,
        points: tmpl.points,
        assignmentMode: tmpl.assignmentMode,
        assignedToUserId,
        dueAt: nextDue,
      });
      generated++;
    }
  }
  return generated;
}

export async function runWeeklySummary(apartmentId?: string) {
  const filter = apartmentId
    ? eq(apartments.id, apartmentId)
    : undefined;

  const apts = await db.query.apartments.findMany({ where: filter });

  for (const apt of apts) {
    const members = await db.query.apartmentMembers.findMany({
      where: and(eq(apartmentMembers.apartmentId, apt.id), eq(apartmentMembers.status, "active")),
    });

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentChores = await db.query.chores.findMany({
      where: and(eq(chores.apartmentId, apt.id), gte(chores.completedAt!, weekAgo)),
    });

    const pending = await db.query.chores.findMany({
      where: and(eq(chores.apartmentId, apt.id), eq(chores.status, "pending")),
    });

    for (const member of members) {
      const myDone = recentChores.filter((c) => c.completedByUserId === member.userId).length;
      const myPending = pending.filter((c) => c.assignedToUserId === member.userId).length;

      await createNotification(
        member.userId,
        apt.id,
        "weekly_summary",
        "Your weekly summary 📊",
        `This week: ${myDone} chore${myDone !== 1 ? "s" : ""} done · ${myPending} pending. ${apt.name} total: ${recentChores.length} done.`
      );
    }
  }
}

export async function runRentDueReminders(apartmentId?: string) {
  const filter = apartmentId
    ? and(eq(recurringExpenses.active, true), eq(recurringExpenses.apartmentId, apartmentId))
    : eq(recurringExpenses.active, true);

  const recurring = await db.query.recurringExpenses.findMany({ where: filter });
  const today = new Date().getDate();

  for (const expense of recurring) {
    const daysUntil = expense.dayOfMonth - today;
    if (daysUntil === 3 || daysUntil === 1) {
      await createNotificationForMembers(
        expense.participants,
        expense.apartmentId,
        "rent_due",
        `${expense.description} due in ${daysUntil} day${daysUntil > 1 ? "s" : ""} 💸`,
        `$${(expense.amount / 100).toFixed(2)} is due on the ${expense.dayOfMonth}${["st","nd","rd"][expense.dayOfMonth - 1] ?? "th"}.`,
        expense.id
      );
    }
  }
}

export async function runMaintenanceFollowUps(apartmentId?: string) {
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  const filter = apartmentId
    ? and(
        eq(maintenanceIssues.apartmentId, apartmentId),
        eq(maintenanceIssues.status, "InProgress"),
        lt(maintenanceIssues.createdAt, tenDaysAgo),
        isNull(maintenanceIssues.resolvedAt)
      )
    : and(
        eq(maintenanceIssues.status, "InProgress"),
        lt(maintenanceIssues.createdAt, tenDaysAgo),
        isNull(maintenanceIssues.resolvedAt)
      );

  const stale = await db.query.maintenanceIssues.findMany({ where: filter });

  for (const issue of stale) {
    const members = await db.query.apartmentMembers.findMany({
      where: and(eq(apartmentMembers.apartmentId, issue.apartmentId), eq(apartmentMembers.status, "active")),
    });
    await createNotificationForMembers(
      members.map((m) => m.userId),
      issue.apartmentId,
      "maintenance_followup",
      "Maintenance follow-up needed 🔧",
      `"${issue.description}" has been in progress for over 10 days with no resolution.`,
      issue.id
    );
  }
}

// ── Routes ────────────────────────────────────────────

export async function automationsRoutes(app: FastifyInstance) {
  app.post("/run", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const membership = await getMembership(payload.userId);
    if (!membership || membership.role !== "admin") {
      return reply.status(403).send({ error: "Admin only" });
    }
    const aptId = membership.apartmentId;

    const [overdueCount, reminderCount, generated] = await Promise.all([
      runOverdueChoreDetection(aptId),
      runChoreReminders(aptId),
      runRecurringChoreGeneration(aptId),
    ]);

    await runRentDueReminders(aptId);
    await runMaintenanceFollowUps(aptId);

    return { overdueMarked: overdueCount, remindersCreated: reminderCount, choresGenerated: generated };
  });

  app.post("/weekly-summary", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const membership = await getMembership(payload.userId);
    if (!membership || membership.role !== "admin") {
      return reply.status(403).send({ error: "Admin only" });
    }
    await runWeeklySummary(membership.apartmentId);
    return { success: true };
  });

  app.get("/templates", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });
    return db.query.choreTemplates.findMany({
      where: eq(choreTemplates.apartmentId, membership.apartmentId),
      with: { room: { columns: { id: true, name: true } } },
    });
  });

  app.post("/templates", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const { z } = await import("zod");
    const membership = await getMembership(payload.userId);
    if (!membership || membership.role !== "admin") {
      return reply.status(403).send({ error: "Admin only" });
    }

    const body = z.object({
      roomId: z.string(),
      name: z.string().min(1).max(100),
      points: z.number().int().min(1).max(10).default(1),
      assignmentMode: z.enum(["rotating", "fixed", "voluntary"]).default("rotating"),
      frequencyDays: z.number().int().min(1).default(7),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const id = generateId();
    await db.insert(choreTemplates).values({
      id,
      apartmentId: membership.apartmentId,
      ...body.data,
    });
    return { id, name: body.data.name, frequencyDays: body.data.frequencyDays };
  });

  app.delete("/templates/:id", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const { id } = req.params as { id: string };
    const membership = await getMembership(payload.userId);
    if (!membership || membership.role !== "admin") {
      return reply.status(403).send({ error: "Admin only" });
    }
    await db.update(choreTemplates).set({ active: false })
      .where(and(eq(choreTemplates.id, id), eq(choreTemplates.apartmentId, membership.apartmentId)));
    return { success: true };
  });
}
