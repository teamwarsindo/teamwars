import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const matchId = searchParams.get('matchId');

    // 1. Ambil Schedules dan Master Skills dari KV
    const [schedules, rawSkills] = await Promise.all([
      kv.get<any[]>('twi:schedules'),
      kv.get<any>('twi:master_skills'),
    ]);

    // Parse Map Skill Resmi
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

    const formatSkillAbbr = (fullName: string) => {
      if (!fullName || fullName === '-') return '';
      if (skillsMap[fullName]) return skillsMap[fullName];
      const matchedKey = Object.keys(skillsMap).find(
        (k) => k.toLowerCase() === fullName.trim().toLowerCase()
      );
      if (matchedKey) return skillsMap[matchedKey];
      const words = fullName.replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
      return words.length >= 2 ? words.map((w) => w[0].toUpperCase()).join('') : fullName;
    };

    const attachLogosAndFormatGames = (report: any, id: string) => {
      if (!report || typeof report !== 'object') return null;

      // Pastikan objek teamA & teamB selalu ada
      if (!report.teamA) report.teamA = {};
      if (!report.teamB) report.teamB = {};

      const matchedSchedule = schedules?.find((s) => s.id === id);
      if (matchedSchedule) {
        if (!report.teamA.logo) report.teamA.logo = matchedSchedule.teamALogo || '';
        if (!report.teamB.logo) report.teamB.logo = matchedSchedule.teamBLogo || '';
      }

      if (Array.isArray(report.games)) {
        report.games = report.games.map((g: any) => ({
          ...g,
          playerA: {
            ...g?.playerA,
            skillAbbr: formatSkillAbbr(g?.playerA?.skill || ''),
          },
          playerB: {
            ...g?.playerB,
            skillAbbr: formatSkillAbbr(g?.playerB?.skill || ''),
          },
        }));
      }
      return report;
    };

    // MODE 1: Ambil SATU match report spesifik jika matchId disediakan
    if (matchId) {
      const singleReport = await kv.hget<any>('twi:match_reports', matchId);

      if (!singleReport) {
        return NextResponse.json(
          { error: 'Report data tidak ditemukan' },
          {
            status: 404,
            headers: {
              'Cache-Control': 'public, s-maxage=2, stale-while-revalidate=2',
            },
          }
        );
      }

      const formatted = attachLogosAndFormatGames(singleReport, matchId);

      return NextResponse.json(
        { success: true, data: formatted },
        {
          status: 200,
          headers: {
            'Cache-Control': 'public, s-maxage=4, stale-while-revalidate=4',
          },
        }
      );
    }

    // MODE 2: Ambil SEMUA match reports jika matchId tidak ada (untuk Power Ranking)
    const allReportsRecord = (await kv.hgetall<Record<string, any>>('twi:match_reports')) || {};
    const reportsList = Object.entries(allReportsRecord)
      .map(([id, report]) => attachLogosAndFormatGames(report, id))
      .filter(Boolean);

    return NextResponse.json(
      { success: true, data: reportsList },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=10',
        },
      }
    );
  } catch (err: any) {
    console.error('Error fetching analytics match report:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
