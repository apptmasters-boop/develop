import type { FastifyInstance } from "fastify";

export async function feedRoutes(app: FastifyInstance) {
  app.get("/", async () => ({ data: [], message: "Phase 5 — coming soon" }));
}
