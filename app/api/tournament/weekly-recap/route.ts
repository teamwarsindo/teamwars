import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import {
  MatchScheduleItem,
  DIVISION_MAP,
  TOURNAMENT_RULES,
  getCurrentServerWeek,
  getMatchWeekNumber,
  getTeamSlug,
} from '@/app/tournament/_library';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import {
  sendOrUpdateWeeklyScheduleAndRecap,
  deleteWeeklyScheduleAndRecap,
} from '@/lib/discord/messages/weekly-recap';

const KV_KEY_SCHEDULES = 'twi:schedules';

// Helper deteksi match playoff
const isPlayoffMatch = (m: MatchScheduleItem) => {
  const gName = (m.groupName || '').toLowerCase();
  return (
    m.id.startsWith('match-po-') ||
    (Boolean(m.stage) && m.stage !== 'GROUP_STAGE') ||
    gName.includes('play-in') ||
    gName.includes('quarter') ||
    gName.includes('semi') ||
    gName.includes('final')
  );
};

// Format judul stage playoff dinamis
const getPlayoffTitle = (weekNumber: number, matches: MatchScheduleItem[]) => {
  const firstStage = matches[0]?.stage;
  const playoffOffset = weekNumber - TOURNAMENT_RULES.PLAYOFF_START_WEEK;

  if (firstStage === 'PLAY_INS' || playoffOffset === 0) return `Week ${weekNumber} • PLAY-INS STAGE`;
  if (firstStage === 'QUARTER_FINAL' || playoffOffset === 1) return `Week ${weekNumber} • QUARTER-FINALS`;
  if (firstStage === 'SEMI_FINAL' || playoffOffset === 2) return `Week ${weekNumber} • SEMI-FINALS`;
  if (firstStage === 'GRAND_FINAL' || playoffOffset === 3) return `Week ${weekNumber} • GRAND FINAL CHAMPIONSHIP`;
  return `Week ${weekNumber} • PLAYOFF STAGE`;
};

async function executeWeeklyBroadcast(targetWeekStr: string) {
  const weekNumber = parseInt(targetWeekStr.replace(/[^0-9]/g, ''), 10);
  const schedules = (await kv.get<MatchScheduleItem[]>(KV_KEY_SCHEDULES)) || [];

  const weekMatches = schedules.filter((m) => {
    const computedWeek = Number(m.weekNumber || getMatchWeekNumber(m.matchDate));
    return computedWeek === weekNumber;
  });

  if (weekMatches.length === 0) {
    throw new Error(`Tidak ada jadwal pertandingan untuk ${targetWeekStr}`);
  }

  // Ambil emoji tim dari KV
  const teamSlugs = Array.from(
    new Set(
      weekMatches.flatMap((m) => [
        m.teamAName ? getTeamSlug(m.teamAName) : '',
        m.teamBName ? getTeamSlug(m.teamBName) : '',
      ]).filter(Boolean)
    )
  );

  const emojiMap: Record<string, string> = {};
  await Promise.all(
    teamSlugs.map(async (slug) => {
      try {
        const teamData = await kv.hgetall<{ kodeTim?: string; emojiId?: string }>(`teams:${slug}`);
        if (teamData?.kodeTim && teamData?.emojiId) {
          emojiMap[slug] = `<:${teamData.kodeTim}:${teamData.emojiId}>`;
        }
      } catch {}
    })
  );

  const isPlayoffWeek =
    weekNumber >= TOURNAMENT_RULES.PLAYOFF_START_WEEK || weekMatches.some(isPlayoffMatch);

  const formatScheduleMatch = (m: MatchScheduleItem) => {
    const d = new Date(m.matchDate);
    const dateStr = d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    });
    const timeStr =
      d.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Jakarta',
      }) + ' WIB';

    const slugA = getTeamSlug(m.teamAName);
    const slugB = getTeamSlug(m.teamBName);
    const isPO = isPlayoffMatch(m);

    return {
      matchDateIso: m.matchDate,
      dateStr,
      timeStr,
      team1Emoji: emojiMap[slugA] || (isPO ? '⚔️' : '🛡️'),
      team1Name: m.teamAName || 'TBD',
      team2Emoji: emojiMap[slugB] || (isPO ? '⚔️' : '🛡️'),
      team2Name: m.teamBName || 'TBD',
      label: m.groupName,
    };
  };

  let groupASchedules: any[] = [];
  let groupBSchedules: any[] = [];
  let finalWeekName = targetWeekStr;

  if (isPlayoffWeek) {
    // Mode Playoff
    finalWeekName = getPlayoffTitle(weekNumber, weekMatches);
    const sortedMatches = [...weekMatches].sort(
      (a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
    );

    // Jika match <= 4 kirim dalam 1 embed utama (groupA), jika lebih bagi 2 embed
    if (sortedMatches.length <= 4) {
      groupASchedules = sortedMatches.map(formatScheduleMatch);
      groupBSchedules = [];
    } else {
      const half = Math.ceil(sortedMatches.length / 2);
      groupASchedules = sortedMatches.slice(0, half).map(formatScheduleMatch);
      groupBSchedules = sortedMatches.slice(half).map(formatScheduleMatch);
    }
  } else {
    // Mode Regular Season (Group A & Group B)
    const cleanGroupA = DIVISION_MAP.GROUP_A.toLowerCase().trim();
    const cleanGroupB = DIVISION_MAP.GROUP_B.toLowerCase().trim();

    const groupAMatches = weekMatches.filter((m) => {
      const g = (m.groupName || '').toLowerCase().trim();
      return g === 'group a' || g === 'divisi a' || g === cleanGroupA || g.includes(cleanGroupA);
    });

    const groupBMatches = weekMatches.filter((m) => {
      const g = (m.groupName || '').toLowerCase().trim();
      return g === 'group b' || g === 'divisi b' || g === cleanGroupB || g.includes(cleanGroupB);
    });

    groupASchedules = groupAMatches.map(formatScheduleMatch);
    groupBSchedules = groupBMatches.map(formatScheduleMatch);
  }

  const weekGroupCacheKey = `twi:schedule_msg_ids:${weekNumber}`;
  const existingGroupMsgIds =
    (await kv.get<{ groupAMsgId?: string; groupBMsgId?: string }>(weekGroupCacheKey)) || {};

  const result = await sendOrUpdateWeeklyScheduleAndRecap({
    channelId: DISCORD_CONFIG.CH_SCHEDULE,
    weekName: finalWeekName,
    groupASchedules,
    groupBSchedules,
    existingMsgIds: {
      groupAMsgId: existingGroupMsgIds.groupAMsgId,
      groupBMsgId: existingGroupMsgIds.groupBMsgId,
    },
  });

  await kv.set(weekGroupCacheKey, {
    groupAMsgId: result.groupAMsgId,
    groupBMsgId: result.groupBMsgId,
  });

  return result;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const authHeader = req.headers.get('authorization');
    const cronSecret = searchParams.get('secret') || authHeader?.replace('Bearer ', '');

    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized Cron Request' }, { status: 401 });
    }

    const activeWeekNum = getCurrentServerWeek();
    const targetWeekStr = `Week ${activeWeekNum}`;

    const result = await executeWeeklyBroadcast(targetWeekStr);

    return NextResponse.json({
      success: true,
      cronExecutedWeek: targetWeekStr,
      message: `[CRON SUCCESS] Auto Broadcast ${targetWeekStr} berhasil dijalankan!`,
      msgIds: result,
    });
  } catch (error) {
    console.error('Error GET Cron Weekly Recap:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { targetWeek } = await req.json();

    if (!targetWeek || targetWeek === 'ALL') {
      return NextResponse.json(
        { error: 'Silakan pilih minggu spesifik pada filter sebelum broadcast.' },
        { status: 400 }
      );
    }

    const result = await executeWeeklyBroadcast(targetWeek);

    return NextResponse.json({
      success: true,
      message: `Weekly Broadcast ${targetWeek} berhasil disebarkan ke Discord!`,
      msgIds: result,
    });
  } catch (error) {
    console.error('Error POST Weekly Recap:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { targetWeek } = await req.json();

    if (!targetWeek || targetWeek === 'ALL') {
      return NextResponse.json(
        { error: 'Silakan pilih minggu spesifik pada filter.' },
        { status: 400 }
      );
    }

    const weekNumber = parseInt(targetWeek.replace(/[^0-9]/g, ''), 10);
    const weekGroupCacheKey = `twi:schedule_msg_ids:${weekNumber}`;

    const existingGroupMsgIds = (await kv.get<any>(weekGroupCacheKey)) || {};

    if (existingGroupMsgIds) {
      await deleteWeeklyScheduleAndRecap({
        channelId: DISCORD_CONFIG.CH_SCHEDULE,
        existingMsgIds: existingGroupMsgIds,
        deleteRecapToo: false,
      });
      await kv.del(weekGroupCacheKey);
    }

    return NextResponse.json({
      success: true,
      message: `Broadcast Recap ${targetWeek} berhasil dihapus dari Discord!`,
    });
  } catch (error) {
    console.error('Error DELETE Weekly Recap:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
        }
