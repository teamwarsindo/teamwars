import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

function isPlaceholderName(name?: string): boolean {
  if (!name || name.trim() === '') return true;
  return /^winner\b|^loser\b|^tbd\b/i.test(name.trim());
}

async function handleSync(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetMatchId = searchParams.get('matchId')?.trim();

    // 1. Ambil seluruh jadwal pertandingan dan data laporan laga dari KV
    const [schedules, allReports] = await Promise.all([
      kv.get<MatchScheduleItem[]>('twi:schedules').then((res) => res || []),
      kv.hgetall<Record<string, any>>('twi:match_reports').then((res) => res || {}),
    ]);

    if (!schedules || schedules.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Data jadwal (twi:schedules) kosong atau tidak ditemukan.',
      }, { status: 404 });
    }

    const updatedMatches: Array<{
      matchId: string;
      teamA: { old: string; new: string };
      teamB: { old: string; new: string };
    }> = [];

    const updatesToPersist: Record<string, any> = {};

    // 2. Iterasi dan cocokkan jadwal dengan laporan
    for (const match of schedules) {
      if (!match.id) continue;
      if (targetMatchId && match.id !== targetMatchId) continue;

      const reportData = allReports[match.id];
      if (!reportData) continue;

      let isChanged = false;
      const oldTeamAName = reportData.teamA?.name || '';
      const oldTeamBName = reportData.teamB?.name || '';

      // Sinkronkan Tim A jika nama di report masih berupa placeholder sementara di jadwal sudah nama definitif
      if (
        match.teamAName &&
        !isPlaceholderName(match.teamAName) &&
        (isPlaceholderName(oldTeamAName) || oldTeamAName !== match.teamAName)
      ) {
        if (!reportData.teamA) reportData.teamA = {};
        reportData.teamA.name = match.teamAName;
        isChanged = true;
      }

      // Sinkronkan Tim B jika nama di report masih berupa placeholder sementara di jadwal sudah nama definitif
      if (
        match.teamBName &&
        !isPlaceholderName(match.teamBName) &&
        (isPlaceholderName(oldTeamBName) || oldTeamBName !== match.teamBName)
      ) {
        if (!reportData.teamB) reportData.teamB = {};
        reportData.teamB.name = match.teamBName;
        isChanged = true;
      }

      // Sinkronkan metadata jika tersedia
      if (isChanged) {
        if (!reportData.metadata) reportData.metadata = {};
        reportData.metadata.teamAName = reportData.teamA?.name;
        reportData.metadata.teamBName = reportData.teamB?.name;

        updatesToPersist[match.id] = reportData;
        updatedMatches.push({
          matchId: match.id,
          teamA: { old: oldTeamAName, new: reportData.teamA?.name },
          teamB: { old: oldTeamBName, new: reportData.teamB?.name },
        });
      }
    }

    // 3. Simpan perubahan kembali ke Vercel KV
    if (Object.keys(updatesToPersist).length > 0) {
      await kv.hset('twi:match_reports', updatesToPersist);
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil memeriksa laporan. Sebanyak ${updatedMatches.length} match report telah diperbarui namanya.`,
      targetMatchId: targetMatchId || 'ALL',
      totalUpdated: updatedMatches.length,
      updatedMatches,
    });
  } catch (error: any) {
    console.error('Error syncing match reports:', error);
    return NextResponse.json({
      success: false,
      message: `Gagal sinkronisasi match reports: ${error.message}`,
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handleSync(req);
}

export async function POST(req: NextRequest) {
  return handleSync(req);
      }
