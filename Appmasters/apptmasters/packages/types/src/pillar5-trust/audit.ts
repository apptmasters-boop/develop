export type AuditAction =
  | "expense_created"
  | "expense_disputed"
  | "expense_forgiven"
  | "settlement_confirmed"
  | "chore_completed"
  | "chore_photo_submitted"
  | "rule_proposed"
  | "rule_voted"
  | "rule_passed"
  | "member_joined"
  | "member_removed"
  | "admin_transferred"
  | "violation_flagged"
  | "landlord_entry_logged"
  | "data_exported";

export interface AuditEntry {
  id: string;
  apartmentId: string;
  actorUserId: string;
  action: AuditAction;
  referenceId: string | null;
  referenceType: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}
