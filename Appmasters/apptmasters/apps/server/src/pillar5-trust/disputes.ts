import type { FastifyInstance } from "fastify";

export async function disputesRoutes(app: FastifyInstance) {
  app.get("/", async () => ({ data: [], message: "Phase 8 — coming soon" }));
}
