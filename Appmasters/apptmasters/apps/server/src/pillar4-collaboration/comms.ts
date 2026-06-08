import type { FastifyInstance } from "fastify";
import { db } from "../db";
import { messages, callSessions } from "../db/schema";
import { eq, and, or, isNull, desc, asc } from "drizzle-orm";
import { randomUUID } from "crypto";

async function getMembership(app: FastifyInstance, request: { headers: Record<string, string | string[] | undefined> }) {
  const auth = request.headers["authorization"] as string | undefined;
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const payload = app.jwt.verify<{ sub: string; apartmentId: string }>(auth.slice(7));
    return payload;
  } catch {
    return null;
  }
}

export async function commsRoutes(app: FastifyInstance) {
  // ── Group chat ─────────────────────────────────────────

  // GET /api/comms/messages — last 50 group messages
  app.get("/messages", async (request, reply) => {
    const m = await getMembership(app, request as never);
    if (!m) return reply.status(401).send({ error: "Unauthorized" });

    const rows = await db.query.messages.findMany({
      where: and(eq(messages.apartmentId, m.apartmentId), isNull(messages.toUserId)),
      orderBy: desc(messages.createdAt),
      limit: 50,
      with: { from: true },
    });

    return rows.reverse();
  });

  // POST /api/comms/messages — send group message
  app.post<{ Body: { content?: string; imageUrl?: string } }>("/messages", async (request, reply) => {
    const m = await getMembership(app, request as never);
    if (!m) return reply.status(401).send({ error: "Unauthorized" });

    const { content, imageUrl } = request.body ?? {};
    if (!content?.trim() && !imageUrl) return reply.status(400).send({ error: "content or imageUrl required" });

    const [row] = await db.insert(messages).values({
      id: randomUUID(),
      apartmentId: m.apartmentId,
      fromUserId: m.sub,
      toUserId: null,
      content: content?.trim() ?? null,
      imageUrl: imageUrl ?? null,
    }).returning();

    return row;
  });

  // ── Direct messages ────────────────────────────────────

  // GET /api/comms/dm/:userId — conversation between me and userId
  app.get<{ Params: { userId: string } }>("/dm/:userId", async (request, reply) => {
    const m = await getMembership(app, request as never);
    if (!m) return reply.status(401).send({ error: "Unauthorized" });

    const { userId } = request.params;

    const rows = await db.query.messages.findMany({
      where: and(
        eq(messages.apartmentId, m.apartmentId),
        or(
          and(eq(messages.fromUserId, m.sub), eq(messages.toUserId, userId)),
          and(eq(messages.fromUserId, userId), eq(messages.toUserId, m.sub)),
        ),
      ),
      orderBy: asc(messages.createdAt),
      limit: 100,
      with: { from: true },
    });

    return rows;
  });

  // POST /api/comms/dm/:userId — send DM
  app.post<{ Params: { userId: string }; Body: { content?: string; imageUrl?: string } }>("/dm/:userId", async (request, reply) => {
    const m = await getMembership(app, request as never);
    if (!m) return reply.status(401).send({ error: "Unauthorized" });

    const { userId } = request.params;
    const { content, imageUrl } = request.body ?? {};
    if (!content?.trim() && !imageUrl) return reply.status(400).send({ error: "content or imageUrl required" });

    const [row] = await db.insert(messages).values({
      id: randomUUID(),
      apartmentId: m.apartmentId,
      fromUserId: m.sub,
      toUserId: userId,
      content: content?.trim() ?? null,
      imageUrl: imageUrl ?? null,
    }).returning();

    return row;
  });

  // ── Call signaling ─────────────────────────────────────

  // POST /api/comms/call — initiate a call
  app.post<{ Body: { receiverId?: string; type?: "audio" | "video"; offer: string } }>("/call", async (request, reply) => {
    const m = await getMembership(app, request as never);
    if (!m) return reply.status(401).send({ error: "Unauthorized" });

    const { receiverId, type = "audio", offer } = request.body ?? {};
    if (!offer) return reply.status(400).send({ error: "offer required" });

    const [session] = await db.insert(callSessions).values({
      id: randomUUID(),
      apartmentId: m.apartmentId,
      initiatorId: m.sub,
      receiverId: receiverId ?? null,
      type,
      status: "ringing",
      offer,
      answer: null,
      callerIce: [],
      receiverIce: [],
    }).returning();

    return session;
  });

  // GET /api/comms/call/incoming — check for incoming call (receiver polls this)
  app.get("/call/incoming", async (request, reply) => {
    const m = await getMembership(app, request as never);
    if (!m) return reply.status(401).send({ error: "Unauthorized" });

    const session = await db.query.callSessions.findFirst({
      where: and(
        eq(callSessions.apartmentId, m.apartmentId),
        eq(callSessions.receiverId, m.sub),
        eq(callSessions.status, "ringing"),
      ),
      with: { initiator: true },
    });

    return session ?? null;
  });

  // PATCH /api/comms/call/:id — update call (answer, end, add ICE)
  app.patch<{
    Params: { id: string };
    Body: {
      status?: "active" | "ended" | "missed";
      answer?: string;
      callerIce?: string[];
      receiverIce?: string[];
    };
  }>("/call/:id", async (request, reply) => {
    const m = await getMembership(app, request as never);
    if (!m) return reply.status(401).send({ error: "Unauthorized" });

    const { id } = request.params;
    const { status, answer, callerIce, receiverIce } = request.body ?? {};

    const session = await db.query.callSessions.findFirst({
      where: and(eq(callSessions.id, id), eq(callSessions.apartmentId, m.apartmentId)),
    });
    if (!session) return reply.status(404).send({ error: "Not found" });

    const updates: Record<string, unknown> = {};
    if (status) {
      updates.status = status;
      if (status === "ended" || status === "missed") updates.endedAt = new Date();
    }
    if (answer) updates.answer = answer;
    if (callerIce) updates.callerIce = callerIce;
    if (receiverIce) updates.receiverIce = receiverIce;

    const [updated] = await db.update(callSessions).set(updates).where(eq(callSessions.id, id)).returning();
    return updated;
  });

  // GET /api/comms/call/:id — poll call state
  app.get<{ Params: { id: string } }>("/call/:id", async (request, reply) => {
    const m = await getMembership(app, request as never);
    if (!m) return reply.status(401).send({ error: "Unauthorized" });

    const session = await db.query.callSessions.findFirst({
      where: and(eq(callSessions.id, request.params.id), eq(callSessions.apartmentId, m.apartmentId)),
      with: { initiator: true, receiver: true },
    });

    return session ?? reply.status(404).send({ error: "Not found" });
  });
}
