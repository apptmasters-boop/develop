export type AssignmentMode = "rotating" | "fixed" | "voluntary";
export type ChoreStatus = "pending" | "completed" | "overdue" | "swapped";

export interface Chore {
  id: string;
  apartmentId: string;
  roomId: string;
  name: string;
  points: number;
  assignmentMode: AssignmentMode;
  assignedToUserId: string | null;
  dueAt: Date;
  status: ChoreStatus;
  completedAt: Date | null;
  completedByUserId: string | null;
  photoUrl: string | null;
}

export interface ChoreSwapRequest {
  id: string;
  choreId: string;
  requestedByUserId: string;
  requestedToUserId: string;
  accepted: boolean | null;
  createdAt: Date;
  resolvedAt: Date | null;
}

export interface WorkloadSummary {
  userId: string;
  pointsLast30Days: number;
  choresDone: number;
  choresOverdue: number;
}
