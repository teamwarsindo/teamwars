import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic';

interface TargetTransferPlayer {
  ign: string;
  slug: string;
  transferDate: string; // Tanggal resmi dari discord channel #transfer-news
}

// 16 Pemain Masuk Resmi (lengkap sesuai log pengumuman)
const TARGET_PLAYERS: TargetTransferPlayer[] = [
  // 13 Agustus 2026
  { ign: '[K]DARKLORD', slug: 'kings-united', transferDate: '2026-08-13' },
  { ign: '[T]Diend', slug: 'true-god', transferDate: '2026-08-13' },
  { ign: '[T]Gobz', slug: 'true-god', transferDate: '2026-08-13' },
  { ign: 'FPF Shintaro', slug: 'fpf-fabulous', transferDate: '2026-08-13' },
  { ign: 'Arion', slug: 'final-chapter', transferDate: '2026-08-13' },
  { ign: 'KIY', slug: 'asashin-og', transferDate: '2026-08-13' },
  { ign: 'DanePeo凉ᶠᵖᶠ', slug: 'fpf-fabulous', transferDate: '2026-08-13' },

  // 14 Agustus 2026
  { ign: 'Dixon', slug: 'supernova', transferDate: '2026-08-14' },
  { ign: 'Joestar', slug: 'supernova', transferDate: '2026-08-14' },

  // 19 Agustus 2026
  { ign: 'mikoto', slug: 'ux-dino-rampage', transferDate: '2026-08-19' },
  { ign: 'kitarozombie', slug: 'final-chapter', transferDate: '2026-08-19' }, // Sesuai log: kitarozmobie

  // 02 September 2026
  { ign: 'iSekkuu', slug: 'licht-united', transferDate: '2026-09-02' },

  // 06 September 2026
  { ign: 'Pak Malik', slug: 'licht-dracarys', transferDate: '2026-09-06' },

  // 09 September 2026
  { ign: '[T]Bee', slug: 'true-god', transferDate: '2026-09-09' },

  // 12 September 2026
  { ign: 'FPF Dioscuri', slug: 'fpf-fabulous', transferDate: '2026-09-12' },

  // 21 September 2026 (Pemain ke-16)
  { ign: 'zxpro', slug: 'licht-dracarys', transferDate: '2026-09-21' },
];

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isDryRun = searchParams.get('dryRun') === 'true';

    const targetSlugs = Array.from(new Set(TARGET_PLAYERS.map((p) => p.slug)));
    const results: any[] = [];

    for (const slug of targetSlugs) {
      const key = `teams:${slug}`;
      const rawPlayers = await kv.hget<any>(key, 'players');

      if (!rawPlayers) {
        results.push({ slug, status: 'skipped', reason: 'Field players tidak ditemukan di KV' });
        continue;
      }

      let playersList: any[] = [];
      if (typeof rawPlayers === 'string') {
        try {
          playersList = JSON.parse(rawPlayers);
        } catch {
          playersList = [];
        }
      } else if (Array.isArray(rawPlayers)) {
        playersList = rawPlayers;
      }

      let hasChanges = false;
      const updatedPlayers = playersList.map((player: any) => {
        const playerIgn = String(player.ign || player.name || '').toLowerCase().trim();

        // Cari data transfer pemain berdasarkan slug tim dan IGN (toleran terhadap spasi / variasi kitarozombie)
        const matchedTarget = TARGET_PLAYERS.find(
          (t) =>
            t.slug === slug &&
            (t.ign.toLowerCase().trim() === playerIgn ||
              (t.ign === 'kitarozmobie' && playerIgn.includes('kitaro')))
        );

        if (matchedTarget) {
          hasChanges = true;
          // Set transferDate sekaligus hapus teamsJoinedCount jika ingin digantikan sepenuhnya
          const { teamsJoinedCount, ...rest } = player;
          return {
            ...rest,
            isTransfer: true,
            transferDate: matchedTarget.transferDate,
          };
        }

        return player;
      });

      if (hasChanges) {
        if (!isDryRun) {
          await kv.hset(key, {
            players: JSON.stringify(updatedPlayers),
            updatedAt: new Date().toISOString(),
          });
        }

        results.push({
          slug,
          status: isDryRun ? 'simulated' : 'updated',
          updatedPlayers: updatedPlayers
            .filter((p) => p.transferDate)
            .map((p) => ({ ign: p.ign, transferDate: p.transferDate })),
        });
      } else {
        results.push({ slug, status: 'no_change' });
      }
    }

    return NextResponse.json({
      success: true,
      mode: isDryRun ? 'DRY_RUN' : 'APPLIED',
      message: 'Migrasi transferDate (16 Pemain) selesai!',
      results,
    });
  } catch (error: any) {
    console.error('Error migrate-transfer-date:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal migrasi data' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
               }
