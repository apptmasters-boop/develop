import { apiFetch } from "../client";
import type { Chore, ChoreSwapRequest, WorkloadSummary } from "@apptmasters/types";

export const choresApi = {
  list(token: string, params: { roomId?: string; mine?: boolean; today?: boolean } = {}) {
    const qs = new URLSearchParams();
    if (params.roomId) qs.set("roomId", params.roomId);
    if (params.mine) qs.set("mine", "true");
    if (params.today) qs.set("today", "true");
    return apiFetch<Chore[]>(`/api/chores?${qs}`, { token });
  },

  create(
    data: {
      roomId: string;
      name: string;
      points?: number;
      assignmentMode?: "rotating" | "fixed" | "voluntary";
      assignedToUserId?: string | null;
      dueAt: string;
    },
    token: string
  ) {
    return apiFetch<{ id: string; name: string; assignedToUserId: string | null }>(
      "/api/chores",
      { method: "POST", body: JSON.stringify(data), token }
    );
  },

  complete(choreId: string, token: string, photoUrl?: string) {
    return apiFetch<{ success: boolean; points: number }>(
      `/api/chores/${choreId}/complete`,
      { method: "POST", body: JSON.stringify({ photoUrl }), token }
    );
  },

  requestSwap(choreId: string, requestedToUserId: string, token: string) {
    return apiFetch<{ id: string }>(
      `/api/chores/${choreId}/swap-request`,
      { method: "POST", body: JSON.stringify({ requestedToUserId }), token }
    );
  },

  resolveSwap(swapId: string, accept: boolean, token: string) {
    return apiFetch<{ success: boolean; accepted: boolean }>(
      `/api/chores/swap/${swapId}`,
      { method: "PATCH", body: JSON.stringify({ accept }), token }
    );
  },

  getWorkload(token: string) {
    return apiFetch<WorkloadSummary[]>("/api/chores/workload", { token });
  },

  delete(choreId: string, token: string) {
    return apiFetch<{ success: boolean }>(`/api/chores/${choreId}`, {
      method: "DELETE",
      token,
    });
  },
};
