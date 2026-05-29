export function canDepartClean(netBalance: number): boolean {
  return Math.abs(netBalance) < 0.01;
}

export function balanceLockMessage(netBalance: number): string {
  if (netBalance > 0) return `You are owed $${netBalance.toFixed(2)} — settle before departing.`;
  if (netBalance < 0) return `You owe $${Math.abs(netBalance).toFixed(2)} — settle before departing.`;
  return "Balance is clear.";
}
