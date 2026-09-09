import { kv } from '@vercel/kv';

export interface ArchetypeSummary {
  counts: Record<string, number>;
  totalDuplicates: number;
  isExceeded: boolean;
  embedText: string | null;
}

/**
 * Longest Match First: Membedah nama deck menjadi archetype master terdaftar.
 */
export function extractArchetypesFromDeck(deckName: string, masterArchetypes: string[]): string[] {
  if (!deckName) return [];

  // Urutkan dari nama terpanjang ke terpendek
  const sortedMasters = [...masterArchetypes].sort((a, b) => b.length - a.length);

  const matched: string[] = [];
  let remainingText = deckName.toLowerCase();

  for (const master of sortedMasters) {
    const target = master.toLowerCase();
    const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');

    if (regex.test(remainingText)) {
      matched.push(master);
      // Hapus potongan yang sudah cocok agar tidak bentrok
      remainingText = remainingText.replace(new RegExp(escaped, 'gi'), ' ');
    }
  }

  return matched;
}

/**
 * Menganalisis seluruh lineup aktif tim, menghitung duplikasi, dan merender teks embed.
 */
export async function evaluateTeamArchetypes(lineup: any[]): Promise<ArchetypeSummary> {
  const rawMasters = await kv.get<any>('twi:master-archetypes');
  const masterArchetypes: string[] = Array.isArray(rawMasters)
    ? rawMasters
    : typeof rawMasters === 'string'
    ? JSON.parse(rawMasters)
    : [];

  const counts: Record<string, number> = {};

  // Ambil semua deck yang terisi dari lineup pemain yang masih ada
  for (const p of lineup || []) {
    const d1 = p.deck1?.archetype?.trim();
    const d2 = p.deck2?.archetype?.trim();

    if (d1 && d1 !== '-') {
      for (const arch of extractArchetypesFromDeck(d1, masterArchetypes)) {
        counts[arch] = (counts[arch] || 0) + 1;
      }
    }
    if (d2 && d2 !== '-') {
      for (const arch of extractArchetypesFromDeck(d2, masterArchetypes)) {
        counts[arch] = (counts[arch] || 0) + 1;
      }
    }
  }

  // Saring hanya archetype yang duplikat (kemunculan >= 2)
  const duplicates = Object.entries(counts)
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1]);

  const totalDuplicates = duplicates.reduce((acc, [_, count]) => acc + count, 0);
  const isExceeded = totalDuplicates > 5;

  // Jika tidak ada duplikasi sama sekali, sembunyikan section
  if (duplicates.length === 0) {
    return {
      counts,
      totalDuplicates: 0,
      isExceeded: false,
      embedText: null,
    };
  }

  const lines: string[] = [];
  const header = isExceeded
    ? `📑 **Duplikasi Archetype (Total: ${totalDuplicates} / 5) ⚠️**`
    : `📑 **Duplikasi Archetype (Total: ${totalDuplicates} / 5)**`;

  lines.push(header);
  for (const [name, count] of duplicates) {
    lines.push(`• ${name}: ${count}`);
  }

  if (isExceeded) {
    lines.push(`🛑 *Harap ganti deck yang menggunakan archetype di atas.*`);
  }

  return {
    counts,
    totalDuplicates,
    isExceeded,
    embedText: lines.join('\n'),
  };
  }
