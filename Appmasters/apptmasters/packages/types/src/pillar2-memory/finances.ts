export type SplitMethod = "equal" | "custom" | "percentage" | "single";
export type ExpenseStatus = "active" | "disputed" | "settled" | "forgiven";

export interface Expense {
  id: string;
  apartmentId: string;
  addedByUserId: string;
  description: string;
  amount: number;
  category: string;
  splitMethod: SplitMethod;
  splits: ExpenseSplit[];
  isRecurring: boolean;
  recurringId: string | null;
  status: ExpenseStatus;
  createdAt: Date;
}

export interface ExpenseSplit {
  userId: string;
  amount: number;
  settled: boolean;
  settledAt: Date | null;
}

export interface RecurringExpense {
  id: string;
  apartmentId: string;
  description: string;
  amount: number;
  splitMethod: SplitMethod;
  dayOfMonth: number;
  participants: string[];
  active: boolean;
}

export interface Settlement {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  confirmedByBoth: boolean;
  createdAt: Date;
  confirmedAt: Date | null;
}

export interface DebtEdge {
  fromUserId: string;
  toUserId: string;
  amount: number;
}
