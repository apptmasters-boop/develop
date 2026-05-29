export type TriggerEvent = {
  type: string;
  apartmentId: string;
  payload: Record<string, unknown>;
};

export function matchesTrigger(event: TriggerEvent, triggerType: string): boolean {
  return event.type === triggerType;
}
