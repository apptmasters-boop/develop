export type MaintenanceStatus = "Reported" | "InProgress" | "Resolved" | "Closed";

export interface MaintenanceIssue {
  id: string;
  apartmentId: string;
  roomId: string;
  reportedByUserId: string;
  description: string;
  photoUrls: string[];
  status: MaintenanceStatus;
  statusHistory: StatusChange[];
  createdAt: Date;
  resolvedAt: Date | null;
}

export interface StatusChange {
  status: MaintenanceStatus;
  changedByUserId: string;
  note: string;
  changedAt: Date;
}

export interface LandlordContact {
  id: string;
  apartmentId: string;
  issueId: string | null;
  contactedByUserId: string;
  method: "phone" | "email" | "in-person" | "text";
  summary: string;
  promise: string | null;
  contactedAt: Date;
}

export interface MoveOutChecklist {
  id: string;
  apartmentId: string;
  roomId: string;
  beforePhotoUrls: string[];
  afterPhotoUrls: string[];
  signedByUserIds: string[];
  exportedAt: Date | null;
  createdAt: Date;
}
