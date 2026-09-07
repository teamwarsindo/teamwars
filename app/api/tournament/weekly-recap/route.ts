import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem, DIVISION_MAP, getCurrentServerWeek, getMatchWeekNumber, getTeamSlug } from '@/app/tournament/_library';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { sendOrUpdateWeeklyScheduleAndRecap, deleteWeeklyScheduleAndRecap } from '@/lib/discord/messages/weekly-recap';

const KV_KEY_SCHEDULES = 'twi:schedules';

async function executeWeeklyBroadcast(targetWeekStr: string) {
  const weekNumber = parseInt(targetWeekStr.replace('Week ', ''), 10);
  const schedules = (await kv.get<MatchScheduleItem[]>(KV_KEY_SCHEDULES)) || [];

  const weekMatches = schedules.filter((m) => {
    const computedWeek = m.weekNumber || getMatchWeekNumber(m.matchDate);
    return computedWeek === weekNumber;
  });

  if (weekMatches.length === 0) {
    throw new Error(`Tidak ada jadwal pertandingan untuk ${targetWeekStr}`);
  }

  const teamSlugs = Array.from(
    new Set(weekMatches.flatMap((m) => [getTeamSlug(m.teamAName), getTeamSlug(m.teamBName)]))
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

  const groupAMatches = weekMatches.filter(
    (m) => m.groupName === DIVISION_MAP.GROUP_A || m.groupName === 'Group A'
  );
  const groupBMatches = weekMatches.filter(
    (m) => m.groupName === DIVISION_MAP.GROUP_B || m.groupName === 'Group B'
  );

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

    return {
      matchDateIso: m.matchDate,
      dateStr,
      timeStr,
      team1Emoji: emojiMap[slugA] || '🛡️',
      team1Name: m.teamAName,
      team2Emoji: emojiMap[slugB] || '🛡️',
      team2Name: m.teamBName,
    };
  };

  const groupASchedules = groupAMatches.map(formatScheduleMatch);
  const groupBSchedules = groupBMatches.map(formatScheduleMatch);

  const weekGroupCacheKey = `twi:schedule_msg_ids:${weekNumber}`;
  const existingGroupMsgIds = (await kv.get<{ groupAMsgId?: string; groupBMsgId?: string }>(weekGroupCacheKey)) || {};

  const result = await sendOrUpdateWeeklyScheduleAndRecap({
    channelId: DISCORD_CONFIG.CH_SCHEDULE,
    weekName: targetWeekStr,
    dailyMatchCounts: [],
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

    const weekNumber = parseInt(targetWeek.replace('Week ', ''), 10);
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