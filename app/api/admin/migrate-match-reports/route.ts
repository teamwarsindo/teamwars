// app/api/admin/migrate-match-reports/route.ts
import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

function generateSlug(text: string): string {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function runMigration() {
  const rawSchedules = await kv.get<any>('twi:schedules');
  const schedules: any[] = typeof rawSchedules === 'string' ? JSON.parse(rawSchedules) : rawSchedules;

  if (!schedules || !Array.isArray(schedules)) {
    return NextResponse.json(
      { success: false, error: 'Key twi:schedules tidak ditemukan di KV' },
      { status: 404 }
    );
  }

  // Format YYYY-MM-DD hari ini (WIB)
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

  const processedMatches: string[] = [];
  const deletedFutureMatches: string[] = [];

  for (const match of schedules) {
    if (!match.id) continue;

    const reportKey = `match:report:${match.id}`;
    const matchDateStr = match.matchDate ? match.matchDate.split('T')[0] : '';

    // Jika tanggal match lebih dari hari ini, hapus jika ada di KV dan lewati
    if (matchDateStr && matchDateStr > todayStr) {
      const exists = await kv.exists(reportKey);
      if (exists) {
        await kv.del(reportKey);
        deletedFutureMatches.push(reportKey);
      }
      continue;
    }

    const existingReport = await kv.get<any>(reportKey);

    const metadata = {
      date: matchDateStr || existingReport?.metadata?.date || '',
      streamPlatform: match.streamPlatform || existingReport?.metadata?.streamPlatform || 'YouTube',
      streamer: match.streamer || existingReport?.metadata?.streamer || '',
      referee: match.referee || match.judge || existingReport?.metadata?.referee || existingReport?.metadata?.judge || '',
      streamUrl: match.streamUrl || existingReport?.metadata?.streamUrl || '',
    };

    const formatLineup = (lineup: any[] = []) => {
      return lineup.map((player) => ({
        ign: player.ign || '',
        idDuelLinks: player.idDuelLinks || player.dlId || '',
        totalWins: player.totalWins ?? 0,
        totalLosses: player.totalLosses ?? 0,
        remainingLife: player.remainingLife ?? 2,
        deck1: player.deck1
          ? {
              archetype: player.deck1.archetype || '',
              skill: player.deck1.skill || '',
              wins: player.deck1.wins ?? 0,
              losses: player.deck1.losses ?? 0,
              isDead: player.deck1.isDead ?? false,
              isRepeatUsed: player.deck1.isRepeatUsed ?? false,
              lastGameNumber: player.deck1.lastGameNumber ?? null,
            }
          : null,
        deck2: player.deck2
          ? {
              archetype: player.deck2.archetype || '',
              skill: player.deck2.skill || '',
              wins: player.deck2.wins ?? 0,
              losses: player.deck2.losses ?? 0,
              isDead: player.deck2.isDead ?? false,
              isRepeatUsed: player.deck2.isRepeatUsed ?? false,
              lastGameNumber: player.deck2.lastGameNumber ?? null,
            }
          : null,
      }));
    };

    const teamAName = match.teamAName || match.teamAId || existingReport?.teamA?.name || '';
    const teamBName = match.teamBName || match.teamBId || existingReport?.teamB?.name || '';

    // Skor direset 0, isFinished false
    const cleanReport = {
      matchId: match.id,
      week: match.week ?? existingReport?.week ?? 1,
      metadata,
      teamA: {
        name: teamAName,
        slug: generateSlug(teamAName),
        score: existingReport?.teamA?.score ?? 0,
        repeatsUsed: existingReport?.teamA?.repeatsUsed ?? 0,
        warningsUsed: existingReport?.teamA?.warningsUsed ?? 0,
        lineup: formatLineup(existingReport?.teamA?.lineup),
      },
      teamB: {
        name: teamBName,
        slug: generateSlug(teamBName),
        score: existingReport?.teamB?.score ?? 0,
        repeatsUsed: existingReport?.teamB?.repeatsUsed ?? 0,
        warningsUsed: existingReport?.teamB?.warningsUsed ?? 0,
        lineup: formatLineup(existingReport?.teamB?.lineup),
      },
      games: existingReport?.games || [],
      finalScore: {
        teamA: existingReport?.teamA?.score ?? 0,
        teamB: existingReport?.teamB?.score ?? 0,
      },
      winnerTeam: null,
      isFinished: false,
    };

    await kv.set(reportKey, cleanReport);
    processedMatches.push(reportKey);
  }

  return NextResponse.json({
    success: true,
    message: `Migrasi selesai. ${processedMatches.length} match aktif disinkronkan, ${deletedFutureMatches.length} match masa depan dibersihkan.`,
    activeMatches: processedMatches,
    removedFutureMatches: deletedFutureMatches,
  });
}

export async function GET() {
  try {
    return await runMigration();
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menjalankan migrasi' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    return await runMigration();
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menjalankan migrasi' },
      { status: 500 }
    );
  }
    }
