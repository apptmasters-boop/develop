export type UserRole = "admin" | "member" | "guest";

export interface Apartment {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: Date;
  adminId: string;
}

export interface ApartmentMemberWithUser extends ApartmentMember {
  user: { id: string; name: string; email: string; avatarUrl: string | null; color: string };
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
