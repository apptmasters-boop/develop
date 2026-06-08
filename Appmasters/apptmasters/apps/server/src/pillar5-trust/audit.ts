import type { FastifyInstance } from "fastify";
import { db } from "../db";
import { auditLog } from "../db/schema";
import { eq, desc } from "drizzle-orm";

async function getMembership(app: FastifyInstance, request: { headers: Record<string, string | string[] | undefined> }) {
  const auth = request.headers["authorization"] as string | undefined;
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    return app.jwt.verify<{ sub: string; apartmentId: string; role: string }>(auth.slice(7));
  } catch {
    return null;
  }
}

export async function auditRoutes(app: FastifyInstance) {
  // GET /api/audit — full audit log (admin only)
  app.get("/", async (request, reply) => {
    const m = await getMembership(app, request as never);
    if (!m) return reply.status(401).send({ error: "Unauthorized" });
    if (m.role !== "admin") return reply.status(403).send({ error: "Admin only" });

    const rows = await db.query.auditLog.findMany({
      where: eq(auditLog.apartmentId, m.apartmentId),
      orderBy: desc(auditLog.createdAt),
      limit: 200,
      with: { user: true },
    });

    return rows.map((r) => ({
      ...r,
      metadata: r.metadata ? JSON.parse(r.metadata) : null,
    }));
  });
}
