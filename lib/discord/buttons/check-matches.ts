import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem, getWibDateKey, getMatchWeekNumber } from '@/app/tournament/_library';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI } from '@/lib/discord/utils';

export function getCheckMatchesComponent(matchId: string) {
  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 2,
          label: '📊 Cek Sisa Match Harian',
          custom_id: `check_matches_${matchId}`,
        },
      ],
    },
  ];
}

export async function handleBtCheckMatches(body: any) {
  try {
    const customId: string = body.data?.custom_id || '';
    const matchId = customId.replace('check_matches_', '');
    const channelId = body.channel_id;
    const userRoles: string[] = body.member?.roles || [];
    const isAdmin = userRoles.includes(DISCORD_CONFIG.ROLE_ADMIN);

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const match = schedules.find((m) => m.id === matchId);

    if (!match) {
      return NextResponse.json({
        type: 4,
        data: { content: '❌ Data match tidak ditemukan.', flags: 64 },
      });
    }

    const matchWeek = match.weekNumber || getMatchWeekNumber(match.matchDate);
    const weekMatches = schedules.filter(
      (m) => (m.weekNumber || getMatchWeekNumber(m.matchDate)) === matchWeek
    );

    const matchTimestamps = weekMatches.map((m) => new Date(m.matchDate).getTime()).sort((a, b) => a - b);
    const earliestDate = new Date(matchTimestamps[0] || match.matchDate);

    // Disesuaikan agar patokan awal jatuh pada hari SELASA (dayOfWeek === 2)
    const dayOfWeek = earliestDate.getDay();
    const diffToTue = dayOfWeek >= 2 ? dayOfWeek - 2 : dayOfWeek + 5;
    const tuesdayDate = new Date(earliestDate);
    tuesdayDate.setDate(earliestDate.getDate() - diffToTue);

    const matchCountByDate = new Map<string, number>();
    weekMatches.forEach((m) => {
      const key = getWibDateKey(new Date(m.matchDate));
      matchCountByDate.set(key, (matchCountByDate.get(key) || 0) + 1);
    });

    const lines: string[] = [];
    // Loop 6 hari: Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu
    for (let i = 0; i < 6; i++) {
      const d = new Date(tuesdayDate);
      d.setDate(tuesdayDate.getDate() + i);
      const dateKey = getWibDateKey(d);
      const count = matchCountByDate.get(dateKey) || 0;
      const sisa = Math.max(0, 3 - count);

      const dayLabel = d.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        timeZone: 'Asia/Jakarta',
      });

      let statusDot = '🟢';
      let statusText = `${count}/3 Match (Sisa ${sisa})`;
      if (count >= 3) {
        statusDot = '🔴';
        statusText = '3/3 Match (Penuh)';
      } else if (count === 2) {
        statusDot = '🟡';
      }

      lines.push(`📅 **${dayLabel}**\n${statusDot} ${statusText}`);
    }

    const now = new Date();
    const updatedTime = now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    });

    const embed = {
      title: `📊 Schedule Recap - Week ${matchWeek}`,
      description: `Ketersediaan match per hari sebagai acuan reschedule.\n\n${lines.join('\n\n')}`,
      color: 0x5865f2,
      footer: { text: `Last Updated: ${updatedTime} WIB` },
    };

    if (!isAdmin) {
      return NextResponse.json({
        type: 4,
        data: { embeds: [embed], flags: 64 },
      });
    }

    const recapKvKey = `twi:match_recap_msg:${matchId}`;
    const oldMsgId = await kv.get<string>(recapKvKey);

    if (oldMsgId) {
      await discordAPI(`/channels/${channelId}/messages/${oldMsgId}`, 'DELETE').catch(() => null);
      await kv.del(recapKvKey);
    }

    const sentMsg = await discordAPI(`/channels/${channelId}/messages`, 'POST', {
      embeds: [embed],
    }).catch(() => null);

    if (sentMsg?.id) {
      await kv.set(recapKvKey, sentMsg.id);
    }

    return NextResponse.json({
      type: 4,
      data: { content: '✅ Rekap ketersediaan match berhasil diperbarui di channel.', flags: 64 },
    });
  } catch (error: any) {
    console.error('Error handling check matches button:', error);
    return NextResponse.json({
      type: 4,
      data: { content: '❌ Terjadi kesalahan saat memeriksa ketersediaan match.', flags: 64 },
    });
  }
}
