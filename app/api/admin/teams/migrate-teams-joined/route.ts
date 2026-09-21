import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic';

// Daftar pemain hasil rekap transfer beserta slug timnya
const TARGET_PLAYERS: Array<{ ign: string; slug: string }> = [
  { ign: '[K]DARKLORD', slug: 'kings-united' },
  { ign: '[T]Diend', slug: 'true-god' },
  { ign: '[T]Gobz', slug: 'true-god' },
  { ign: 'FPF Shintaro', slug: 'fpf-fabulous' },
  { ign: 'Arion', slug: 'final-chapter' },
  { ign: 'KIY', slug: 'asashin-og' },
  { ign: 'DanePeo凉ᶠᵖᶠ', slug: 'fpf-fabulous' },
  { ign: 'Dixon', slug: 'supernova' },
  { ign: 'Joestar', slug: 'supernova' },
  { ign: 'mikoto', slug: 'ux-dino-rampage' },
  { ign: 'kitarozombie', slug: 'final-chapter' },
  { ign: 'iSekkuu', slug: 'licht-united' },
  { ign: 'Pak Malik', slug: 'licht-dracarys' },
  { ign: '[T]Bee', slug: 'true-god' },
  { ign: 'FPF Dioscuri', slug: 'fpf-fabulous' },
  { ign: 'zxpro', slug: 'licht-dracarys' },
];

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode'); // 'all' untuk semua roster tim, atau default hanya 16 player target

    // Kumpulkan slug unik
    const targetSlugs = Array.from(new Set(TARGET_PLAYERS.map((p) => p.slug)));

    const results: any[] = [];

    for (const slug of targetSlugs) {
      const key = `teams:${slug}`;
      const rawPlayers = await kv.hget<any>(key, 'players');

      if (!rawPlayers) {
        results.push({ slug, status: 'skipped', reason: 'Field players tidak ditemukan' });
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
        const playerIgn = String(player.ign || '').toLowerCase().trim();

        // Cek apakah player ini ada di daftar target (atau jika mode=all, pasang ke semua player)
        const isTarget =
          mode === 'all' ||
          TARGET_PLAYERS.some(
            (t) => t.slug === slug && t.ign.toLowerCase().trim() === playerIgn
          );

        if (isTarget) {
          hasChanges = true;
          return {
            ...player,
            teamsJoinedCount: player.teamsJoinedCount ?? 1,
          };
        }

        return player;
      });

      if (hasChanges) {
        // Simpan kembali string JSON array ke hash Upstash KV
        await kv.hset(key, {
          players: JSON.stringify(updatedPlayers),
          updatedAt: new Date().toISOString(),
        });

        results.push({
          slug,
          status: 'updated',
          updatedCount: updatedPlayers.filter((p) => p.teamsJoinedCount !== undefined).length,
        });
      } else {
        results.push({ slug, status: 'no_change' });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Migrasi teamsJoinedCount selesai!',
      results,
    });
  } catch (error: any) {
    console.error('Error migrate-teams-joined:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal migrasi data' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
