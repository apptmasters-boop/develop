import Fastify from "fastify";
import jwt from "@fastify/jwt";
import cors from "@fastify/cors";

const server = Fastify({ logger: true });

// ── Auth ──────────────────────────────────────────────
import { authRoutes } from "./auth/routes";
import { userRoutes } from "./auth/users";

// ── Pillar 1: Perception & Context ───────────────────
import { apartmentRoutes } from "./pillar1-perception/apartment";
import { roomRoutes } from "./pillar1-perception/rooms";

// ── Pillar 2: Memory & State ──────────────────────────
import { financesRoutes } from "./pillar2-memory/finances";
import { choresRoutes } from "./pillar2-memory/chores";
import { maintenanceRoutes } from "./pillar2-memory/maintenance";
import { inventoryRoutes } from "./pillar2-memory/inventory";
import { rulesRoutes } from "./pillar2-memory/rules";

// ── Pillar 3: Action & Execution ──────────────────────
import { notificationsRoutes } from "./pillar3-action/notifications";
import { automationsRoutes } from "./pillar3-action/automations";

// ── Pillar 4: Collaboration & Communication ───────────
import { feedRoutes } from "./pillar4-collaboration/feed";
import { calendarRoutes } from "./pillar4-collaboration/calendar";

// ── Pillar 5: Safety, Ethics & Trust ─────────────────
import { disputesRoutes } from "./pillar5-trust/disputes";
import { auditRoutes } from "./pillar5-trust/audit";
import { moveOutRoutes } from "./pillar5-trust/move-out";

async function main() {
  await server.register(cors, {
    origin: process.env.WEB_URL ?? "http://localhost:3000",
    credentials: true,
  });

  await server.register(jwt, {
    secret: process.env.JWT_SECRET ?? "dev-secret-change-in-production",
  });

  server.register(authRoutes, { prefix: "/api/auth" });
  server.register(userRoutes, { prefix: "/api/users" });
  server.register(apartmentRoutes, { prefix: "/api/apartment" });
  server.register(roomRoutes, { prefix: "/api/rooms" });
  server.register(financesRoutes, { prefix: "/api/finances" });
  server.register(choresRoutes, { prefix: "/api/chores" });
  server.register(maintenanceRoutes, { prefix: "/api/maintenance" });
  server.register(inventoryRoutes, { prefix: "/api/inventory" });
  server.register(rulesRoutes, { prefix: "/api/rules" });
  server.register(notificationsRoutes, { prefix: "/api/notifications" });
  server.register(automationsRoutes, { prefix: "/api/automations" });
  server.register(feedRoutes, { prefix: "/api/feed" });
  server.register(calendarRoutes, { prefix: "/api/calendar" });
  server.register(disputesRoutes, { prefix: "/api/disputes" });
  server.register(auditRoutes, { prefix: "/api/audit" });
  server.register(moveOutRoutes, { prefix: "/api/move-out" });

  await server.listen({ port: 4000, host: "0.0.0.0" });
}

main().catch(console.error);
