export type RoomType =
  | "kitchen"
  | "living"
  | "bathroom"
  | "hallway"
  | "balcony"
  | "laundry"
  | "custom";

export type RoomStatus = "Clean" | "Acceptable" | "NeedsAttention" | "Overdue";

export interface Room {
  id: string;
  apartmentId: string;
  name: string;
  type: RoomType;
  status: RoomStatus;
  lastCleanedAt: Date | null;
  createdAt: Date;
}

export const ROOM_STATUS_COLOR: Record<RoomStatus, string> = {
  Clean: "#22c55e",
  Acceptable: "#84cc16",
  NeedsAttention: "#f59e0b",
  Overdue: "#ef4444",
};

export const ROOM_TYPE_LABEL: Record<RoomType, string> = {
  kitchen: "Kitchen",
  living: "Living Room",
  bathroom: "Bathroom",
  hallway: "Hallway",
  balcony: "Balcony",
  laundry: "Laundry",
  custom: "Custom",
};
