export type AutomationTrigger =
  | "chore_overdue"
  | "inventory_low"
  | "rent_due"
  | "rule_vote_deadline";

export interface Automation {
  id: string;
  apartmentId: string;
  trigger: AutomationTrigger;
  action: string;
  enabled: boolean;
  createdAt: Date;
}
