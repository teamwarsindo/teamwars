import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem, DIVISION_MAP, getCurrentServerWeek, getMatchWeekNumber, getTeamSlug, getWibDateKey } from '@/lib/tournament';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { sendOrUpdateWeeklyScheduleAndRecap, deleteWeeklyScheduleAndRecap } from '@/lib/discord/messages/weekly-recap';

const KV_KEY_SCHEDULES = 'twi:schedules';
// CACHE RECAP GLOBAL DI LUAR (DELETE & RE-POST DI POSISI PALING BAWAH)
const KV_KEY_GLOBAL_RECAP = 'twi:global_recap_msg_id';

// 🟢 LOGIKA UTAMA BROADCAST RECAP
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

  // 1. FETCH DATA EMOJI SEMUA TIM DARI KV (`teams:{slug}`)
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
      } catch {
        // Silent catch fallback
      }
    })
  );

  // 2. PISAHKAN JADWAL GROUP A & B
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

  // 3. LOGIKA GENERATE SLOT RESCHEDULE (RABU S/D MINGGU) & FILTER HARI BERLALU
  const todayWibStr = getWibDateKey(new Date());

  const matchDates = weekMatches
    .map((m) => new Date(m.matchDate).getTime())
    .sort((a, b) => a - b);
  const earliestDate = new Date(matchDates[0]);

  // Cari hari Rabu di minggu tersebut (0=Minggu, 1=Senin, ..., 3=Rabu)
  const dayOfWeek = earliestDate.getDay();
  const diffToWed = dayOfWeek >= 3 ? dayOfWeek - 3 : dayOfWeek + 4;
  const wednesdayDate = new Date(earliestDate);
  wednesdayDate.setDate(earliestDate.getDate() - diffToWed);

  const matchCountByDate = new Map<string, number>();
  weekMatches.forEach((m) => {
    const dateKey = getWibDateKey(new Date(m.matchDate));
    matchCountByDate.set(dateKey, (matchCountByDate.get(dateKey) || 0) + 1);
  });

  const dailyMatchCounts: { dateKey: string; dateFormatted: string; count: number }[] = [];

  for (let i = 0; i < 5; i++) {
    const currentDate = new Date(wednesdayDate);
    currentDate.setDate(wednesdayDate.getDate() + i);

    const dateKey = getWibDateKey(currentDate);

    // Abaikan hari yang sudah berlalu sebelum hari ini
    if (dateKey < todayWibStr) {
      continue;
    }

    const dateFormatted = currentDate.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      timeZone: 'Asia/Jakarta',
    });

    dailyMatchCounts.push({
      dateKey,
      dateFormatted,
      count: matchCountByDate.get(dateKey) || 0,
    });
  }

  // 4. AMBIL CACHE MSG DENGAN STRUKTUR TERPISAH
  const weekGroupCacheKey = `twi:schedule_msg_ids:${weekNumber}`;
  const existingGroupMsgIds = (await kv.get<{ groupAMsgId?: string; groupBMsgId?: string }>(weekGroupCacheKey)) || {};
  const existingGlobalRecapId = (await kv.get<{ recapMsgId?: string }>(KV_KEY_GLOBAL_RECAP)) || {};

  // 5. HAPUS PESAN RECAP LAMA TERLEBIH DAHULU (DELETE)
  if (existingGlobalRecapId?.recapMsgId) {
    try {
      await deleteWeeklyScheduleAndRecap({
        channelId: DISCORD_CONFIG.CH_SCHEDULE,
        existingMsgIds: { recapMsgId: existingGlobalRecapId.recapMsgId },
        deleteRecapToo: true,
      });
      await kv.del(KV_KEY_GLOBAL_RECAP);
    } catch (err) {
      console.warn('Gagal menghapus recap lama, lanjut kirim baru:', err);
    }
  }

  // 6. SEND/UPDATE DISCORD (PATCH GROUP A & B, RECAP DI-POST DI POSISI PALING BAWAH)
  const result = await sendOrUpdateWeeklyScheduleAndRecap({
    channelId: DISCORD_CONFIG.CH_SCHEDULE,
    weekName: targetWeekStr,
    dailyMatchCounts,
    groupASchedules,
    groupBSchedules,
    existingMsgIds: {
      groupAMsgId: existingGroupMsgIds.groupAMsgId,
      groupBMsgId: existingGroupMsgIds.groupBMsgId,
    },
  });

  // 7. SIMPAN MASING-MASING CACHE KE KV TERPISAH
  await kv.set(weekGroupCacheKey, {
    groupAMsgId: result.groupAMsgId,
    groupBMsgId: result.groupBMsgId,
  });

  if (result.recapMsgId) {
    await kv.set(KV_KEY_GLOBAL_RECAP, {
      recapMsgId: result.recapMsgId,
    });
  }

  return result;
}

// 🟢 GET ENDPOINT (UNTUK CRON JOB AUTOMATION)
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

// 🟢 POST ENDPOINT (UNTUK BROADCAST MANUAL VIA DASHBOARD)
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

// 🔴 DELETE ENDPOINT (UNTUK MENGHAPUS BROADCAST VIA DASHBOARD)
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
    const existingGlobalRecapId = (await kv.get<any>(KV_KEY_GLOBAL_RECAP)) || {};

    // Hapus Group A & B untuk minggu terkait
    if (existingGroupMsgIds) {
      await deleteWeeklyScheduleAndRecap({
        channelId: DISCORD_CONFIG.CH_SCHEDULE,
        existingMsgIds: existingGroupMsgIds,
        deleteRecapToo: false,
      });
      await kv.del(weekGroupCacheKey);
    }

    // Hapus Recap Global jika ada
    if (existingGlobalRecapId?.recapMsgId) {
      await deleteWeeklyScheduleAndRecap({
        channelId: DISCORD_CONFIG.CH_SCHEDULE,
        existingMsgIds: { recapMsgId: existingGlobalRecapId.recapMsgId },
        deleteRecapToo: true,
      });
      await kv.del(KV_KEY_GLOBAL_RECAP);
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