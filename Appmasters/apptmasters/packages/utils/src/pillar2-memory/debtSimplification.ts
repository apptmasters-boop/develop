import type { DebtEdge } from "@apptmasters/types";

/**
 * Simplifies a debt graph using net-balance reduction.
 * If A owes B $10 and B owes C $10, suggests A pays C $10 directly.
 */
export function simplifyDebts(edges: DebtEdge[]): DebtEdge[] {
  const net = new Map<string, number>();

  for (const { fromUserId, toUserId, amount } of edges) {
    net.set(fromUserId, (net.get(fromUserId) ?? 0) - amount);
    net.set(toUserId, (net.get(toUserId) ?? 0) + amount);
  }

  const creditors: Array<{ id: string; amount: number }> = [];
  const debtors: Array<{ id: string; amount: number }> = [];

  for (const [id, balance] of net.entries()) {
    if (balance > 0) creditors.push({ id, amount: balance });
    else if (balance < 0) debtors.push({ id, amount: -balance });
  }

  const result: DebtEdge[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci];
    const debt = debtors[di];
    const amount = Math.min(credit.amount, debt.amount);
    result.push({ fromUserId: debt.id, toUserId: credit.id, amount });
    credit.amount -= amount;
    debt.amount -= amount;
    if (credit.amount === 0) ci++;
    if (debt.amount === 0) di++;
  }

  return result;
}
