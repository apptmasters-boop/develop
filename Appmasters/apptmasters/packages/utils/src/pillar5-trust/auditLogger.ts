import type { AuditEntry, AuditAction } from "@apptmasters/types";

export function buildAuditEntry(
  apartmentId: string,
  actorUserId: string,
  action: AuditAction,
  referenceId?: string,
  referenceType?: string,
  metadata: Record<string, unknown> = {}
): Omit<AuditEntry, "id"> {
  return {
    apartmentId,
    actorUserId,
    action,
    referenceId: referenceId ?? null,
    referenceType: referenceType ?? null,
    metadata,
    createdAt: new Date(),
  };
}
