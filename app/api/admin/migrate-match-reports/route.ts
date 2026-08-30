// app/api/admin/migrate-match-reports/route.ts
import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

async function runMigration() {
  const schedule = await kv.get<any[]>('twi_schedule');

  if (!schedule || !Array.isArray(schedule)) {
    return NextResponse.json(
      { success: false, error: 'Data twi_schedule tidak ditemukan di KV' },
      { status: 404 }
    );
  }

  const updatedMatches: string[] = [];

  for (const match of schedule) {
    const reportKey = `match:report:${match.id}`;
    const existingReport = await kv.get<any>(reportKey);

    // 1. Metadata murni (date, streamPlatform, streamer, referee, streamUrl)
    const metadata = {
      date: match.date || existingReport?.metadata?.date || '',
      streamPlatform: match.streamPlatform || existingReport?.metadata?.streamPlatform || 'YouTube',
      streamer: match.streamer || existingReport?.metadata?.streamer || '',
      referee: match.referee || match.judge || existingReport?.metadata?.referee || existingReport?.metadata?.judge || '',
      streamUrl: match.streamUrl || existingReport?.metadata?.streamUrl || '',
    };

    // 2. Format Lineup murni
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

    // 3. Dokumen bersih sesuai struktur kesepakatan
    const cleanReport = {
      matchId: match.id,
      week: match.week || existingReport?.week || 1,
      metadata,
      teamA: {
        name: match.teamA?.name || existingReport?.teamA?.name || '',
        slug: match.teamA?.slug || existingReport?.teamA?.slug || '',
        score: existingReport?.teamA?.score ?? 0,
        repeatsUsed: existingReport?.teamA?.repeatsUsed ?? 0,
        warningsUsed: existingReport?.teamA?.warningsUsed ?? 0,
        lineup: formatLineup(existingReport?.teamA?.lineup),
      },
      teamB: {
        name: match.teamB?.name || existingReport?.teamB?.name || '',
        slug: match.teamB?.slug || existingReport?.teamB?.slug || '',
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
      winnerTeam: existingReport?.winnerTeam || null,
      isFinished: existingReport?.isFinished ?? false,
    };

    await kv.set(reportKey, cleanReport);
    updatedMatches.push(reportKey);
  }

  return NextResponse.json({
    success: true,
    message: `Migrasi selesai. ${updatedMatches.length} dokumen match:report berhasil distandarkan.`,
    keys: updatedMatches,
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
