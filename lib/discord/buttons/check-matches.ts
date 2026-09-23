import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import {
  MatchScheduleItem,
  getWibDateKey,
  getMatchWeekNumber,
  TOURNAMENT_RULES,
} from '@/app/tournament/_library';
import { discordAPI } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';

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
    const interactionToken = body.token;
    const appId = DISCORD_CONFIG.APP_ID;

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];

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

    // Deteksi fase Playoff menggunakan konstanta resmi TOURNAMENT_RULES.PLAYOFF_START_WEEK
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

    const targetMatchDate = new Date(currentMatchRawDate);
    const currentMatchDateKey = getWibDateKey(targetMatchDate);

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

      // KECUALIKAN HARI MATCH MEREKA SENDIRI DARI TAMPILAN BUTTON
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

    // Jalankan DELETE, POST, dan update interaction response via background task
    (async () => {
      try {
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

        // Perbarui pesan thinking interaction awal
        if (appId && interactionToken) {
          await discordAPI(`/webhooks/${appId}/${interactionToken}/messages/@original`, 'PATCH', {
            content: '✅ Rekap ketersediaan match berhasil diperbarui di channel.',
          }).catch(() => null);
        }
      } catch (bgErr) {
        console.error('Error background recap dispatch:', bgErr);
      }
    })();

    // RESPON TIPE 5 (DEFERRED INTERACTION DENGAN EPHEMERAL)
    return NextResponse.json({
      type: 5,
      data: { flags: 64 },
    });
  } catch (error: any) {
    console.error('Error handling check matches button:', error);
    return NextResponse.json({
      type: 4,
      data: { content: '❌ Terjadi kesalahan saat memeriksa ketersediaan match.', flags: 64 },
    });
  }
      }
