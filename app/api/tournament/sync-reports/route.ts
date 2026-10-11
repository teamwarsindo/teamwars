import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem, getTeamSlug } from '@/app/tournament/_library';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

function isPlaceholderText(val?: string): boolean {
  if (!val || val.trim() === '') return true;
  return /^winner\b|^loser\b|^tbd\b/i.test(val.trim());
}

async function handleSync(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetMatchId = searchParams.get('matchId')?.trim();

    // 1. Ambil data jadwal dan seluruh data laporan laga dari KV
    const [schedules, allReports] = await Promise.all([
      kv.get<MatchScheduleItem[]>('twi:schedules').then((res) => res || []),
      kv.hgetall<Record<string, any>>('twi:match_reports').then((res) => res || {}),
    ]);

    if (!schedules || schedules.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Data jadwal (twi:schedules) kosong atau tidak ditemukan.',
        },
        { status: 404 }
      );
    }

    const updatedMatches: Array<{
      matchId: string;
      teamA: { oldName: string; newName: string; oldSlug: string; newSlug: string };
      teamB: { oldName: string; newName: string; oldSlug: string; newSlug: string };
    }> = [];

    const updatesToPersist: Record<string, any> = {};

    // 2. Iterasi dan sinkronkan data nama serta slug tim
    for (const match of schedules) {
      if (!match.id) continue;
      if (targetMatchId && match.id !== targetMatchId) continue;

      const reportData = allReports[match.id];
      if (!reportData) continue;

      let isChanged = false;

      const oldTeamAName = reportData.teamA?.name || '';
      const oldTeamASlug = reportData.teamA?.slug || '';
      const oldTeamBName = reportData.teamB?.name || '';
      const oldTeamBSlug = reportData.teamB?.slug || '';

      let targetTeamASlug = oldTeamASlug;
      let targetTeamBSlug = oldTeamBSlug;

      // Sinkronkan Tim A (Nama & Slug)
      if (match.teamAName && !isPlaceholderText(match.teamAName)) {
        const expectedSlugA = getTeamSlug(match.teamAName);
        const shouldUpdateName = isPlaceholderText(oldTeamAName) || oldTeamAName !== match.teamAName;
        const shouldUpdateSlug = isPlaceholderText(oldTeamASlug) || oldTeamASlug !== expectedSlugA;

        if (shouldUpdateName || shouldUpdateSlug) {
          if (!reportData.teamA) reportData.teamA = {};
          reportData.teamA.name = match.teamAName;
          reportData.teamA.slug = expectedSlugA;
          targetTeamASlug = expectedSlugA;
          isChanged = true;
        }
      }

      // Sinkronkan Tim B (Nama & Slug)
      if (match.teamBName && !isPlaceholderText(match.teamBName)) {
        const expectedSlugB = getTeamSlug(match.teamBName);
        const shouldUpdateName = isPlaceholderText(oldTeamBName) || oldTeamBName !== match.teamBName;
        const shouldUpdateSlug = isPlaceholderText(oldTeamBSlug) || oldTeamBSlug !== expectedSlugB;

        if (shouldUpdateName || shouldUpdateSlug) {
          if (!reportData.teamB) reportData.teamB = {};
          reportData.teamB.name = match.teamBName;
          reportData.teamB.slug = expectedSlugB;
          targetTeamBSlug = expectedSlugB;
          isChanged = true;
        }
      }

      // Sinkronkan Metadata
      if (isChanged) {
        if (!reportData.metadata) reportData.metadata = {};
        reportData.metadata.teamAName = reportData.teamA?.name;
        reportData.metadata.teamBName = reportData.teamB?.name;
        reportData.metadata.teamASlug = targetTeamASlug;
        reportData.metadata.teamBSlug = targetTeamBSlug;

        updatesToPersist[match.id] = reportData;
        updatedMatches.push({
          matchId: match.id,
          teamA: {
            oldName: oldTeamAName,
            newName: reportData.teamA?.name,
            oldSlug: oldTeamASlug,
            newSlug: reportData.teamA?.slug,
          },
          teamB: {
            oldName: oldTeamBName,
            newName: reportData.teamB?.name,
            oldSlug: oldTeamBSlug,
            newSlug: reportData.teamB?.slug,
          },
        });
      }
    }

    // 3. Simpan perubahan ke Vercel KV
    if (Object.keys(updatesToPersist).length > 0) {
      await kv.hset('twi:match_reports', updatesToPersist);
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil memeriksa laporan. Sebanyak ${updatedMatches.length} match report telah diperbarui nama dan slug timnya.`,
      targetMatchId: targetMatchId || 'ALL',
      totalUpdated: updatedMatches.length,
      updatedMatches,
    });
  } catch (error: any) {
    console.error('Error syncing match reports:', error);
    return NextResponse.json(
      {
        success: false,
        message: `Gagal sinkronisasi match reports: ${error.message}`,
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleSync(req);
}

export async function POST(req: NextRequest) {
  return handleSync(req);
}
