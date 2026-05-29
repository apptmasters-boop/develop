export function formatFeedEventLabel(type: string, actorName: string): string {
  const labels: Record<string, string> = {
    expense_added: `${actorName} added an expense`,
    expense_settled: `${actorName} settled a balance`,
    chore_completed: `${actorName} completed a chore`,
    chore_overdue: "A chore is overdue",
    maintenance_reported: `${actorName} reported a maintenance issue`,
    rule_proposed: `${actorName} proposed a house rule`,
    rule_passed: "A house rule passed",
    member_joined: `${actorName} joined the apartment`,
    member_left: `${actorName} moved out`,
    grocery_purchased: `${actorName} bought groceries`,
    inventory_low: "A supply is running low",
  };
  return labels[type] ?? type;
}
