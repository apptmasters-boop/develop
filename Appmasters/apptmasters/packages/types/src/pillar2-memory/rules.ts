export type RuleStatus = "proposed" | "active" | "archived";

export interface HouseRule {
  id: string;
  apartmentId: string;
  proposedBy: string;
  title: string;
  description: string;
  status: RuleStatus;
  version: number;
  votesFor: string[];
  votesAgainst: string[];
  voteDeadline: Date | null;
  createdAt: Date;
}

export interface SharedAgreement {
  id: string;
  apartmentId: string;
  key: string;
  value: string;
  updatedAt: Date;
}
