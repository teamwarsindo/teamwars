import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const matchId = searchParams.get('matchId');

    if (!matchId) {
      return NextResponse.json({ error: 'matchId diperlukan' }, { status: 400 });
    }

    // Ambil data Report, Schedules, dan Master Skills langsung dari KV
    const [reportData, schedules, rawSkills] = await Promise.all([
      kv.hget<any>('twi:match_reports', matchId),
      kv.get<any[]>('twi:schedules'),
      kv.get<any>('twi:master_skills'),
    ]);

    if (!reportData) {
      return NextResponse.json(
        { error: 'Report data tidak ditemukan' },
        {
          status: 404,
          headers: {
            // Cache 2 detik untuk 404 agar tidak spam KV saat menunggu wasit buat data
            'Cache-Control': 'public, s-maxage=2, stale-while-revalidate=2',
          },
        }
      );
    }

    // Parse Map Skill Resmi dari KV
    let skillsMap: Record<string, string> = {};
    if (rawSkills) {
      if (typeof rawSkills === 'object' && !Array.isArray(rawSkills)) {
        skillsMap = rawSkills;
      } else if (typeof rawSkills === 'string') {
        try {
          const parsed = JSON.parse(rawSkills);
          if (typeof parsed === 'object' && !Array.isArray(parsed)) skillsMap = parsed;
        } catch {
          skillsMap = {};
        }
      }
    }

    // Suntikkan logo tim dari schedules jika ada
    const matchedSchedule = schedules?.find((s) => s.id === matchId);
    if (matchedSchedule) {
      if (!reportData.teamA.logo) reportData.teamA.logo = matchedSchedule.teamALogo || '';
      if (!reportData.teamB.logo) reportData.teamB.logo = matchedSchedule.teamBLogo || '';
    }

    // Format singkatan skill resmi pada setiap Game Log
    if (Array.isArray(reportData.games)) {
      reportData.games = reportData.games.map((g: any) => {
        const skillFullNameA = g.playerA?.skill || '';
        const skillFullNameB = g.playerB?.skill || '';

        // Ambil singkatan dari KV, jika tidak ada baru buat akronim cerdas
        const getAbbr = (fullName: string) => {
          if (!fullName || fullName === '-') return '';
          // Cek exact match atau case-insensitive match di KV
          if (skillsMap[fullName]) return skillsMap[fullName];
          const matchedKey = Object.keys(skillsMap).find(
            (k) => k.toLowerCase() === fullName.trim().toLowerCase()
          );
          if (matchedKey) return skillsMap[matchedKey];

          // Fallback inisial jika skill baru belum didaftarkan singkatannya
          const words = fullName.replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
          return words.length >= 2 ? words.map((w) => w[0].toUpperCase()).join('') : fullName;
        };

        return {
          ...g,
          playerA: {
            ...g.playerA,
            skillAbbr: getAbbr(skillFullNameA),
          },
          playerB: {
            ...g.playerB,
            skillAbbr: getAbbr(skillFullNameB),
          },
        };
      });
    }

    return NextResponse.json(
      { success: true, data: reportData },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=4, stale-while-revalidate=4',
        },
      }
    );
  } catch (err: any) {
    console.error('Error fetching analytics match report:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
