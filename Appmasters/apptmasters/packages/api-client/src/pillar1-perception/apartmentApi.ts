import { apiFetch } from "../client";
import type { Apartment, ApartmentMember } from "@apptmasters/types";

export const apartmentApi = {
  create(name: string, token: string) {
    return apiFetch<{ id: string; name: string; inviteCode: string }>(
      "/api/apartment",
      { method: "POST", body: JSON.stringify({ name }), token }
    );
  },

  get(token: string) {
    return apiFetch<Apartment>("/api/apartment", { token });
  },

  join(inviteCode: string, token: string) {
    return apiFetch<{ apartmentId: string; name: string }>(
      "/api/apartment/join",
      { method: "POST", body: JSON.stringify({ inviteCode }), token }
    );
  },

  getMembers(token: string) {
    return apiFetch<ApartmentMember[]>("/api/apartment/members", { token });
  },

  removeMember(userId: string, token: string) {
    return apiFetch<{ success: boolean }>(
      `/api/apartment/members/${userId}`,
      { method: "DELETE", token }
    );
  },

  transferAdmin(newAdminId: string, token: string) {
    return apiFetch<{ success: boolean }>(
      "/api/apartment/transfer-admin",
      { method: "POST", body: JSON.stringify({ newAdminId }), token }
    );
  },
};
