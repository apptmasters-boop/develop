import type { FastifyInstance } from "fastify";

export async function choresRoutes(app: FastifyInstance) {
  app.get("/", async () => ({ data: [], message: "Phase 2 — coming soon" }));
}
