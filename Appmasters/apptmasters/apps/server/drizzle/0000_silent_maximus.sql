DO $$ BEGIN
 CREATE TYPE "assignment_mode" AS ENUM('rotating', 'fixed', 'voluntary');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "call_status" AS ENUM('ringing', 'active', 'ended', 'missed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "call_type" AS ENUM('audio', 'video');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "chore_status" AS ENUM('pending', 'completed', 'overdue', 'swapped');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "contact_method" AS ENUM('phone', 'email', 'in-person', 'text');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "dispute_status" AS ENUM('open', 'in_review', 'resolved', 'dismissed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "expense_status" AS ENUM('active', 'disputed', 'settled', 'forgiven');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "feed_post_type" AS ENUM('chore_completed', 'expense_added', 'maintenance_reported', 'member_joined', 'rule_proposed', 'rule_passed', 'manual');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "maintenance_status" AS ENUM('Reported', 'ContactedLandlord', 'InProgress', 'Resolved', 'Closed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "member_status" AS ENUM('active', 'former');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "move_out_item_status" AS ENUM('pending', 'ok', 'needs_repair', 'missing');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "notification_type" AS ENUM('chore_reminder', 'chore_overdue', 'chore_nudge', 'expense_added', 'settle_up_reminder', 'low_stock', 'rent_due', 'maintenance_followup', 'weekly_summary', 'house_rule_vote', 'dispute_raised');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "room_status" AS ENUM('Clean', 'Acceptable', 'NeedsAttention', 'Overdue');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "room_type" AS ENUM('kitchen', 'living', 'bathroom', 'hallway', 'balcony', 'laundry', 'custom');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "rule_status" AS ENUM('proposed', 'active', 'rejected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "split_method" AS ENUM('equal', 'custom', 'percentage', 'single');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "urgency" AS ENUM('low', 'medium', 'high', 'emergency');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "user_role" AS ENUM('admin', 'member', 'guest');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "apartment_members" (
	"id" text PRIMARY KEY NOT NULL,
	"apartment_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "user_role" DEFAULT 'member' NOT NULL,
	"move_in_date" timestamp NOT NULL,
	"room_assignment" text,
	"vacation_mode" boolean DEFAULT false NOT NULL,
	"vacation_start" timestamp,
	"vacation_end" timestamp,
	"dietary_flags" text[] DEFAULT  NOT NULL,
	"status" "member_status" DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "apartments" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"invite_code" varchar(8) NOT NULL,
	"admin_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "apartments_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"apartment_id" text NOT NULL,
	"user_id" text NOT NULL,
	"action" varchar(100) NOT NULL,
	"entity" varchar(50) NOT NULL,
	"entity_id" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "calendar_events" (
	"id" text PRIMARY KEY NOT NULL,
	"apartment_id" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"start_at" timestamp NOT NULL,
	"end_at" timestamp NOT NULL,
	"all_day" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "call_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"apartment_id" text NOT NULL,
	"initiator_id" text NOT NULL,
	"receiver_id" text,
	"type" "call_type" DEFAULT 'audio' NOT NULL,
	"status" "call_status" DEFAULT 'ringing' NOT NULL,
	"offer" text,
	"answer" text,
	"caller_ice" text[] DEFAULT  NOT NULL,
	"receiver_ice" text[] DEFAULT  NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chore_swap_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"chore_id" text NOT NULL,
	"requested_by_user_id" text NOT NULL,
	"requested_to_user_id" text NOT NULL,
	"accepted" boolean,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chore_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"apartment_id" text NOT NULL,
	"room_id" text NOT NULL,
	"name" varchar(100) NOT NULL,
	"points" integer DEFAULT 1 NOT NULL,
	"assignment_mode" "assignment_mode" DEFAULT 'rotating' NOT NULL,
	"frequency_days" integer DEFAULT 7 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chores" (
	"id" text PRIMARY KEY NOT NULL,
	"apartment_id" text NOT NULL,
	"room_id" text NOT NULL,
	"name" varchar(100) NOT NULL,
	"points" integer DEFAULT 1 NOT NULL,
	"assignment_mode" "assignment_mode" DEFAULT 'rotating' NOT NULL,
	"assigned_to_user_id" text,
	"due_at" timestamp NOT NULL,
	"status" "chore_status" DEFAULT 'pending' NOT NULL,
	"completed_at" timestamp,
	"completed_by_user_id" text,
	"photo_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "disputes" (
	"id" text PRIMARY KEY NOT NULL,
	"apartment_id" text NOT NULL,
	"raised_by_user_id" text NOT NULL,
	"against_user_id" text,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"evidence_urls" text[] DEFAULT  NOT NULL,
	"status" "dispute_status" DEFAULT 'open' NOT NULL,
	"resolution" text,
	"resolved_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "expense_splits" (
	"id" text PRIMARY KEY NOT NULL,
	"expense_id" text NOT NULL,
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"settled" boolean DEFAULT false NOT NULL,
	"settled_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"apartment_id" text NOT NULL,
	"added_by_user_id" text NOT NULL,
	"description" varchar(200) NOT NULL,
	"amount" integer NOT NULL,
	"category" varchar(50) DEFAULT 'other' NOT NULL,
	"split_method" "split_method" DEFAULT 'equal' NOT NULL,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"recurring_id" text,
	"status" "expense_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feed_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"apartment_id" text NOT NULL,
	"user_id" text NOT NULL,
	"type" "feed_post_type" NOT NULL,
	"content" text NOT NULL,
	"reference_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "grocery_items" (
	"id" text PRIMARY KEY NOT NULL,
	"apartment_id" text NOT NULL,
	"added_by_user_id" text NOT NULL,
	"name" varchar(200) NOT NULL,
	"quantity" varchar(50),
	"checked" boolean DEFAULT false NOT NULL,
	"checked_by_user_id" text,
	"checked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "house_rule_votes" (
	"id" text PRIMARY KEY NOT NULL,
	"rule_id" text NOT NULL,
	"user_id" text NOT NULL,
	"vote" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "house_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"apartment_id" text NOT NULL,
	"proposed_by_user_id" text NOT NULL,
	"content" text NOT NULL,
	"status" "rule_status" DEFAULT 'proposed' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_items" (
	"id" text PRIMARY KEY NOT NULL,
	"apartment_id" text NOT NULL,
	"added_by_user_id" text NOT NULL,
	"name" varchar(200) NOT NULL,
	"category" varchar(50) DEFAULT 'other' NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit" varchar(30) DEFAULT 'units' NOT NULL,
	"low_stock_threshold" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp,
	"photo_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "landlord_contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"apartment_id" text NOT NULL,
	"issue_id" text,
	"contacted_by_user_id" text NOT NULL,
	"method" "contact_method" NOT NULL,
	"summary" text NOT NULL,
	"promise" text,
	"contacted_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maintenance_issues" (
	"id" text PRIMARY KEY NOT NULL,
	"apartment_id" text NOT NULL,
	"room_id" text,
	"reported_by_user_id" text NOT NULL,
	"description" text NOT NULL,
	"urgency" "urgency" DEFAULT 'medium' NOT NULL,
	"photo_urls" text[] DEFAULT  NOT NULL,
	"status" "maintenance_status" DEFAULT 'Reported' NOT NULL,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maintenance_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"issue_id" text NOT NULL,
	"changed_by_user_id" text NOT NULL,
	"new_status" "maintenance_status",
	"note" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"apartment_id" text NOT NULL,
	"from_user_id" text NOT NULL,
	"to_user_id" text,
	"content" text,
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "move_out_checklist_items" (
	"id" text PRIMARY KEY NOT NULL,
	"checklist_id" text NOT NULL,
	"room_id" text,
	"label" varchar(200) NOT NULL,
	"status" "move_out_item_status" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"photo_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "move_out_checklists" (
	"id" text PRIMARY KEY NOT NULL,
	"apartment_id" text NOT NULL,
	"user_id" text NOT NULL,
	"scheduled_date" timestamp,
	"notes" text,
	"pdf_url" text,
	"submitted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"chore_reminders" boolean DEFAULT true NOT NULL,
	"expense_alerts" boolean DEFAULT true NOT NULL,
	"settle_reminders" boolean DEFAULT true NOT NULL,
	"weekly_digest" boolean DEFAULT true NOT NULL,
	"nudges_enabled" boolean DEFAULT true NOT NULL,
	"settle_threshold_cents" integer DEFAULT 1000 NOT NULL,
	"quiet_hours_start" varchar(5) DEFAULT '22:00' NOT NULL,
	"quiet_hours_end" varchar(5) DEFAULT '08:00' NOT NULL,
	CONSTRAINT "notification_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"apartment_id" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" text NOT NULL,
	"reference_id" text,
	"read" boolean DEFAULT false NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recurring_expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"apartment_id" text NOT NULL,
	"description" varchar(200) NOT NULL,
	"amount" integer NOT NULL,
	"split_method" "split_method" DEFAULT 'equal' NOT NULL,
	"day_of_month" integer DEFAULT 1 NOT NULL,
	"participants" text[] DEFAULT  NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rooms" (
	"id" text PRIMARY KEY NOT NULL,
	"apartment_id" text NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" "room_type" NOT NULL,
	"status" "room_status" DEFAULT 'Clean' NOT NULL,
	"last_cleaned_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "settlements" (
	"id" text PRIMARY KEY NOT NULL,
	"apartment_id" text NOT NULL,
	"from_user_id" text NOT NULL,
	"to_user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"confirmed_by_from" boolean DEFAULT false NOT NULL,
	"confirmed_by_to" boolean DEFAULT false NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"confirmed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(100) NOT NULL,
	"password_hash" text NOT NULL,
	"avatar_url" text,
	"color" varchar(7) DEFAULT '#6366f1',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "apartment_members" ADD CONSTRAINT "apartment_members_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "apartment_members" ADD CONSTRAINT "apartment_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "apartments" ADD CONSTRAINT "apartments_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_initiator_id_users_id_fk" FOREIGN KEY ("initiator_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chore_swap_requests" ADD CONSTRAINT "chore_swap_requests_chore_id_chores_id_fk" FOREIGN KEY ("chore_id") REFERENCES "chores"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chore_swap_requests" ADD CONSTRAINT "chore_swap_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chore_swap_requests" ADD CONSTRAINT "chore_swap_requests_requested_to_user_id_users_id_fk" FOREIGN KEY ("requested_to_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chore_templates" ADD CONSTRAINT "chore_templates_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chore_templates" ADD CONSTRAINT "chore_templates_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chores" ADD CONSTRAINT "chores_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chores" ADD CONSTRAINT "chores_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chores" ADD CONSTRAINT "chores_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chores" ADD CONSTRAINT "chores_completed_by_user_id_users_id_fk" FOREIGN KEY ("completed_by_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "disputes" ADD CONSTRAINT "disputes_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "disputes" ADD CONSTRAINT "disputes_raised_by_user_id_users_id_fk" FOREIGN KEY ("raised_by_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "disputes" ADD CONSTRAINT "disputes_against_user_id_users_id_fk" FOREIGN KEY ("against_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "disputes" ADD CONSTRAINT "disputes_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expenses" ADD CONSTRAINT "expenses_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expenses" ADD CONSTRAINT "expenses_added_by_user_id_users_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feed_posts" ADD CONSTRAINT "feed_posts_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feed_posts" ADD CONSTRAINT "feed_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "grocery_items" ADD CONSTRAINT "grocery_items_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "grocery_items" ADD CONSTRAINT "grocery_items_added_by_user_id_users_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "grocery_items" ADD CONSTRAINT "grocery_items_checked_by_user_id_users_id_fk" FOREIGN KEY ("checked_by_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "house_rule_votes" ADD CONSTRAINT "house_rule_votes_rule_id_house_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "house_rules"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "house_rule_votes" ADD CONSTRAINT "house_rule_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "house_rules" ADD CONSTRAINT "house_rules_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "house_rules" ADD CONSTRAINT "house_rules_proposed_by_user_id_users_id_fk" FOREIGN KEY ("proposed_by_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_added_by_user_id_users_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "landlord_contacts" ADD CONSTRAINT "landlord_contacts_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "landlord_contacts" ADD CONSTRAINT "landlord_contacts_issue_id_maintenance_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "maintenance_issues"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "landlord_contacts" ADD CONSTRAINT "landlord_contacts_contacted_by_user_id_users_id_fk" FOREIGN KEY ("contacted_by_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_issues" ADD CONSTRAINT "maintenance_issues_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_issues" ADD CONSTRAINT "maintenance_issues_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_issues" ADD CONSTRAINT "maintenance_issues_reported_by_user_id_users_id_fk" FOREIGN KEY ("reported_by_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_issue_id_maintenance_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "maintenance_issues"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "move_out_checklist_items" ADD CONSTRAINT "move_out_checklist_items_checklist_id_move_out_checklists_id_fk" FOREIGN KEY ("checklist_id") REFERENCES "move_out_checklists"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "move_out_checklist_items" ADD CONSTRAINT "move_out_checklist_items_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "move_out_checklists" ADD CONSTRAINT "move_out_checklists_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "move_out_checklists" ADD CONSTRAINT "move_out_checklists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rooms" ADD CONSTRAINT "rooms_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "settlements" ADD CONSTRAINT "settlements_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "settlements" ADD CONSTRAINT "settlements_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "settlements" ADD CONSTRAINT "settlements_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
