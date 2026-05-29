export type CalendarEventType =
  | "guest_visit"
  | "maintenance"
  | "rent_due"
  | "vacation"
  | "house_meeting"
  | "lease_renewal"
  | "other";

export interface CalendarEvent {
  id: string;
  apartmentId: string;
  createdBy: string;
  title: string;
  type: CalendarEventType;
  startDate: Date;
  endDate: Date | null;
  allDay: boolean;
  notes: string | null;
  createdAt: Date;
}
