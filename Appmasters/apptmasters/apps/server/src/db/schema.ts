import {
  pgTable,
  text,
  timestamp,
  boolean,
  varchar,
  pgEnum,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "member", "guest"]);
export const memberStatusEnum = pgEnum("member_status", ["active", "former"]);
export const roomTypeEnum = pgEnum("room_type", [
  "kitchen",
  "living",
  "bathroom",
  "hallway",
  "balcony",
  "laundry",
  "custom",
]);
export const roomStatusEnum = pgEnum("room_status", [
  "Clean",
  "Acceptable",
  "NeedsAttention",
  "Overdue",
]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  avatarUrl: text("avatar_url"),
  color: varchar("color", { length: 7 }).default("#6366f1"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const apartments = pgTable("apartments", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  inviteCode: varchar("invite_code", { length: 8 }).notNull().unique(),
  adminId: text("admin_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const apartmentMembers = pgTable("apartment_members", {
  id: text("id").primaryKey(),
  apartmentId: text("apartment_id")
    .notNull()
    .references(() => apartments.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  role: userRoleEnum("role").default("member").notNull(),
  moveInDate: timestamp("move_in_date").notNull(),
  roomAssignment: text("room_assignment"),
  vacationMode: boolean("vacation_mode").default(false).notNull(),
  vacationStart: timestamp("vacation_start"),
  vacationEnd: timestamp("vacation_end"),
  dietaryFlags: text("dietary_flags").array().default([]).notNull(),
  status: memberStatusEnum("status").default("active").notNull(),
});

export const rooms = pgTable("rooms", {
  id: text("id").primaryKey(),
  apartmentId: text("apartment_id")
    .notNull()
    .references(() => apartments.id),
  name: varchar("name", { length: 100 }).notNull(),
  type: roomTypeEnum("type").notNull(),
  status: roomStatusEnum("status").default("Clean").notNull(),
  lastCleanedAt: timestamp("last_cleaned_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
