import type { FastifyInstance } from "fastify";
import { eq, count, desc, ilike, or } from "drizzle-orm";
import { db } from "../db";
import { users, apartments, apartmentMembers, messages, expenses, disputes, auditLog } from "../db/schema";
import { requireSuperAdmin } from "../auth/middleware";
import type { JwtPayload } from "../auth/middleware";

export async function adminRoutes(app: FastifyInstance) {
  // All routes require super_admin
  app.addHook("preHandler", requireSuperAdmin);

  // Platform stats
  app.get("/stats", async () => {
    const [[{ total: totalUsers }], [{ total: totalApartments }], [{ total: totalMessages }], [{ total: totalExpenses }]] =
      await Promise.all([
        db.select({ total: count() }).from(users),
        db.select({ total: count() }).from(apartments),
        db.select({ total: count() }).from(messages),
        db.select({ total: count() }).from(expenses),
      ]);
    return { totalUsers, totalApartments, totalMessages, totalExpenses };
  });

  // User search
  app.get<{ Querystring: { q?: string } }>("/users", async (req) => {
    const q = req.query.q?.trim();
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        platformRole: users.platformRole,
        color: users.color,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(q ? or(ilike(users.email, `%${q}%`), ilike(users.name, `%${q}%`)) : undefined)
      .orderBy(desc(users.createdAt))
      .limit(50);
    return rows;
  });

  // Single user full data export (for law enforcement)
  app.get<{ Params: { userId: string } }>("/users/:userId/export", async (req, reply) => {
    const { userId } = req.params;
    const actor = req.user as JwtPayload;

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, email: true, name: true, platformRole: true, color: true, createdAt: true },
    });
    if (!user) return reply.status(404).send({ error: "User not found" });

    const [memberships, userMessages, userExpenses, userDisputes] = await Promise.all([
      db.query.apartmentMembers.findMany({
        where: eq(apartmentMembers.userId, userId),
        with: { apartment: { columns: { id: true, name: true } } },
      }),
      db.select().from(messages).where(eq(messages.fromUserId, userId)).orderBy(desc(messages.createdAt)).limit(500),
      db.select().from(expenses).where(eq(expenses.addedByUserId, userId)).orderBy(desc(expenses.createdAt)),
      db.select().from(disputes)
        .where(or(eq(disputes.raisedByUserId, userId), eq(disputes.againstUserId, userId)))
        .orderBy(desc(disputes.createdAt)),
    ]);

    // Log this access in audit log
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      apartmentId: memberships[0]?.apartmentId ?? "platform",
      userId: actor.userId,
      action: "legal_export",
      entity: "user",
      entityId: userId,
      metadata: JSON.stringify({ exportedBy: actor.email, reason: "admin_request" }),
    }).catch(() => {}); // non-fatal

    return {
      exportedAt: new Date().toISOString(),
      exportedBy: actor.email,
      user,
      apartments: memberships.map((m) => ({ ...m.apartment, role: m.role, moveInDate: m.moveInDate, status: m.status })),
      messages: userMessages,
      expenses: userExpenses,
      disputes: userDisputes,
    };
  });
}
