export const normalizeKey = (str?: any): string =>
  String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "");

export function calculateBestDeck(
  deckStatsMap: Map<string, { wins: number; losses: number }>
): string {
  if (deckStatsMap.size === 0) return "-";

  const entries = Array.from(deckStatsMap.entries());

  entries.sort((a, b) => {
    const statA = a[1];
    const statB = b[1];

    if (statB.wins !== statA.wins) return statB.wins - statA.wins;
    if (statA.losses !== statB.losses) return statA.losses - statB.losses;
    const totalA = statA.wins + statA.losses;
    const totalB = statB.wins + statB.losses;
    return totalB - totalA;
  });

  return entries[0][0] || "-";
      }
