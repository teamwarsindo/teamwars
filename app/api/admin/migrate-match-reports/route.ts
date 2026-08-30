// app/api/admin/migrate-match-reports/route.ts
import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// Helper slug generator
function generateSlug(text: string): string {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function runMigration() {
  // 1. Ambil data master schedules dari key yang tepat di KV
  const rawSchedules = await kv.get<any>('twi:schedules');

  // Handle jika data tersimpan sebagai JSON string atau Array
  const schedules: any[] = typeof rawSchedules === 'string' ? JSON.parse(rawSchedules) : rawSchedules;

  if (!schedules || !Array.isArray(schedules)) {
    return NextResponse.json(
      { success: false, error: 'Key twi:schedules tidak ditemukan atau bukan array di KV' },
      { status: 404 }
    );
  }

  const updatedMatches: string[] = [];

  for (const match of schedules) {
    if (!match.id) continue;

    const reportKey = `match:report:${match.id}`;
    const existingReport = await kv.get<any>(reportKey);

    // Ambil tanggal ISO (YYYY-MM-DD)
    const matchDateStr = match.matchDate ? match.matchDate.split('T')[0] : '';

    // 1. Metadata murni
    const metadata = {
      date: matchDateStr || existingReport?.metadata?.date || '',
      streamPlatform: match.streamPlatform || existingReport?.metadata?.streamPlatform || 'YouTube',
      streamer: match.streamer || existingReport?.metadata?.streamer || '',
      referee: match.referee || match.judge || existingReport?.metadata?.referee || existingReport?.metadata?.judge || '',
      streamUrl: match.streamUrl || existingReport?.metadata?.streamUrl || '',
    };

    // 2. Format & Bersihkan Lineup
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

    const scoreA = existingReport?.teamA?.score ?? match.scoreA ?? 0;
    const scoreB = existingReport?.teamB?.score ?? match.scoreB ?? 0;

    // 3. Susun dokumen final murni
    const cleanReport = {
      matchId: match.id,
      week: match.week ?? existingReport?.week ?? 1,
      metadata,
      teamA: {
        name: teamAName,
        slug: generateSlug(teamAName),
        score: scoreA,
        repeatsUsed: existingReport?.teamA?.repeatsUsed ?? 0,
        warningsUsed: existingReport?.teamA?.warningsUsed ?? 0,
        lineup: formatLineup(existingReport?.teamA?.lineup),
      },
      teamB: {
        name: teamBName,
        slug: generateSlug(teamBName),
        score: scoreB,
        repeatsUsed: existingReport?.teamB?.repeatsUsed ?? 0,
        warningsUsed: existingReport?.teamB?.warningsUsed ?? 0,
        lineup: formatLineup(existingReport?.teamB?.lineup),
      },
      games: existingReport?.games || [],
      finalScore: {
        teamA: existingReport?.finalScore?.teamA ?? scoreA,
        teamB: existingReport?.finalScore?.teamB ?? scoreB,
      },
      winnerTeam: existingReport?.winnerTeam || null,
      isFinished: existingReport?.isFinished ?? match.isFinished ?? false,
    };

    // Simpan / Buat key baru di KV
    await kv.set(reportKey, cleanReport);
    updatedMatches.push(reportKey);
  }

  return NextResponse.json({
    success: true,
    message: `Migrasi selesai. Total ${updatedMatches.length} match report berhasil disinkronkan.`,
    updatedKeys: updatedMatches,
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
