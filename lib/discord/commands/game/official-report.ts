import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI, getEmbedFooterText, hexToDecimal } from '@/lib/discord/utils';
import { getTeamEmojiByMatch, resolveStreamDisplay, formatMatchSchedule } from './types';

export async function syncOfficialMatchReport(match: any, reportData: any) {
  const targetChannelId = DISCORD_CONFIG.CH_SCORE_REPORT || DISCORD_CONFIG.CH_REPORT;
  if (!targetChannelId) {
    console.warn('CH_SCORE_REPORT / CH_REPORT tidak ditemukan di DISCORD_CONFIG.');
    return;
  }

  const scoreA = reportData.teamA?.score || 0;
  const scoreB = reportData.teamB?.score || 0;
  if (scoreA < 10 && scoreB < 10) return;

  const matchWeek = reportData.week || match?.weekNumber || 5;
  const groupOrDivision = match?.groupName || match?.stage || 'Regular Season';

  const emojiA = await getTeamEmojiByMatch(match, 'A', reportData.teamA?.slug || reportData.teamA?.name);
  const emojiB = await getTeamEmojiByMatch(match, 'B', reportData.teamB?.slug || reportData.teamB?.name);

  const teamNameA = String(reportData.teamA?.name || 'TIM A').toUpperCase();
  const teamNameB = String(reportData.teamB?.name || 'TIM B').toUpperCase();

  const m = match as any;
  const refereeDisplay = m.refereeDiscordId
    ? `<@${m.refereeDiscordId}>`
    : m.refereeName || reportData.metadata?.referee || 'Belum ditentukan';
  const { streamerDisplay, streamUrlDisplay } = resolveStreamDisplay(match, reportData);

  const scheduleDisplay = formatMatchSchedule(
    m.matchDate || m.date || reportData.metadata?.date,
    m.matchTime || m.time || reportData.metadata?.time
  );

  const formatCleanLineup = (lineup: any[] = []) => {
    return lineup
      .slice(0, 5)
      .map((p, idx) => {
        const idTag = p.idDuelLinks ? ` (${p.idDuelLinks})` : '';
        return `${idx + 1}. ${p.ign || 'Pemain'}${idTag}`;
      })
      .join('\n');
  };

  const games: any[] = reportData.games || [];
  const skillsMap: Record<string, string> = (await kv.get('twi:master_skills')) || {};

  let hasRepeat = false;
  let hasDeckloss = false;

  const logsFormatted = games.map((g: any) => {
    const isAWin = g.winner === 'teamA';
    const isDecklossA = g.isDeckloss && g.decklossTeam === 'teamA';
    const isDecklossB = g.isDeckloss && g.decklossTeam === 'teamB';

    if (g.isDeckloss) hasDeckloss = true;
    if (g.playerA?.isRepeat || g.playerB?.isRepeat) hasRepeat = true;

    let tagA = isAWin ? 'W' : 'L';
    let tagB = isAWin ? 'L' : 'W';

    if (g.playerA?.isRepeat) tagA = isAWin ? 'WR' : 'LR';
    if (g.playerB?.isRepeat) tagB = isAWin ? 'LR' : 'WR';
    if (isDecklossA) tagA = 'TL';
    if (isDecklossB) tagB = 'TL';

    const shortSkillA = g.playerA?.skill ? skillsMap[g.playerA.skill] || g.playerA.skill : '';
    const deckA = g.playerA?.archetype || 'Unknown';
    const deckAStr = shortSkillA ? `(${deckA} • ${shortSkillA})` : `(${deckA})`;

    const shortSkillB = g.playerB?.skill ? skillsMap[g.playerB.skill] || g.playerB.skill : '';
    const deckB = g.playerB?.archetype || 'Unknown';
    const deckBStr = shortSkillB ? `(${deckB} • ${shortSkillB})` : `(${deckB})`;

    return `• G${g.gameNumber}: ${g.playerA.ign} **${tagA} — ${tagB}** ${g.playerB.ign}\n  └ ${deckAStr} vs ${deckBStr}`;
  });

  let glossaryText = '';
  if (hasRepeat && hasDeckloss) {
    glossaryText = `\n\n*Keterangan: WR/LR = Win/Loss (Repeat) • TL = Technical Loss (Deckloss)*`;
  } else if (hasRepeat) {
    glossaryText = `\n\n*Keterangan: WR/LR = Win/Loss (Repeat)*`;
  } else if (hasDeckloss) {
    glossaryText = `\n\n*Keterangan: TL = Technical Loss (Deckloss)*`;
  }

  const winCounts: Record<string, { ign: string; team: string; wins: number }> = {};
  games.forEach((g: any) => {
    const winnerPlayer = g.winner === 'teamA' ? g.playerA : g.playerB;
    const teamName = g.winner === 'teamA' ? reportData.teamA.name : reportData.teamB.name;
    if (winnerPlayer?.ign) {
      if (!winCounts[winnerPlayer.ign]) {
        winCounts[winnerPlayer.ign] = { ign: winnerPlayer.ign, team: teamName, wins: 0 };
      }
      winCounts[winnerPlayer.ign].wins += 1;
    }
  });

  const topMvp = Object.values(winCounts).sort((a, b) => b.wins - a.wins)[0];
  const mvpText = topMvp
    ? `**${topMvp.ign}** (${topMvp.wins} Kemenangan)\n— Menjadi kontributor poin kemenangan bagi ${topMvp.team}.`
    : '-';

  const winnerTeamName = scoreA >= 10 ? reportData.teamA.name : reportData.teamB.name;
  const matchSummaryText = `Pertandingan berlangsung sengit hingga Game ${games.length}. **${winnerTeamName}** keluar sebagai pemenang setelah berhasil mengunci target skor 10.`;

  const violations: string[] = [];
  games.forEach((g: any) => {
    if (g.ssHandA === false) violations.push(`1x Warning SS Hand dicatat atas nama **${g.playerA?.ign}** pada Game ${g.gameNumber}.`);
    if (g.ssHandB === false) violations.push(`1x Warning SS Hand dicatat atas nama **${g.playerB?.ign}** pada Game ${g.gameNumber}.`);
    if (g.isDeckloss) violations.push(`Sanksi Deckloss dijatuhkan kepada **${g.decklossTeam === 'teamA' ? reportData.teamA.name : reportData.teamB.name}** pada Game ${g.gameNumber}.`);
  });
  const violationNote = violations.length > 0 ? violations.join(' ') : 'Tidak ada pelanggaran kartu/SS Hand selama duel.';

  const officialEmbed = {
    title: '🏆 OFFICIAL MATCH REPORT',
    color: hexToDecimal(scoreA >= 10 ? '#3b82f6' : '#ef4444'),
    description:
      `**Informasi Pertandingan:**\n` +
      `• **Divisi:** ${groupOrDivision} — Week ${matchWeek}\n` +
      `• **Match:** ${teamNameA} vs ${teamNameB}\n` +
      `• **Jadwal:** ${scheduleDisplay}\n` +
      `• **Referee:** ${refereeDisplay}\n` +
      `• **Streamer:** ${streamerDisplay}\n` +
      `• **Live Match:** ${streamUrlDisplay}\n\n` +
      `# ${emojiA || '🔴'} ${scoreA} ── ${scoreB} ${emojiB || '🔵'}\n` +
      `──────────────────────────────\n\n` +
      `👥 **Lineup Pertandingan:**\n` +
      `• **${teamNameA}:**\n${formatCleanLineup(reportData.teamA?.lineup)}\n\n` +
      `• **${teamNameB}:**\n${formatCleanLineup(reportData.teamB?.lineup)}\n` +
      `──────────────────────────────\n\n` +
      `📜 **Game Logs:**\n` +
      logsFormatted.join('\n\n') +
      `${glossaryText}\n` +
      `──────────────────────────────\n\n` +
      `📝 **Match Summary:**\n` +
      `• **MVP Match:** ${mvpText}\n` +
      `• **Ringkasan Duel:** ${matchSummaryText}\n` +
      `• **Catatan Pertandingan:** ${violationNote}`,
    footer: { text: getEmbedFooterText() },
  };

  try {
    const rawMsg = await kv.hget<any>('discord:match_messages', match.id);
    let msgData: any = rawMsg ? (typeof rawMsg === 'string' ? JSON.parse(rawMsg) : rawMsg) : {};

    const existingMsgId = msgData.officialReport?.messageId;

    if (existingMsgId) {
      await discordAPI(`/channels/${targetChannelId}/messages/${existingMsgId}`, 'PATCH', {
        embeds: [officialEmbed],
      });
    } else {
      const postRes = await discordAPI(`/channels/${targetChannelId}/messages`, 'POST', {
        embeds: [officialEmbed],
      });

      if (postRes?.id) {
        const freshRaw = await kv.hget<any>('discord:match_messages', match.id);
        let freshData: any = freshRaw ? (typeof freshRaw === 'string' ? JSON.parse(freshRaw) : freshRaw) : msgData;

        freshData.officialReport = {
          channelId: targetChannelId,
          messageId: postRes.id,
        };

        await kv.hset('discord:match_messages', { [match.id]: freshData });
      }
    }
  } catch (err) {
    console.error('Error saat sync official match report:', err);
  }
}
