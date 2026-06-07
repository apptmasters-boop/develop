import type { FastifyInstance } from "fastify";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db, houseRules, houseRuleVotes, apartmentMembers } from "../db";
import { generateId } from "../lib/id";
import { requireAuth, type JwtPayload } from "../auth/middleware";
import { createNotificationForMembers } from "../lib/notificationService";

async function getMembership(userId: string) {
  return db.query.apartmentMembers.findFirst({
    where: eq(apartmentMembers.userId, userId),
  });
}

export async function rulesRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    const rules = await db.query.houseRules.findMany({
      where: eq(houseRules.apartmentId, membership.apartmentId),
      with: {
        proposedBy: { columns: { id: true, name: true } },
        votes: { with: { user: { columns: { id: true, name: true } } } },
      },
      orderBy: (r, { desc }) => [desc(r.createdAt)],
    });

    return rules.map((rule) => ({
      ...rule,
      yesCount: rule.votes.filter((v) => v.vote).length,
      noCount: rule.votes.filter((v) => !v.vote).length,
      myVote: rule.votes.find((v) => v.userId === payload.userId)?.vote ?? null,
    }));
  });

  app.post("/", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    const body = z.object({ content: z.string().min(1).max(500) }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const id = generateId();
    await db.insert(houseRules).values({
      id,
      apartmentId: membership.apartmentId,
      proposedByUserId: payload.userId,
      content: body.data.content,
    });

    const members = await db.query.apartmentMembers.findMany({
      where: and(eq(apartmentMembers.apartmentId, membership.apartmentId)),
      columns: { userId: true },
    });
    const otherIds = members.map((m) => m.userId).filter((uid) => uid !== payload.userId);
    if (otherIds.length > 0) {
      await createNotificationForMembers(
        otherIds, membership.apartmentId, "house_rule_vote",
        "New house rule proposed",
        `A new rule was proposed: "${body.data.content.slice(0, 80)}…"`, id
      );
    }

    return { id };
  });

  app.post("/:ruleId/vote", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const { ruleId } = req.params as { ruleId: string };
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    const rule = await db.query.houseRules.findFirst({ where: eq(houseRules.id, ruleId) });
    if (!rule || rule.apartmentId !== membership.apartmentId) {
      return reply.status(404).send({ error: "Rule not found" });
    }
    if (rule.status !== "proposed") return reply.status(400).send({ error: "Voting is closed" });

    const body = z.object({ vote: z.boolean() }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const existing = await db.query.houseRuleVotes.findFirst({
      where: and(eq(houseRuleVotes.ruleId, ruleId), eq(houseRuleVotes.userId, payload.userId)),
    });

    if (existing) {
      await db.update(houseRuleVotes).set({ vote: body.data.vote })
        .where(eq(houseRuleVotes.id, existing.id));
    } else {
      await db.insert(houseRuleVotes).values({
        id: generateId(), ruleId, userId: payload.userId, vote: body.data.vote,
      });
    }

    // Auto-pass if all active members voted yes
    const members = await db.query.apartmentMembers.findMany({
      where: and(eq(apartmentMembers.apartmentId, membership.apartmentId),
        eq(apartmentMembers.status, "active")),
      columns: { userId: true },
    });
    const allVotes = await db.query.houseRuleVotes.findMany({
      where: eq(houseRuleVotes.ruleId, ruleId),
    });
    const allYes = members.every((m) => allVotes.find((v) => v.userId === m.userId && v.vote));
    if (allYes) {
      await db.update(houseRules).set({ status: "active", resolvedAt: new Date() })
        .where(eq(houseRules.id, ruleId));
    }

    return { success: true };
  });

  app.patch("/:ruleId", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const { ruleId } = req.params as { ruleId: string };
    const membership = await getMembership(payload.userId);
    if (!membership || membership.role !== "admin") {
      return reply.status(403).send({ error: "Admin only" });
    }

    const body = z.object({ status: z.enum(["active", "rejected"]) }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    await db.update(houseRules).set({ status: body.data.status, resolvedAt: new Date() })
      .where(and(eq(houseRules.id, ruleId), eq(houseRules.apartmentId, membership.apartmentId)));

    return { success: true };
  });
}
