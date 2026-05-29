import { apiFetch } from "../client";

export type BalanceSummary = {
  userId: string;
  name: string;
  color: string | null;
  net: number;
  owes: number;
  paid: number;
};

export type DebtSuggestion = { fromUserId: string; toUserId: string; amount: number };

export const financesApi = {
  list(token: string) {
    return apiFetch<unknown[]>("/api/finances", { token });
  },

  add(
    data: {
      description: string;
      amount: number;
      category?: string;
      splitMethod?: "equal" | "custom" | "percentage" | "single";
      participants: string[];
      customAmounts?: Record<string, number>;
    },
    token: string
  ) {
    return apiFetch<{ id: string; amount: number; description: string }>(
      "/api/finances",
      { method: "POST", body: JSON.stringify(data), token }
    );
  },

  delete(expenseId: string, token: string) {
    return apiFetch<{ success: boolean }>(`/api/finances/${expenseId}`, {
      method: "DELETE",
      token,
    });
  },

  getBalance(token: string) {
    return apiFetch<BalanceSummary[]>("/api/finances/balance", { token });
  },

  simplify(token: string) {
    return apiFetch<DebtSuggestion[]>("/api/finances/simplify", { token });
  },

  settle(data: { toUserId: string; amount: number; note?: string }, token: string) {
    return apiFetch<{ id: string }>("/api/finances/settle", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    });
  },

  confirmSettlement(settlementId: string, token: string) {
    return apiFetch<{ success: boolean }>(
      `/api/finances/settle/${settlementId}/confirm`,
      { method: "POST", token }
    );
  },

  getSettlements(token: string) {
    return apiFetch<unknown[]>("/api/finances/settlements", { token });
  },

  listRecurring(token: string) {
    return apiFetch<unknown[]>("/api/finances/recurring", { token });
  },

  addRecurring(
    data: {
      description: string;
      amount: number;
      splitMethod?: string;
      dayOfMonth?: number;
      participants: string[];
    },
    token: string
  ) {
    return apiFetch<{ id: string; description: string }>(
      "/api/finances/recurring",
      { method: "POST", body: JSON.stringify(data), token }
    );
  },

  updateRecurring(
    id: string,
    data: { active?: boolean; amount?: number; dayOfMonth?: number },
    token: string
  ) {
    return apiFetch<{ success: boolean }>(`/api/finances/recurring/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      token,
    });
  },
};
