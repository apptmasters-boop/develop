export function calculateChorePoints(
  completions: Array<{ userId: string; points: number }>,
  windowDays = 30
): Record<string, number> {
  return completions.reduce<Record<string, number>>((acc, { userId, points }) => {
    acc[userId] = (acc[userId] ?? 0) + points;
    return acc;
  }, {});
}
