import type { FastifyRequest, FastifyReply } from "fastify";

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    reply.status(401).send({ error: "Unauthorized" });
  }
}

export async function requireSuperAdmin(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
    const payload = req.user as JwtPayload;
    if (payload.platformRole !== "super_admin") {
      reply.status(403).send({ error: "Forbidden" });
    }
  } catch {
    reply.status(401).send({ error: "Unauthorized" });
  }
}

export interface JwtPayload {
  userId: string;
  email: string;
  apartmentId: string | null;
  platformRole: "super_admin" | "landlord" | "tenant";
}
