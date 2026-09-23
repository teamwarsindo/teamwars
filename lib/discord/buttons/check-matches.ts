import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import {
  MatchScheduleItem,
  getWibDateKey,
  getMatchWeekNumber,
  TOURNAMENT_RULES,
} from '@/app/tournament/_library';
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
    const rawMatchId = customId.replace('check_matches_', '').trim();
    const channelId = body.channel_id;

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];

    // Cara ambil match disamakan persis seperti di autocomplete /reschedule:
    // Cek berdasarkan discordChannelId, kecocokan ID langsung, atau ID yang terkandung di parameter/channel
    const match = schedules.find((m: any) => {
      if (m.discordChannelId && m.discordChannelId === channelId) return true;
      if (rawMatchId && (m.id === rawMatchId || String(m.id).toLowerCase() === rawMatchId.toLowerCase())) return true;
      return false;
    });

    if (!match) {
      return NextResponse.json({
        type: 4,
        data: { content: '❌ Data match tidak ditemukan.', flags: 64 },
      });
    }

    const currentMatchRawDate = match.matchDate || (match as any).date;
    const matchWeek = match.weekNumber || getMatchWeekNumber(currentMatchRawDate);
    const weekMatches = schedules.filter(
      (m: any) => (m.weekNumber || getMatchWeekNumber(m.matchDate || m.date)) === matchWeek
    );

    // Deteksi fase Playoff
    const isPlayoffStage =
      Boolean((match as any).groupName?.toLowerCase().includes('play')) ||
      Boolean((match as any).weekName?.toLowerCase().includes('play')) ||
      matchWeek >= TOURNAMENT_RULES.PLAYOFF_START_WEEK;

    const maxDailyQuota = isPlayoffStage
      ? TOURNAMENT_RULES.MAX_MATCHES_PER_DAY_PLAYOFF
      : TOURNAMENT_RULES.MAX_MATCHES_PER_DAY_REGULAR;

    // Filter jadwal lain (jadwal channel ini sendiri dikeluarkan)
    const otherMatches = weekMatches.filter((m: any) => m.id !== match.id);

    const matchesByDate = new Map<string, MatchScheduleItem[]>();
    otherMatches.forEach((m: any) => {
      const rawDate = m.matchDate || m.date;
      if (!rawDate) return;
      const key = getWibDateKey(new Date(rawDate));
      const list = matchesByDate.get(key) || [];
      list.push(m);
      matchesByDate.set(key, list);
    });

    // Tanggal match target saat ini
    const targetMatchDate = new Date(currentMatchRawDate);
    const currentMatchDateKey = getWibDateKey(targetMatchDate);

    // Batas hari Minggu pekan berjalan
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

      // Berhenti jika melewati hari Minggu
      if (dateKey > sundayKey) {
        break;
      }

      // 🛑 HARI MATCH MEREKA SENDIRI DI-SKIP
      if (dateKey === currentMatchDateKey) {
        checkDay.setDate(checkDay.getDate() + 1);
        continue;
      }

      const dayMatches = matchesByDate.get(dateKey) || [];
      const count = dayMatches.length;
      const sisa = Math.max(0, maxDailyQuota - count);

      const dayLabel = checkDay.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        timeZone: 'Asia/Jakarta',
      });

      if (isPlayoffStage) {
        if (dayMatches.length > 0) {
          const matchLines = dayMatches
            .map((m: any) => {
              const teamA = m.teamAName || m.team1 || 'Tim A';
              const teamB = m.teamBName || m.team2 || 'Tim B';
              return `🔴 **${teamA}** vs **${teamB}**`;
            })
            .join('\n');
          lines.push(`📅 **${dayLabel}**\n${matchLines}`);
        } else {
          lines.push(`📅 **${dayLabel}**\n🟢 **Tersedia untuk reschedule**`);
        }
      } else {
        let statusDot = '🟢';
        let statusText = `${count}/${maxDailyQuota} Match (Sisa ${sisa})`;
        if (count >= maxDailyQuota) {
          statusDot = '🔴';
          statusText = `${count}/${maxDailyQuota} Match (Penuh)`;
        } else if (maxDailyQuota > 1 && count === maxDailyQuota - 1) {
          statusDot = '🟡';
        }

        lines.push(`📅 **${dayLabel}**\n${statusDot} ${statusText}`);
      }

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

    const weekTitleLabel = isPlayoffStage ? (match as any).weekName || 'Playoff' : `Week ${matchWeek}`;

    const embed = {
      title: `📊 Schedule Recap - ${weekTitleLabel}`,
      description: descriptionContent,
      color: 0x5865f2,
      footer: { text: `Last Updated: ${updatedTime} WIB` },
    };

    // Selalu hapus pesan recap lama dan kirim pesan baru
    const recapKvKey = `twi:match_recap_msg:${match.id}`;
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
