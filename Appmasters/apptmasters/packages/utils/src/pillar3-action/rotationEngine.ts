import type { Chore, WorkloadSummary } from "@apptmasters/types";

/**
 * Determines the next assignee for a rotating chore based on
 * lowest point total in the last 30 days to keep workload balanced.
 */
export function getNextAssignee(
  workloads: WorkloadSummary[],
  excludeUserIds: string[] = []
): string | null {
  const eligible = workloads.filter((w) => !excludeUserIds.includes(w.userId));
  if (eligible.length === 0) return null;
  return eligible.sort((a, b) => a.pointsLast30Days - b.pointsLast30Days)[0].userId;
}

export function redistributeChores(
  chores: Chore[],
  departedUserId: string,
  availableUserIds: string[]
): Chore[] {
  if (availableUserIds.length === 0) return chores;
  return chores.map((chore, i) => {
    if (chore.assignedToUserId !== departedUserId) return chore;
    return {
      ...chore,
      assignedToUserId: availableUserIds[i % availableUserIds.length],
    };
  });
}
