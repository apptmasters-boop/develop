import type { FastifyInstance } from "fastify";
import { db } from "../db";
import { disputes, auditLog } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

async function getMembership(app: FastifyInstance, request: { headers: Record<string, string | string[] | undefined> }) {
  const auth = request.headers["authorization"] as string | undefined;
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    return app.jwt.verify<{ sub: string; apartmentId: string; role: string }>(auth.slice(7));
  } catch {
    return null;
  }
}

async function writeAudit(apartmentId: string, userId: string, action: string, entity: string, entityId?: string, metadata?: object) {
  await db.insert(auditLog).values({
    id: randomUUID(),
    apartmentId,
    userId,
    action,
    entity,
    entityId: entityId ?? null,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });
}

export async function disputesRoutes(app: FastifyInstance) {
  // GET /api/disputes — list all disputes
  app.get("/", async (request, reply) => {
    const m = await getMembership(app, request as never);
    if (!m) return reply.status(401).send({ error: "Unauthorized" });

    const rows = await db.query.disputes.findMany({
      where: eq(disputes.apartmentId, m.apartmentId),
      orderBy: desc(disputes.createdAt),
      with: { raisedBy: true, against: true, resolvedBy: true },
    });

    return rows;
  });

  // POST /api/disputes — raise a dispute
  app.post<{
    Body: {
      title: string;
      description: string;
      againstUserId?: string;
      evidenceUrls?: string[];
    };
  }>("/", async (request, reply) => {
    const m = await getMembership(app, request as never);
    if (!m) return reply.status(401).send({ error: "Unauthorized" });

    const { title, description, againstUserId, evidenceUrls } = request.body ?? {};
    if (!title?.trim() || !description?.trim()) return reply.status(400).send({ error: "title and description required" });

    const [dispute] = await db.insert(disputes).values({
      id: randomUUID(),
      apartmentId: m.apartmentId,
      raisedByUserId: m.sub,
      againstUserId: againstUserId ?? null,
      title: title.trim(),
      description: description.trim(),
      evidenceUrls: evidenceUrls ?? [],
      status: "open",
    }).returning();

    await writeAudit(m.apartmentId, m.sub, "dispute_raised", "dispute", dispute.id, { title });

    return dispute;
  });

  // PATCH /api/disputes/:id — update status (admin only)
  app.patch<{
    Params: { id: string };
    Body: { status: "in_review" | "resolved" | "dismissed"; resolution?: string };
  }>("/:id", async (request, reply) => {
    const m = await getMembership(app, request as never);
    if (!m) return reply.status(401).send({ error: "Unauthorized" });
    if (m.role !== "admin") return reply.status(403).send({ error: "Admin only" });

    const { status, resolution } = request.body ?? {};
    if (!status) return reply.status(400).send({ error: "status required" });

    const dispute = await db.query.disputes.findFirst({
      where: and(eq(disputes.id, request.params.id), eq(disputes.apartmentId, m.apartmentId)),
    });
    if (!dispute) return reply.status(404).send({ error: "Not found" });

    const updates: Record<string, unknown> = { status };
    if (status === "resolved" || status === "dismissed") {
      updates.resolvedAt = new Date();
      updates.resolvedByUserId = m.sub;
    }
    if (resolution) updates.resolution = resolution;

    const [updated] = await db.update(disputes).set(updates).where(eq(disputes.id, request.params.id)).returning();

    await writeAudit(m.apartmentId, m.sub, `dispute_${status}`, "dispute", dispute.id, { status, resolution });

    return updated;
  });

  // POST /api/disputes/:id/resolve — author or admin marks as resolved
  app.post<{ Params: { id: string }; Body: { resolution?: string } }>(
    "/:id/resolve",
    async (request, reply) => {
      const m = await getMembership(app, request as never);
      if (!m) return reply.status(401).send({ error: "Unauthorized" });

      const dispute = await db.query.disputes.findFirst({
        where: and(eq(disputes.id, request.params.id), eq(disputes.apartmentId, m.apartmentId)),
      });
      if (!dispute) return reply.status(404).send({ error: "Not found" });
      if (dispute.raisedByUserId !== m.sub && m.role !== "admin") {
        return reply.status(403).send({ error: "Only the author or admin can resolve" });
      }

      const [updated] = await db.update(disputes)
        .set({
          status: "resolved",
          resolvedAt: new Date(),
          resolvedByUserId: m.sub,
          resolution: (request.body as Record<string, string>)?.resolution ?? null,
        })
        .where(eq(disputes.id, request.params.id))
        .returning();

      await writeAudit(m.apartmentId, m.sub, "dispute_resolved", "dispute", dispute.id);
      return updated;
    }
  );
}
