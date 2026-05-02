export type RoomStatus = "Clean" | "Acceptable" | "NeedsAttention" | "Overdue";
export type InventoryLevel = "Stocked" | "Low" | "Out";
export type UserRole = "admin" | "member" | "guest";

export interface Apartment {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: Date;
  adminId: string;
}

export interface Room {
  id: string;
  apartmentId: string;
  name: string;
  type: "kitchen" | "living" | "bathroom" | "hallway" | "balcony" | "laundry" | "custom";
  status: RoomStatus;
  lastCleanedAt: Date | null;
}

export interface ApartmentMember {
  id: string;
  apartmentId: string;
  userId: string;
  role: UserRole;
  moveInDate: Date;
  roomAssignment: string | null;
  vacationMode: boolean;
  vacationStart: Date | null;
  vacationEnd: Date | null;
  dietaryFlags: string[];
  status: "active" | "former";
}

export interface ApartmentPulse {
  memberId: string;
  emoji: string;
  week: string;
}
