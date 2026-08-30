import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { refreshTeamEmbeds } from '@/lib/discord/services/transfer-logger';
import { parsePlayers, formatDuelId, cleanDuelId } from '@/lib/discord/services/transfer-service';

export async function GET() {
  try {
    const teamSlug = 'kings-united'; // Slug tim Kings United
    const targetDiscord = 'joko_888'; // Target pemain [K]JJJ
    const originalDlFormatted = '409-959-068';
    const originalDlClean = cleanDuelId(originalDlFormatted);

    const wrongDlFormatted = '162-193-119';
    const wrongDlClean = cleanDuelId(wrongDlFormatted);

    const key = `teams:${teamSlug}`;
    const teamData = await kv.hgetall<any>(key);

    if (!teamData) {
      return NextResponse.json({ success: false, message: 'Data tim tidak ditemukan!' }, { status: 404 });
    }

    const players = parsePlayers(teamData.players);
    const player = players.find(
      (p) =>
        p.discord.toLowerCase() === targetDiscord.toLowerCase() ||
        p.ign.toLowerCase().includes('jjj')
    );

    if (!player) {
      return NextResponse.json({ success: false, message: 'Pemain [K]JJJ tidak ditemukan di roster!' }, { status: 404 });
    }

    // 1. Kembalikan ID Duel Links pemain ke ID awal
    player.idDuelLinks = originalDlFormatted;

    // 2. Bersihkan mapping ID yang salah & pasang kembali ID awal di global:duellinks
    await Promise.all([
      kv.hdel('global:duellinks', wrongDlClean),
      kv.hdel('global:duellinks', wrongDlFormatted),
      kv.hset('global:duellinks', {
        [originalDlClean]: teamSlug,
        [originalDlFormatted]: teamSlug,
      }),
    ]);

    // 3. Reset kuota transfer ke 0 numerik
    const resetQuota = 0;
    const nowIso = new Date().toISOString();

    await kv.hset(key, {
      players: JSON.stringify(players),
      transferQuotaUsed: resetQuota,
      updatedAt: nowIso,
    });

    teamData.updatedAt = nowIso;

    // 4. Update otomatis tampilan Embed Tracker Camp & Admin Roster
    await refreshTeamEmbeds(teamSlug, teamData, players, resetQuota);

    return NextResponse.json({
      success: true,
      message: 'Berhasil mengembalikan kondisi awal Kings United & [K]JJJ!',
      data: {
        player: player.ign,
        restoredId: player.idDuelLinks,
        transferQuotaUsed: resetQuota,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
