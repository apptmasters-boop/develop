import type { FastifyInstance } from "fastify";

export async function notificationsRoutes(app: FastifyInstance) {
  app.get("/", async () => ({ data: [], message: "Phase 4 — coming soon" }));
}
