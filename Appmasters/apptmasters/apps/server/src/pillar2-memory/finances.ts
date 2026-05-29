import type { FastifyInstance } from "fastify";

export async function financesRoutes(app: FastifyInstance) {
  app.get("/", async () => ({ data: [], message: "Phase 3 — coming soon" }));
}
