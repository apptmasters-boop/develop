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

// ── Finance ───────────────────────────────────────────

export const expenseStatusEnum = pgEnum("expense_status", [
  "active",
  "disputed",
  "settled",
  "forgiven",
]);
export const splitMethodEnum = pgEnum("split_method", [
  "equal",
  "custom",
  "percentage",
  "single",
]);

export const expenses = pgTable("expenses", {
  id: text("id").primaryKey(),
  apartmentId: text("apartment_id").notNull().references(() => apartments.id),
  addedByUserId: text("added_by_user_id").notNull().references(() => users.id),
  description: varchar("description", { length: 200 }).notNull(),
  amount: integer("amount").notNull(), // stored in cents
  category: varchar("category", { length: 50 }).default("other").notNull(),
  splitMethod: splitMethodEnum("split_method").default("equal").notNull(),
  isRecurring: boolean("is_recurring").default(false).notNull(),
  recurringId: text("recurring_id"),
  status: expenseStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const expenseSplits = pgTable("expense_splits", {
  id: text("id").primaryKey(),
  expenseId: text("expense_id").notNull().references(() => expenses.id),
  userId: text("user_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(), // cents
  settled: boolean("settled").default(false).notNull(),
  settledAt: timestamp("settled_at"),
});

export const recurringExpenses = pgTable("recurring_expenses", {
  id: text("id").primaryKey(),
  apartmentId: text("apartment_id").notNull().references(() => apartments.id),
  description: varchar("description", { length: 200 }).notNull(),
  amount: integer("amount").notNull(), // cents
  splitMethod: splitMethodEnum("split_method").default("equal").notNull(),
  dayOfMonth: integer("day_of_month").default(1).notNull(),
  participants: text("participants").array().default([]).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const settlements = pgTable("settlements", {
  id: text("id").primaryKey(),
  apartmentId: text("apartment_id").notNull().references(() => apartments.id),
  fromUserId: text("from_user_id").notNull().references(() => users.id),
  toUserId: text("to_user_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(), // cents
  confirmedByFrom: boolean("confirmed_by_from").default(false).notNull(),
  confirmedByTo: boolean("confirmed_by_to").default(false).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  confirmedAt: timestamp("confirmed_at"),
});

// ── Maintenance ───────────────────────────────────────

export const maintenanceStatusEnum = pgEnum("maintenance_status", [
  "Reported",
  "ContactedLandlord",
  "InProgress",
  "Resolved",
  "Closed",
]);
export const urgencyEnum = pgEnum("urgency", ["low", "medium", "high", "emergency"]);
export const contactMethodEnum = pgEnum("contact_method", [
  "phone",
  "email",
  "in-person",
  "text",
]);

export const maintenanceIssues = pgTable("maintenance_issues", {
  id: text("id").primaryKey(),
  apartmentId: text("apartment_id").notNull().references(() => apartments.id),
  roomId: text("room_id").references(() => rooms.id),
  reportedByUserId: text("reported_by_user_id").notNull().references(() => users.id),
  description: text("description").notNull(),
  urgency: urgencyEnum("urgency").default("medium").notNull(),
  photoUrls: text("photo_urls").array().default([]).notNull(),
  status: maintenanceStatusEnum("status").default("Reported").notNull(),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const maintenanceLogs = pgTable("maintenance_logs", {
  id: text("id").primaryKey(),
  issueId: text("issue_id").notNull().references(() => maintenanceIssues.id),
  changedByUserId: text("changed_by_user_id").notNull().references(() => users.id),
  newStatus: maintenanceStatusEnum("new_status"),
  note: text("note").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const landlordContacts = pgTable("landlord_contacts", {
  id: text("id").primaryKey(),
  apartmentId: text("apartment_id").notNull().references(() => apartments.id),
  issueId: text("issue_id").references(() => maintenanceIssues.id),
  contactedByUserId: text("contacted_by_user_id").notNull().references(() => users.id),
  method: contactMethodEnum("method").notNull(),
  summary: text("summary").notNull(),
  promise: text("promise"),
  contactedAt: timestamp("contacted_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Finance relations ──────────────────────────────────

export const expensesRelations = relations(expenses, ({ one, many }) => ({
  apartment: one(apartments, { fields: [expenses.apartmentId], references: [apartments.id] }),
  addedBy: one(users, { fields: [expenses.addedByUserId], references: [users.id] }),
  splits: many(expenseSplits),
}));

export const expenseSplitsRelations = relations(expenseSplits, ({ one }) => ({
  expense: one(expenses, { fields: [expenseSplits.expenseId], references: [expenses.id] }),
  user: one(users, { fields: [expenseSplits.userId], references: [users.id] }),
}));

export const settlementsRelations = relations(settlements, ({ one }) => ({
  apartment: one(apartments, { fields: [settlements.apartmentId], references: [apartments.id] }),
  from: one(users, { fields: [settlements.fromUserId], references: [users.id] }),
  to: one(users, { fields: [settlements.toUserId], references: [users.id] }),
}));

// ── Maintenance relations ──────────────────────────────

export const maintenanceIssuesRelations = relations(maintenanceIssues, ({ one, many }) => ({
  apartment: one(apartments, { fields: [maintenanceIssues.apartmentId], references: [apartments.id] }),
  room: one(rooms, { fields: [maintenanceIssues.roomId], references: [rooms.id] }),
  reportedBy: one(users, { fields: [maintenanceIssues.reportedByUserId], references: [users.id] }),
  logs: many(maintenanceLogs),
  landlordContacts: many(landlordContacts),
}));

export const maintenanceLogsRelations = relations(maintenanceLogs, ({ one }) => ({
  issue: one(maintenanceIssues, { fields: [maintenanceLogs.issueId], references: [maintenanceIssues.id] }),
  changedBy: one(users, { fields: [maintenanceLogs.changedByUserId], references: [users.id] }),
}));

export const landlordContactsRelations = relations(landlordContacts, ({ one }) => ({
  apartment: one(apartments, { fields: [landlordContacts.apartmentId], references: [apartments.id] }),
  issue: one(maintenanceIssues, { fields: [landlordContacts.issueId], references: [maintenanceIssues.id] }),
  contactedBy: one(users, { fields: [landlordContacts.contactedByUserId], references: [users.id] }),
}));

// ── Notifications ─────────────────────────────────────

export const notificationTypeEnum = pgEnum("notification_type", [
  "chore_reminder",
  "chore_overdue",
  "chore_nudge",
  "expense_added",
  "settle_up_reminder",
  "low_stock",
  "rent_due",
  "maintenance_followup",
  "weekly_summary",
  "house_rule_vote",
  "dispute_raised",
]);

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  apartmentId: text("apartment_id").notNull().references(() => apartments.id),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body").notNull(),
  referenceId: text("reference_id"),
  read: boolean("read").default(false).notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export const notificationPreferences = pgTable("notification_preferences", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique().references(() => users.id),
  choreReminders: boolean("chore_reminders").default(true).notNull(),
  expenseAlerts: boolean("expense_alerts").default(true).notNull(),
  settleReminders: boolean("settle_reminders").default(true).notNull(),
  weeklyDigest: boolean("weekly_digest").default(true).notNull(),
  nudgesEnabled: boolean("nudges_enabled").default(true).notNull(),
  settleThresholdCents: integer("settle_threshold_cents").default(1000).notNull(),
  quietHoursStart: varchar("quiet_hours_start", { length: 5 }).default("22:00").notNull(),
  quietHoursEnd: varchar("quiet_hours_end", { length: 5 }).default("08:00").notNull(),
});

// Recurring chore template (for auto-generating next occurrence)
export const choreTemplates = pgTable("chore_templates", {
  id: text("id").primaryKey(),
  apartmentId: text("apartment_id").notNull().references(() => apartments.id),
  roomId: text("room_id").notNull().references(() => rooms.id),
  name: varchar("name", { length: 100 }).notNull(),
  points: integer("points").default(1).notNull(),
  assignmentMode: assignmentModeEnum("assignment_mode").default("rotating").notNull(),
  frequencyDays: integer("frequency_days").default(7).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
  apartment: one(apartments, { fields: [notifications.apartmentId], references: [apartments.id] }),
}));

export const choreTemplatesRelations = relations(choreTemplates, ({ one }) => ({
  apartment: one(apartments, { fields: [choreTemplates.apartmentId], references: [apartments.id] }),
  room: one(rooms, { fields: [choreTemplates.roomId], references: [rooms.id] }),
}));
