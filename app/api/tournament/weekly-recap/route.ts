import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { MatchScheduleItem } from '@/lib/types/tournament';
import {
  ScheduleMatch,
  sendOrUpdateWeeklyScheduleAndRecap,
  deleteWeeklyScheduleAndRecap,
} from '@/lib/discord/messages/weekly-recap';

function getMondayOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getTeamSlug(teamName: string) {
  return teamName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { targetWeek } = body;

    if (!targetWeek || targetWeek === 'ALL') {
      return NextResponse.json({ error: 'Target Week spesifik wajib dipilih' }, { status: 400 });
    }

    const targetWeekNum = parseInt(targetWeek.replace(/[^0-9]/g, ''), 10);

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    if (schedules.length === 0) {
      return NextResponse.json({ error: 'Data schedule kosong di Redis' }, { status: 404 });
    }

    const targetChannelId = DISCORD_CONFIG.CH_SCHEDULE;
    if (!targetChannelId) {
      return NextResponse.json({ error: 'Channel ID Schedule belum dikonfigurasi' }, { status: 500 });
    }

    const sortedByDate = [...schedules].sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
    const tournamentStartMonday = getMondayOfWeek(new Date(sortedByDate[0].matchDate));

    const targetMonday = new Date(tournamentStartMonday);
    targetMonday.setDate(tournamentStartMonday.getDate() + (targetWeekNum - 1) * 7);

    const targetSunday = new Date(targetMonday);
    targetSunday.setDate(targetMonday.getDate() + 6);

    const startMonName = targetMonday.toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' });
    const startMonNum = targetMonday.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
    
    const endSunName = targetSunday.toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' });
    const endSunNum = targetSunday.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });

    const weekDateRangeStr = `${startMonName}, ${startMonNum} - ${endSunName}, ${endSunNum}`;

    const dayOffsets = [2, 3, 4, 5, 6];
    const dateMap: Record<string, { dateFormatted: string; count: number }> = {};

    dayOffsets.forEach((offset) => {
      const dayDate = new Date(targetMonday);
      dayDate.setDate(targetMonday.getDate() + offset);

      const options = { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' } as const;
      const [year, month, day] = new Intl.DateTimeFormat('sv-SE', options).format(dayDate).split('-');
      const dateKey = `${year}-${month}-${day}`;

      const dayNameFormatted = dayDate.toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' });
      const dayNumFormatted = dayDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });

      dateMap[dateKey] = { dateFormatted: `${dayNameFormatted}, ${dayNumFormatted}`, count: 0 };
    });

    const targetMatches = schedules.filter((m: any) => {
      if (!m.matchDate) return false;
      const d = new Date(m.matchDate);
      const matchMonday = getMondayOfWeek(d);
      const diffInDays = Math.round((matchMonday.getTime() - tournamentStartMonday.getTime()) / (1000 * 3600 * 24));
      const calculatedNum = Math.floor(diffInDays / 7) + 1;
      return calculatedNum === targetWeekNum;
    });

    const teamSlugs = Array.from(
      new Set(
        targetMatches.flatMap((m: any) => [
          getTeamSlug(m.team1Name || m.teamAName || ''),
          getTeamSlug(m.team2Name || m.teamBName || ''),
        ])
      )
    ).filter(Boolean);

    const teamDataMap: Record<string, any> = {};
    await Promise.all(
      teamSlugs.map(async (slug) => {
        const data = await kv.hgetall<any>(`teams:${slug}`).then((res) => res || kv.hgetall<any>(`team:${slug}`));
        if (data) teamDataMap[slug] = data;
      })
    );

    const groupASchedules: Array<ScheduleMatch> = [];
    const groupBSchedules: Array<ScheduleMatch> = [];

    targetMatches.forEach((m: any) => {
      const d = new Date(m.matchDate);
      const options = { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' } as const;
      const [year, month, day] = new Intl.DateTimeFormat('sv-SE', options).format(d).split('-');
      const dateKey = `${year}-${month}-${day}`;

      if (dateMap[dateKey]) {
        dateMap[dateKey].count += 1;
      }

      const teamAName = m.team1Name || m.teamAName || 'Team A';
      const teamBName = m.team2Name || m.teamBName || 'Team B';
      const slugA = getTeamSlug(teamAName);
      const slugB = getTeamSlug(teamBName);

      const teamAData = teamDataMap[slugA];
      const teamBData = teamDataMap[slugB];

      const emojiAId = m.team1Emoji || m.teamAEmoji || teamAData?.discordEmojiId || teamAData?.emojiId || '';
      const emojiBId = m.team2Emoji || m.teamBEmoji || teamBData?.discordEmojiId || teamBData?.emojiId || '';

      const formattedEmojiA = emojiAId ? `<:team:${emojiAId}>` : '';
      const formattedEmojiB = emojiBId ? `<:team:${emojiBId}>` : '';

      const dayName = d.toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' });
      const dateFormattedStr = `${dayName}, ${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })}`;
      const timeFormattedStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace('.', ':') + ' WIB';

      const matchObj: ScheduleMatch = {
        matchDateIso: m.matchDate,
        dateStr: dateFormattedStr,
        timeStr: timeFormattedStr,
        team1Emoji: formattedEmojiA,
        team1Name: teamAName,
        team2Emoji: formattedEmojiB,
        team2Name: teamBName,
      };

      const groupName = (m.group || m.groupName || 'A').toUpperCase();
      if (groupName.includes('B')) {
        groupBSchedules.push(matchObj);
      } else {
        groupASchedules.push(matchObj);
      }
    });

    const dailyMatchCounts = Object.values(dateMap);

    const activeWeek = await kv.get<number>('twi:active_schedule_week');
    let oldLastUpdatedMsgId: string | undefined;

    if (activeWeek && activeWeek !== targetWeekNum) {
      const prevMsgIds = await kv.get<{ lastUpdatedMsgId?: string }>(`twi:schedule_msg_ids:${activeWeek}`);
      oldLastUpdatedMsgId = prevMsgIds?.lastUpdatedMsgId;
    }

    const existingMsgIds = (await kv.get<{ recapMsgId?: string; groupAMsgId?: string; groupBMsgId?: string; lastUpdatedMsgId?: string }>(
      `twi:schedule_msg_ids:${targetWeekNum}`
    )) || {};

    const updatedMsgIds = await sendOrUpdateWeeklyScheduleAndRecap({
      channelId: targetChannelId,
      weekName: `Week ${targetWeekNum}`,
      weekDateRangeStr,
      dailyMatchCounts,
      groupASchedules,
      groupBSchedules,
      existingMsgIds,
      oldLastUpdatedMsgId,
    });

    await kv.set(`twi:schedule_msg_ids:${targetWeekNum}`, updatedMsgIds);
    await kv.set('twi:active_schedule_week', targetWeekNum);

    return NextResponse.json({
      success: true,
      message: `Berhasil broadcast Rekap & Schedule Week ${targetWeekNum}!`,
      channelId: targetChannelId,
      msgIds: updatedMsgIds,
      summary: {
        totalGroupA: groupASchedules.length,
        totalGroupB: groupBSchedules.length,
      },
    });
  } catch (error) {
    console.error('Error Sync Schedule & Recap:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// 🔴 DELETE METHOD: HANYA HAPUS 3 EMBED UTAMA & BERSIHKAN RECAP ID DARI REDIS
export async function DELETE(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { targetWeek } = body;

    if (!targetWeek || targetWeek === 'ALL') {
      return NextResponse.json({ error: 'Target Week spesifik wajib dipilih' }, { status: 400 });
    }

    const targetWeekNum = parseInt(targetWeek.replace(/[^0-9]/g, ''), 10);
    const targetChannelId = DISCORD_CONFIG.CH_SCHEDULE;

    if (!targetChannelId) {
      return NextResponse.json({ error: 'Channel ID Schedule belum dikonfigurasi' }, { status: 500 });
    }

    const existingMsgIds = await kv.get<{ recapMsgId?: string; groupAMsgId?: string; groupBMsgId?: string; lastUpdatedMsgId?: string }>(
      `twi:schedule_msg_ids:${targetWeekNum}`
    );

    if (existingMsgIds) {
      // Hapus 3 embed (Recap, Group A, Group B) saja
      await deleteWeeklyScheduleAndRecap({
        channelId: targetChannelId,
        existingMsgIds,
      });

      // Simpan kembali Redis dengan mempertahankan lastUpdatedMsgId jika masih ada
      if (existingMsgIds.lastUpdatedMsgId) {
        await kv.set(`twi:schedule_msg_ids:${targetWeekNum}`, {
          lastUpdatedMsgId: existingMsgIds.lastUpdatedMsgId,
        });
      } else {
        await kv.del(`twi:schedule_msg_ids:${targetWeekNum}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil menghapus 3 embed Schedule & Recap Week ${targetWeekNum} (Last Updated dipertahankan)!`,
    });
  } catch (error) {
    console.error('Error Deleting Schedule & Recap Broadcast:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
                       }
