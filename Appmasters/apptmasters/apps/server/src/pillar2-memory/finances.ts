import type { FastifyInstance } from "fastify";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  expenses,
  expenseSplits,
  recurringExpenses,
  settlements,
  apartmentMembers,
} from "../db";
import { generateId } from "../lib/id";
import { requireAuth, type JwtPayload } from "../auth/middleware";
import { simplifyDebts } from "@apptmasters/utils";

const CENTS = 100;

async function getMembership(userId: string) {
  return db.query.apartmentMembers.findFirst({
    where: eq(apartmentMembers.userId, userId),
  });
}

function computeSplits(
  amount: number, // cents
  method: "equal" | "custom" | "percentage" | "single",
  participants: string[],
  payerId: string,
  customAmounts?: Record<string, number>
): Array<{ userId: string; amount: number }> {
  if (method === "single") return [{ userId: payerId, amount }];
  if (method === "equal") {
    const share = Math.round(amount / participants.length);
    return participants.map((uid, i) => ({
      userId: uid,
      amount: i === 0 ? amount - share * (participants.length - 1) : share,
    }));
  }
  if (method === "custom" && customAmounts) {
    return participants.map((uid) => ({ userId: uid, amount: customAmounts[uid] ?? 0 }));
  }
  return participants.map((uid, i) => ({
    userId: uid,
    amount: i === 0 ? amount - Math.round(amount / participants.length) * (participants.length - 1) : Math.round(amount / participants.length),
  }));
}

const addExpenseSchema = z.object({
  description: z.string().min(1).max(200),
  amount: z.number().positive(), // dollars
  category: z.string().default("other"),
  splitMethod: z.enum(["equal", "custom", "percentage", "single"]).default("equal"),
  participants: z.array(z.string()).min(1),
  customAmounts: z.record(z.number()).optional(),
});

export async function financesRoutes(app: FastifyInstance) {
  // ── Expenses ────────────────────────────────────────

  app.get("/", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    const list = await db.query.expenses.findMany({
      where: eq(expenses.apartmentId, membership.apartmentId),
      with: {
        addedBy: { columns: { id: true, name: true, color: true } },
        splits: {
          with: { user: { columns: { id: true, name: true } } },
        },
      },
      orderBy: [desc(expenses.createdAt)],
    });

    return list.map((e) => ({ ...e, amount: e.amount / CENTS }));
  });

  app.post("/", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    const body = addExpenseSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const amountCents = Math.round(body.data.amount * CENTS);
    const splits = computeSplits(
      amountCents,
      body.data.splitMethod,
      body.data.participants,
      payload.userId,
      body.data.customAmounts
        ? Object.fromEntries(
            Object.entries(body.data.customAmounts).map(([k, v]) => [k, Math.round(v * CENTS)])
          )
        : undefined
    );

    const id = generateId();
    await db.insert(expenses).values({
      id,
      apartmentId: membership.apartmentId,
      addedByUserId: payload.userId,
      description: body.data.description,
      amount: amountCents,
      category: body.data.category,
      splitMethod: body.data.splitMethod,
    });

    await db.insert(expenseSplits).values(
      splits.map((s) => ({
        id: generateId(),
        expenseId: id,
        userId: s.userId,
        amount: s.amount,
      }))
    );

    return { id, amount: body.data.amount, description: body.data.description };
  });

  app.delete("/:expenseId", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const { expenseId } = req.params as { expenseId: string };
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    const expense = await db.query.expenses.findFirst({
      where: and(eq(expenses.id, expenseId), eq(expenses.apartmentId, membership.apartmentId)),
    });
    if (!expense) return reply.status(404).send({ error: "Expense not found" });
    if (expense.addedByUserId !== payload.userId && membership.role !== "admin") {
      return reply.status(403).send({ error: "Not authorized" });
    }

    await db.delete(expenseSplits).where(eq(expenseSplits.expenseId, expenseId));
    await db.delete(expenses).where(eq(expenses.id, expenseId));
    return { success: true };
  });

  // ── Balance ──────────────────────────────────────────

  app.get("/balance", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });
    const aptId = membership.apartmentId;

    // Per-person net balance: positive = owed to them, negative = they owe
    const members = await db.query.apartmentMembers.findMany({
      where: eq(apartmentMembers.apartmentId, aptId),
      with: { user: { columns: { id: true, name: true, color: true } } },
    });

    const balances = await Promise.all(
      members.map(async (m) => {
        const paid = await db
          .select({ total: sql<number>`coalesce(sum(${expenses.amount}), 0)` })
          .from(expenses)
          .where(and(eq(expenses.apartmentId, aptId), eq(expenses.addedByUserId, m.userId)));

        const owes = await db
          .select({ total: sql<number>`coalesce(sum(${expenseSplits.amount}), 0)` })
          .from(expenseSplits)
          .innerJoin(expenses, eq(expenseSplits.expenseId, expenses.id))
          .where(
            and(
              eq(expenses.apartmentId, aptId),
              eq(expenseSplits.userId, m.userId),
              eq(expenseSplits.settled, false)
            )
          );

        const settledOut = await db
          .select({ total: sql<number>`coalesce(sum(${settlements.amount}), 0)` })
          .from(settlements)
          .where(
            and(
              eq(settlements.apartmentId, aptId),
              eq(settlements.fromUserId, m.userId),
              eq(settlements.confirmedByFrom, true),
              eq(settlements.confirmedByTo, true)
            )
          );

        const settledIn = await db
          .select({ total: sql<number>`coalesce(sum(${settlements.amount}), 0)` })
          .from(settlements)
          .where(
            and(
              eq(settlements.apartmentId, aptId),
              eq(settlements.toUserId, m.userId),
              eq(settlements.confirmedByFrom, true),
              eq(settlements.confirmedByTo, true)
            )
          );

        const paidCents = Number(paid[0]?.total ?? 0);
        const owesCents = Number(owes[0]?.total ?? 0);
        const net = (paidCents - owesCents + Number(settledIn[0]?.total ?? 0) - Number(settledOut[0]?.total ?? 0)) / CENTS;

        return {
          userId: m.userId,
          name: m.user.name,
          color: m.user.color,
          net: parseFloat(net.toFixed(2)),
          owes: parseFloat((owesCents / CENTS).toFixed(2)),
          paid: parseFloat((paidCents / CENTS).toFixed(2)),
        };
      })
    );

    return balances;
  });

  // ── Debt simplification ──────────────────────────────

  app.get("/simplify", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    const balances = await app.inject({
      method: "GET",
      url: "/api/finances/balance",
      headers: { authorization: `Bearer ${req.headers.authorization?.split(" ")[1]}` },
    });
    const data = JSON.parse(balances.body) as Array<{ userId: string; net: number }>;

    const edges = [];
    for (const a of data) {
      for (const b of data) {
        if (a.userId !== b.userId && a.net < 0 && b.net > 0) {
          const amount = Math.min(Math.abs(a.net), b.net);
          if (amount > 0.01) {
            edges.push({ fromUserId: a.userId, toUserId: b.userId, amount });
          }
        }
      }
    }

    return simplifyDebts(edges);
  });

  // ── Settlements ──────────────────────────────────────

  app.post("/settle", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    const body = z.object({
      toUserId: z.string(),
      amount: z.number().positive(),
      note: z.string().optional(),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const id = generateId();
    await db.insert(settlements).values({
      id,
      apartmentId: membership.apartmentId,
      fromUserId: payload.userId,
      toUserId: body.data.toUserId,
      amount: Math.round(body.data.amount * CENTS),
      confirmedByFrom: true,
      note: body.data.note ?? null,
    });
    return { id };
  });

  app.post("/settle/:settlementId/confirm", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const { settlementId } = req.params as { settlementId: string };

    const settlement = await db.query.settlements.findFirst({
      where: eq(settlements.id, settlementId),
    });
    if (!settlement) return reply.status(404).send({ error: "Not found" });
    if (settlement.toUserId !== payload.userId) {
      return reply.status(403).send({ error: "Not the recipient" });
    }

    const now = new Date();
    await db.update(settlements).set({ confirmedByTo: true, confirmedAt: now })
      .where(eq(settlements.id, settlementId));

    // Mark splits as settled for amounts up to the settlement
    const unsettledSplits = await db.query.expenseSplits.findMany({
      where: and(eq(expenseSplits.userId, settlement.fromUserId), eq(expenseSplits.settled, false)),
      with: { expense: { columns: { apartmentId: true } } },
    });
    let remaining = settlement.amount;
    for (const split of unsettledSplits) {
      if (split.expense?.apartmentId !== settlement.apartmentId) continue;
      if (remaining <= 0) break;
      if (split.amount <= remaining) {
        await db.update(expenseSplits).set({ settled: true, settledAt: now })
          .where(eq(expenseSplits.id, split.id));
        remaining -= split.amount;
      }
    }

    return { success: true };
  });

  app.get("/settlements", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    const list = await db.query.settlements.findMany({
      where: eq(settlements.apartmentId, membership.apartmentId),
      with: {
        from: { columns: { id: true, name: true, color: true } },
        to: { columns: { id: true, name: true, color: true } },
      },
      orderBy: [desc(settlements.createdAt)],
    });

    return list.map((s) => ({ ...s, amount: s.amount / CENTS }));
  });

  // ── Recurring expenses ───────────────────────────────

  app.get("/recurring", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    const list = await db.query.recurringExpenses.findMany({
      where: eq(recurringExpenses.apartmentId, membership.apartmentId),
    });
    return list.map((r) => ({ ...r, amount: r.amount / CENTS }));
  });

  app.post("/recurring", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    const body = z.object({
      description: z.string().min(1).max(200),
      amount: z.number().positive(),
      splitMethod: z.enum(["equal", "custom", "percentage", "single"]).default("equal"),
      dayOfMonth: z.number().int().min(1).max(28).default(1),
      participants: z.array(z.string()).min(1),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const id = generateId();
    await db.insert(recurringExpenses).values({
      id,
      apartmentId: membership.apartmentId,
      description: body.data.description,
      amount: Math.round(body.data.amount * CENTS),
      splitMethod: body.data.splitMethod,
      dayOfMonth: body.data.dayOfMonth,
      participants: body.data.participants,
    });
    return { id, description: body.data.description };
  });

  app.patch("/recurring/:id", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const { id } = req.params as { id: string };
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    const body = z.object({
      active: z.boolean().optional(),
      amount: z.number().positive().optional(),
      dayOfMonth: z.number().int().min(1).max(28).optional(),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const updates: Record<string, unknown> = {};
    if (body.data.active !== undefined) updates.active = body.data.active;
    if (body.data.amount !== undefined) updates.amount = Math.round(body.data.amount * CENTS);
    if (body.data.dayOfMonth !== undefined) updates.dayOfMonth = body.data.dayOfMonth;

    await db.update(recurringExpenses).set(updates)
      .where(and(eq(recurringExpenses.id, id), eq(recurringExpenses.apartmentId, membership.apartmentId)));
    return { success: true };
  });
}
