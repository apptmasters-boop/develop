DO $$ BEGIN
 CREATE TYPE "platform_role" AS ENUM('super_admin', 'landlord', 'tenant');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "platform_role" "platform_role" DEFAULT 'tenant' NOT NULL;