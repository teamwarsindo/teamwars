/**
 * Memecah nama deck ke archetype resmi dari master KV twi:master-archetypes.
 * Mengutamakan nama archetype terpanjang (multi-kata) terlebih dahulu.
 */
export function extractArchetypesFromMaster(
  deckName: string,
  masterArchetypes: string[] = []
): string[] {
  if (!deckName || typeof deckName !== "string") return [];

  let text = deckName.trim();
  if (!text || text === "-") return [];

  if (!Array.isArray(masterArchetypes) || masterArchetypes.length === 0) {
    return [text];
  }

  // 1. Sortir dari karakter terpanjang agar multi-kata dicek duluan
  const sortedMasters = [...masterArchetypes].sort((a, b) => b.length - a.length);

  const found: string[] = [];

  for (const master of sortedMasters) {
    const trimmedMaster = master.trim();
    if (!trimmedMaster) continue;

    // Escape karakter regex (tanda petik, minus, dll)
    const escaped = trimmedMaster.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    
    // Boundary check yang aman untuk spasi & tanda hubung
    const regex = new RegExp(`(^|[^a-zA-Z0-9_-])(${escaped})([^a-zA-Z0-9_-]|$)`, "i");

    if (regex.test(text)) {
      found.push(trimmedMaster);
      // Ganti kata yang cocok dengan separator spasi agar tidak dicocokkan ulang oleh kata tunggal
      text = text.replace(new RegExp(escaped, "gi"), " ");
    }
  }

  // Jika ada teks yang belum cocok dengan master KV sama sekali
  const remainder = text.trim();
  if (found.length === 0 && remainder) {
    return [remainder];
  }

  return found;
}
