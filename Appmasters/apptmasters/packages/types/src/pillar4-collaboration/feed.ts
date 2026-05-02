export type FeedEventType =
  | "expense_added"
  | "balance_settled"
  | "chore_completed"
  | "chore_overdue"
  | "issue_reported"
  | "issue_resolved"
  | "rule_passed"
  | "item_low"
  | "roommate_announcement"
  | "roommate_joined"
  | "roommate_left"
  | "vacation_mode"
  | "chore_swap";

export type FeedReaction = "thumbs_up" | "noted" | "question";

export interface FeedEvent {
  id: string;
  apartmentId: string;
  type: FeedEventType;
  actorUserId: string;
  message: string;
  referenceId: string | null;
  referenceType: string | null;
  reactions: FeedReactionRecord[];
  createdAt: Date;
}

export interface FeedReactionRecord {
  userId: string;
  reaction: FeedReaction;
}

export interface Announcement {
  id: string;
  apartmentId: string;
  postedByUserId: string;
  message: string;
  reactions: FeedReactionRecord[];
  createdAt: Date;
}
