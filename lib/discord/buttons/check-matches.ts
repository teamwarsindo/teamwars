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
    const match = schedules.find((m) => m.id === matchId || (m as any).discordChannelId === channelId);

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

    const matchCountByDate = new Map<string, number>();
    weekMatches.forEach((m) => {
      if (!m.matchDate) return;
      const key = getWibDateKey(new Date(m.matchDate));
      matchCountByDate.set(key, (matchCountByDate.get(key) || 0) + 1);
    });

    // Batas akhir: Hari Minggu pekan match tersebut
    const targetMatchDate = new Date(match.matchDate);
    const dayOfWeek = targetMatchDate.getDay();
    const diffToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const sundayDate = new Date(targetMatchDate);
    sundayDate.setDate(targetMatchDate.getDate() + diffToSunday);
    const sundayKey = getWibDateKey(sundayDate);

    const lines: string[] = [];
    const now = new Date();
    // Titik awal: Mulai besok (H+1)
    let checkDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    while (true) {
      const dateKey = getWibDateKey(checkDay);

      // Berhenti jika sudah lewat hari Minggu
      if (dateKey > sundayKey) {
        break;
      }

      const count = matchCountByDate.get(dateKey) || 0;
      const sisa = Math.max(0, 3 - count);

      const dayLabel = checkDay.toLocaleDateString('id-ID', {
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

      checkDay.setDate(checkDay.getDate() + 1);
    }

    const updatedTime = now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    });

    const descriptionContent =
      lines.length > 0
        ? `Ketersediaan match per hari sebagai acuan reschedule (H+1 s/d Minggu).\n\n${lines.join('\n\n')}`
        : '⚠️ Tidak ada slot reschedule yang tersisa untuk pekan ini (sudah melewati batas akhir hari Minggu).';

    const embed = {
      title: `📊 Schedule Recap - Week ${matchWeek}`,
      description: descriptionContent,
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
