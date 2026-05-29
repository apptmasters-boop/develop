import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, apartments, apartmentMembers, users } from "../db";
import { generateId, generateInviteCode } from "../lib/id";
import { requireAuth, type JwtPayload } from "../auth/middleware";

const createSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function apartmentRoutes(app: FastifyInstance) {
  app.post(
    "/",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const body = createSchema.safeParse(req.body);
      if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

      const existing = await db.query.apartmentMembers.findFirst({
        where: eq(apartmentMembers.userId, payload.userId),
      });
      if (existing) return reply.status(409).send({ error: "Already in an apartment" });

      const id = generateId();
      const inviteCode = generateInviteCode();
      await db.insert(apartments).values({
        id,
        name: body.data.name,
        inviteCode,
        adminId: payload.userId,
      });

      const memberId = generateId();
      await db.insert(apartmentMembers).values({
        id: memberId,
        apartmentId: id,
        userId: payload.userId,
        role: "admin",
        moveInDate: new Date(),
      });

      return { id, name: body.data.name, inviteCode };
    }
  );

  app.get(
    "/",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const membership = await db.query.apartmentMembers.findFirst({
        where: eq(apartmentMembers.userId, payload.userId),
        with: { apartment: true },
      });
      if (!membership) return reply.status(404).send({ error: "Not in an apartment" });
      return membership.apartment;
    }
  );

  app.post(
    "/join",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const body = z.object({ inviteCode: z.string() }).safeParse(req.body);
      if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

      const existing = await db.query.apartmentMembers.findFirst({
        where: eq(apartmentMembers.userId, payload.userId),
      });
      if (existing) return reply.status(409).send({ error: "Already in an apartment" });

      const apartment = await db.query.apartments.findFirst({
        where: eq(apartments.inviteCode, body.data.inviteCode.toUpperCase()),
      });
      if (!apartment) return reply.status(404).send({ error: "Invalid invite code" });

      const memberId = generateId();
      await db.insert(apartmentMembers).values({
        id: memberId,
        apartmentId: apartment.id,
        userId: payload.userId,
        role: "member",
        moveInDate: new Date(),
      });

      return { apartmentId: apartment.id, name: apartment.name };
    }
  );

  app.get(
    "/members",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const membership = await db.query.apartmentMembers.findFirst({
        where: eq(apartmentMembers.userId, payload.userId),
      });
      if (!membership) return reply.status(404).send({ error: "Not in an apartment" });

      const members = await db.query.apartmentMembers.findMany({
        where: eq(apartmentMembers.apartmentId, membership.apartmentId),
        with: { user: { columns: { id: true, name: true, email: true, avatarUrl: true, color: true } } },
      });
      return members;
    }
  );

  app.delete(
    "/members/:userId",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const { userId } = req.params as { userId: string };

      const callerMembership = await db.query.apartmentMembers.findFirst({
        where: eq(apartmentMembers.userId, payload.userId),
      });
      if (!callerMembership || callerMembership.role !== "admin") {
        return reply.status(403).send({ error: "Admin only" });
      }
      if (userId === payload.userId) {
        return reply.status(400).send({ error: "Cannot remove yourself" });
      }

      await db
        .delete(apartmentMembers)
        .where(eq(apartmentMembers.userId, userId));

      return { success: true };
    }
  );

  app.post(
    "/transfer-admin",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const body = z.object({ newAdminId: z.string() }).safeParse(req.body);
      if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

      const callerMembership = await db.query.apartmentMembers.findFirst({
        where: eq(apartmentMembers.userId, payload.userId),
      });
      if (!callerMembership || callerMembership.role !== "admin") {
        return reply.status(403).send({ error: "Admin only" });
      }

      await db
        .update(apartments)
        .set({ adminId: body.data.newAdminId })
        .where(eq(apartments.id, callerMembership.apartmentId));

      await db
        .update(apartmentMembers)
        .set({ role: "member" })
        .where(eq(apartmentMembers.userId, payload.userId));

      await db
        .update(apartmentMembers)
        .set({ role: "admin" })
        .where(eq(apartmentMembers.userId, body.data.newAdminId));

      return { success: true };
    }
  );

  app.post(
    "/vacation-mode",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const body = z
        .object({
          enabled: z.boolean(),
          start: z.string().datetime().optional(),
          end: z.string().datetime().optional(),
        })
        .safeParse(req.body);
      if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

      await db
        .update(apartmentMembers)
        .set({
          vacationMode: body.data.enabled,
          vacationStart: body.data.start ? new Date(body.data.start) : null,
          vacationEnd: body.data.end ? new Date(body.data.end) : null,
        })
        .where(eq(apartmentMembers.userId, payload.userId));

      return { success: true, vacationMode: body.data.enabled };
    }
  );
}
