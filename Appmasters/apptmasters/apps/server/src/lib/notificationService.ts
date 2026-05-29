import { eq } from "drizzle-orm";
import { db, notifications, notificationPreferences } from "../db";
import { generateId } from "./id";

type NotificationType =
  | "chore_reminder" | "chore_overdue" | "chore_nudge"
  | "expense_added" | "settle_up_reminder" | "low_stock"
  | "rent_due" | "maintenance_followup" | "weekly_summary"
  | "house_rule_vote" | "dispute_raised";

type PrefKey = "choreReminders" | "expenseAlerts" | "settleReminders" | "weeklyDigest" | "nudgesEnabled";

const TYPE_TO_PREF: Partial<Record<NotificationType, PrefKey>> = {
  chore_reminder: "choreReminders",
  chore_overdue: "choreReminders",
  chore_nudge: "nudgesEnabled",
  expense_added: "expenseAlerts",
  settle_up_reminder: "settleReminders",
  weekly_summary: "weeklyDigest",
};

export async function createNotification(
  userId: string,
  apartmentId: string,
  type: NotificationType,
  title: string,
  body: string,
  referenceId?: string
): Promise<void> {
  const prefKey = TYPE_TO_PREF[type];
  if (prefKey) {
    const prefs = await db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, userId),
    });
    if (prefs && !prefs[prefKey]) return;
  }

  await db.insert(notifications).values({
    id: generateId(),
    userId,
    apartmentId,
    type,
    title,
    body,
    referenceId: referenceId ?? null,
  });
}

export async function createNotificationForMembers(
  memberUserIds: string[],
  apartmentId: string,
  type: NotificationType,
  title: string,
  body: string,
  referenceId?: string
): Promise<void> {
  await Promise.all(
    memberUserIds.map((uid) =>
      createNotification(uid, apartmentId, type, title, body, referenceId)
    )
  );
}
