import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function POST(req: Request) {
  try {
    // 1. Ambil semua ID tim yang terdaftar
    const teamIds: string[] = await redis.smembers('teams_index') || [];
    
    const validDiscords = new Set<string>();
    const validIgns = new Set<string>();
    const activePlayerKeys = new Set<string>();

    // 2. Kumpulkan semua Discord Username & IGN resmi dari seluruh tim aktif
    for (const id of teamIds) {
      const teamData: any = await redis.get(`team:${id}`);
      if (teamData && teamData.players && Array.isArray(teamData.players)) {
        teamData.players.forEach((p: any) => {
          if (p.discord) {
            const cleanDiscord = p.discord.toLowerCase().replace(/^@/, '').trim();
            validDiscords.add(cleanDiscord);
            activePlayerKeys.add(`player:${cleanDiscord}`);
          }
          if (p.ign) {
            validIgns.add(p.ign.toLowerCase().trim());
          }
        });
      }
    }

    // 3. Ambil data set global yang ada saat ini di Redis
    const currentDiscords: string[] = await redis.smembers('registered_discords') || [];
    const currentIgns: string[] = await redis.smembers('registered_igns') || [];

    // 4. Cari data yatim (ada di global set tetapi TIDAK ada di tim manapun)
    const orphanDiscords = currentDiscords.filter(
      (d) => !validDiscords.has(d.toLowerCase().replace(/^@/, '').trim())
    );
    const orphanIgns = currentIgns.filter(
      (ign) => !validIgns.has(ign.toLowerCase().trim())
    );

    // 5. Hapus data yatim dari set global
    if (orphanDiscords.length > 0) {
      await redis.srem('registered_discords', ...orphanDiscords);
      // Hapus juga key individual player jika ada
      for (const orphan of orphanDiscords) {
        const cleanOrphan = orphan.toLowerCase().replace(/^@/, '').trim();
        await redis.del(`player:${cleanOrphan}`);
      }
    }

    if (orphanIgns.length > 0) {
      await redis.srem('registered_igns', ...orphanIgns);
    }

    return NextResponse.json({
      success: true,
      message: 'Pembersihan data yatim selesai!',
      stats: {
        totalTimAktif: teamIds.length,
        totalPemainValid: validDiscords.size,
        sampahDiscordDihapus: orphanDiscords.length,
        sampahIgnDihapus: orphanIgns.length,
        listDiscordDihapus: orphanDiscords,
        listIgnDihapus: orphanIgns,
      },
    });
  } catch (error: any) {
    console.error('Error cleanup orphans:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
