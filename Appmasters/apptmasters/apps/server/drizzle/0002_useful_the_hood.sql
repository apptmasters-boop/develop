DO $$ BEGIN
 CREATE TYPE "listing_status" AS ENUM('active', 'inactive');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "listing_type" AS ENUM('private_room', 'shared_room', 'room_in_apartment', 'community_home', 'roommate_wanted');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "listings" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"listing_type" "listing_type" NOT NULL,
	"neighborhood" varchar(100) NOT NULL,
	"city" varchar(100) NOT NULL,
	"state" varchar(2) NOT NULL,
	"price_cents" integer NOT NULL,
	"shared_expenses_cents" integer DEFAULT 0 NOT NULL,
	"roommates_count" integer DEFAULT 0 NOT NULL,
	"bathrooms_count" integer DEFAULT 1 NOT NULL,
	"max_occupants" integer DEFAULT 1 NOT NULL,
	"available_from" timestamp NOT NULL,
	"min_stay_months" integer DEFAULT 1 NOT NULL,
	"photos" text[] DEFAULT '{}' NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"rating_avg" real,
	"stays_count" integer,
	"status" "listing_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "listings" ADD CONSTRAINT "listings_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
