import type { FastifyInstance } from "fastify";

export async function maintenanceRoutes(app: FastifyInstance) {
  app.get("/", async () => ({ data: [], message: "Phase 3 — coming soon" }));
}
