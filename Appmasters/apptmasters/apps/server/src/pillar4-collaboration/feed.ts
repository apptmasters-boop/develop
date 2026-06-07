import type { FastifyInstance } from "fastify";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { db, feedPosts, apartmentMembers } from "../db";
import { generateId } from "../lib/id";
import { requireAuth, type JwtPayload } from "../auth/middleware";

async function getMembership(userId: string) {
  return db.query.apartmentMembers.findFirst({
    where: eq(apartmentMembers.userId, userId),
  });
}

const feedPostTypeValues = [
  "chore_completed", "expense_added", "maintenance_reported",
  "member_joined", "rule_proposed", "rule_passed", "manual",
] as const;

export async function feedRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    const query = req.query as { limit?: string };
    const limit = Math.min(parseInt(query.limit ?? "30", 10), 100);

    const posts = await db.query.feedPosts.findMany({
      where: eq(feedPosts.apartmentId, membership.apartmentId),
      with: { user: { columns: { id: true, name: true, color: true } } },
      orderBy: [desc(feedPosts.createdAt)],
      limit,
    });

    return posts;
  });

  app.post("/", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    const body = z.object({
      content: z.string().min(1).max(500),
      type: z.enum(feedPostTypeValues).default("manual"),
      referenceId: z.string().optional(),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const id = generateId();
    await db.insert(feedPosts).values({
      id,
      apartmentId: membership.apartmentId,
      userId: payload.userId,
      type: body.data.type,
      content: body.data.content,
      referenceId: body.data.referenceId ?? null,
    });

    return { id, content: body.data.content };
  });

  app.delete("/:postId", { preHandler: [requireAuth] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const { postId } = req.params as { postId: string };
    const membership = await getMembership(payload.userId);
    if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

    const post = await db.query.feedPosts.findFirst({ where: eq(feedPosts.id, postId) });
    if (!post) return reply.status(404).send({ error: "Post not found" });
    if (post.userId !== payload.userId && membership.role !== "admin") {
      return reply.status(403).send({ error: "Not authorized" });
    }

    await db.delete(feedPosts).where(eq(feedPosts.id, postId));
    return { success: true };
  });
}
