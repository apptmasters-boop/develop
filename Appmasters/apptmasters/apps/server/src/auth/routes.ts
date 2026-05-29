import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db, users, apartmentMembers } from "../db";
import { generateId } from "../lib/id";

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/register", async (req, reply) => {
    const body = registerSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ error: body.error.flatten() });
    }
    const { email, name, password } = body.data;

    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (existing) {
      return reply.status(409).send({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = generateId();
    await db.insert(users).values({ id, email, name, passwordHash });

    const token = app.jwt.sign({ userId: id, email, apartmentId: null });
    return { token, user: { id, email, name } };
  });

  app.post("/login", async (req, reply) => {
    const body = loginSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ error: body.error.flatten() });
    }
    const { email, password } = body.data;

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (!user) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const membership = await db.query.apartmentMembers.findFirst({
      where: eq(apartmentMembers.userId, user.id),
      columns: { apartmentId: true },
    });

    const token = app.jwt.sign({
      userId: user.id,
      email: user.email,
      apartmentId: membership?.apartmentId ?? null,
    });
    return { token, user: { id: user.id, email: user.email, name: user.name } };
  });

  app.get("/me", {
    preHandler: [async (req, reply) => {
      try { await req.jwtVerify(); } catch { reply.status(401).send({ error: "Unauthorized" }); }
    }],
  }, async (req) => {
    const payload = req.user as { userId: string };
    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.userId),
      columns: { id: true, email: true, name: true, avatarUrl: true, color: true, createdAt: true },
    });
    return user;
  });
}
