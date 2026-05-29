import type { FastifyInstance } from "fastify";

export async function calendarRoutes(app: FastifyInstance) {
  app.get("/", async () => ({ data: [], message: "Phase 5 — coming soon" }));
}
