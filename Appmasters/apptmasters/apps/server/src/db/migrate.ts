import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const client = postgres(process.env.DATABASE_URL, { max: 1 });

migrate(drizzle(client), { migrationsFolder: "./drizzle" })
  .then(() => console.log("Migrations applied"))
  .finally(() => client.end());
