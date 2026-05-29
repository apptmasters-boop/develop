import type { FastifyInstance } from "fastify";

export async function inventoryRoutes(app: FastifyInstance) {
  app.get("/", async () => ({ data: [], message: "Phase 7 — coming soon" }));
}
