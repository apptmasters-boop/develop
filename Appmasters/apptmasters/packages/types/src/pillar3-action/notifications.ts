export type NotificationType =
  | "chore_reminder"
  | "chore_overdue"
  | "chore_nudge"
  | "expense_added"
  | "settle_up_reminder"
  | "low_stock"
  | "rent_due"
  | "maintenance_followup"
  | "weekly_summary"
  | "house_rule_vote"
  | "dispute_raised";

export interface Notification {
  id: string;
  userId: string;
  apartmentId: string;
  type: NotificationType;
  title: string;
  body: string;
  referenceId: string | null;
  read: boolean;
  sentAt: Date;
}

export interface NotificationPreferences {
  userId: string;
  choreReminders: boolean;
  expenseAlerts: boolean;
  settleReminders: boolean;
  weeklyDigest: boolean;
  nudgesEnabled: boolean;
  settleThresholdDollars: number;
  quietHoursStart: string;
  quietHoursEnd: string;
}
