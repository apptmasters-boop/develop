import { apiFetch } from "../client";

export const maintenanceApi = {
  list(token: string) {
    return apiFetch<unknown[]>("/api/maintenance", { token });
  },

  report(
    data: {
      roomId?: string;
      description: string;
      urgency?: "low" | "medium" | "high" | "emergency";
      photoUrls?: string[];
    },
    token: string
  ) {
    return apiFetch<{ id: string; description: string }>("/api/maintenance", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    });
  },

  updateStatus(
    issueId: string,
    data: { status: string; note?: string },
    token: string
  ) {
    return apiFetch<{ success: boolean }>(`/api/maintenance/${issueId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      token,
    });
  },

  logLandlordContact(
    data: {
      issueId?: string;
      method: "phone" | "email" | "in-person" | "text";
      summary: string;
      promise?: string;
      contactedAt: string;
    },
    token: string
  ) {
    return apiFetch<{ id: string }>("/api/maintenance/contacts", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    });
  },

  getContacts(token: string) {
    return apiFetch<unknown[]>("/api/maintenance/contacts", { token });
  },
};
