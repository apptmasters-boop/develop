import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  varchar,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

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

export const choreStatusEnum = pgEnum("chore_status", [
  "pending",
  "completed",
  "overdue",
  "swapped",
]);
export const assignmentModeEnum = pgEnum("assignment_mode", [
  "rotating",
  "fixed",
  "voluntary",
]);

export const chores = pgTable("chores", {
  id: text("id").primaryKey(),
  apartmentId: text("apartment_id")
    .notNull()
    .references(() => apartments.id),
  roomId: text("room_id")
    .notNull()
    .references(() => rooms.id),
  name: varchar("name", { length: 100 }).notNull(),
  points: integer("points").default(1).notNull(),
  assignmentMode: assignmentModeEnum("assignment_mode").default("rotating").notNull(),
  assignedToUserId: text("assigned_to_user_id").references(() => users.id),
  dueAt: timestamp("due_at").notNull(),
  status: choreStatusEnum("status").default("pending").notNull(),
  completedAt: timestamp("completed_at"),
  completedByUserId: text("completed_by_user_id").references(() => users.id),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const choreSwapRequests = pgTable("chore_swap_requests", {
  id: text("id").primaryKey(),
  choreId: text("chore_id")
    .notNull()
    .references(() => chores.id),
  requestedByUserId: text("requested_by_user_id")
    .notNull()
    .references(() => users.id),
  requestedToUserId: text("requested_to_user_id")
    .notNull()
    .references(() => users.id),
  accepted: boolean("accepted"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

// ── Relations ─────────────────────────────────────────

export const apartmentsRelations = relations(apartments, ({ many }) => ({
  members: many(apartmentMembers),
  rooms: many(rooms),
  chores: many(chores),
}));

export const apartmentMembersRelations = relations(apartmentMembers, ({ one }) => ({
  apartment: one(apartments, { fields: [apartmentMembers.apartmentId], references: [apartments.id] }),
  user: one(users, { fields: [apartmentMembers.userId], references: [users.id] }),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  apartment: one(apartments, { fields: [rooms.apartmentId], references: [apartments.id] }),
  chores: many(chores),
}));

export const choresRelations = relations(chores, ({ one }) => ({
  apartment: one(apartments, { fields: [chores.apartmentId], references: [apartments.id] }),
  room: one(rooms, { fields: [chores.roomId], references: [rooms.id] }),
  assignedTo: one(users, { fields: [chores.assignedToUserId], references: [users.id] }),
  completedBy: one(users, { fields: [chores.completedByUserId], references: [users.id] }),
}));

export const choreSwapRelations = relations(choreSwapRequests, ({ one }) => ({
  chore: one(chores, { fields: [choreSwapRequests.choreId], references: [chores.id] }),
  requestedBy: one(users, { fields: [choreSwapRequests.requestedByUserId], references: [users.id] }),
  requestedTo: one(users, { fields: [choreSwapRequests.requestedToUserId], references: [users.id] }),
}));
