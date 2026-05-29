import type { RoomStatus } from "@apptmasters/types";

export function getRoomStatusFromLastCleaned(lastCleanedAt: Date | null): RoomStatus {
  if (!lastCleanedAt) return "Overdue";
  const daysSince = (Date.now() - lastCleanedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince < 3) return "Clean";
  if (daysSince < 7) return "Acceptable";
  if (daysSince < 14) return "NeedsAttention";
  return "Overdue";
}
