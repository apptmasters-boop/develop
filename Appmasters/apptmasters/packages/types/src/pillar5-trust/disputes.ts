export type DisputeStatus = "open" | "under_review" | "resolved" | "forgiven";
export type DisputeSubject = "expense" | "chore" | "rule" | "admin_action";

export interface Dispute {
  id: string;
  apartmentId: string;
  raisedByUserId: string;
  subject: DisputeSubject;
  referenceId: string;
  description: string;
  status: DisputeStatus;
  log: DisputeLogEntry[];
  resolvedAt: Date | null;
  createdAt: Date;
}

export interface DisputeLogEntry {
  userId: string;
  action: string;
  note: string;
  timestamp: Date;
}

export interface BalanceLock {
  userId: string;
  apartmentId: string;
  lockedAt: Date;
  reason: string;
  unlockedAt: Date | null;
  unlockedByConsensus: boolean;
}
