import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export interface PlayerItem {
  role?: string;
  namaLengkap?: string;
  discord?: string;
  discordId?: string;
  ign?: string;
  idDuelLinks?: string;
  duelId?: string;
}

export interface TeamKVData {
  [key: string]: any;
  namaTim?: string;
  players?: string | PlayerItem[];
}

function parsePlayers(playersData: string | PlayerItem[] | undefined): PlayerItem[] {
  if (!playersData) return [];
  if (Array.isArray(playersData)) return playersData;
  try {
    return JSON.parse(playersData);
  } catch {
    return [];
  }
}

export async function GET() {
  return handleSync();
}

export async function POST() {
  return handleSync();
}

async function handleSync() {
  try {
    const teamSlugs = (await kv.smembers('global:teams')) || [];

    if (!teamSlugs || teamSlugs.length === 0) {
      return NextResponse.json({ message: 'Tidak ada tim terdaftar di global:teams' }, { status: 200 });
    }

    // Reset key global
    await Promise.all([
      kv.del('global:ign'),
      kv.del('global:duellinks'),
      kv.del('global:discord'),
      kv.del('global:discord_ids'),
    ]);

    let totalPlayersMigrated = 0;
    let totalTeamsProcessed = 0;

    for (const teamSlug of teamSlugs) {
      const teamData = await kv.hgetall<TeamKVData>(`teams:${teamSlug}`);
      if (!teamData) continue;

      const players = parsePlayers(teamData.players);
      if (players.length === 0) continue;

      totalTeamsProcessed++;

      for (const player of players) {
        const rawIgn = (player.ign || '').trim(); // 👈 SIMPAN CASING ASLI
        const rawDl = player.idDuelLinks || player.duelId || '';
        const cleanDl = rawDl.trim();
        const discordUser = (player.discord || '').trim(); // 👈 SIMPAN CASING ASLI
        const discordId = (player.discordId || '').trim();

        const updates: Promise<any>[] = [];

        if (rawIgn) {
          updates.push(kv.hset('global:ign', { [rawIgn]: teamSlug }));
        }
        if (cleanDl) {
          updates.push(kv.hset('global:duellinks', { [cleanDl]: teamSlug }));
        }
        if (discordUser) {
          updates.push(kv.hset('global:discord', { [discordUser]: teamSlug }));
        }
        if (discordId) {
          updates.push(kv.hset('global:discord_ids', { [discordId]: teamSlug }));
        }

        await Promise.all(updates);
        totalPlayersMigrated++;
      }
    }

    return NextResponse.json({
      success: true,
      message: '✅ Migrasi data Redis Global ke Hash berhasil dilakukan (Casing Asli)!',
      stats: {
        totalTeamsProcessed,
        totalPlayersMigrated,
      },
    });
  } catch (error: any) {
    console.error('Error Syncing Global Hash:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
