import { kv } from '@vercel/kv';
import { discordAPI, getEmbedFooterText, hexToDecimal } from '@/lib/discord/utils';
import {
  getTeamEmojiByMatch,
  resolveStreamDisplay,
  formatMatchSchedule,
  hasPlayerPhysicalWin,
  syncCampTrackers,
} from './types';
import { syncOfficialMatchReport } from './official-report';

export function computeNextInstructions(reportData: any, winnerOpt?: 'A' | 'B', pA?: any, pB?: any) {
  const games: any[] = reportData.games || [];
  const nextGameNumber = games.length + 1;
  const isMatchEnded = Boolean(reportData.isFinished);

  const lastGame = games[games.length - 1];
  const effectiveWinnerOpt = winnerOpt || (lastGame?.winner === 'teamA' ? 'A' : 'B');

  const winnerPlayerIgn = effectiveWinnerOpt === 'A' ? pA?.ign : pB?.ign;
  const winnerPlayerObj = effectiveWinnerOpt === 'A' ? pA : pB;
  const winnerTeamObj = effectiveWinnerOpt === 'A' ? reportData.teamA : reportData.teamB;
  const winnerTeamRepeatsUsed = winnerTeamObj?.repeatsUsed || 0;

  const loserPlayerObj = effectiveWinnerOpt === 'A' ? pB : pA;
  const loserTeamObj = effectiveWinnerOpt === 'A' ? reportData.teamB : reportData.teamA;
  const loserTeamRepeatsUsed = loserTeamObj?.repeatsUsed || 0;

  const isTeamAPenalty = (reportData.teamA?.warningsUsed || 0) >= 2;
  const isTeamBPenalty = (reportData.teamB?.warningsUsed || 0) >= 2;
  const penaltyIsWinner = (isTeamAPenalty && effectiveWinnerOpt === 'A') || (isTeamBPenalty && effectiveWinnerOpt === 'B');
  const penaltyIsLoser = (isTeamAPenalty && effectiveWinnerOpt === 'B') || (isTeamBPenalty && effectiveWinnerOpt === 'A');

  let sectionHeader = `📢 **Instruksi Game #${nextGameNumber}:**`;
  const instructionLines: string[] = [];

  if (isMatchEnded) {
    sectionHeader = `📢 **Status Pertandingan:**`;
    const finalWinner = (reportData.teamA?.score || 0) >= 10 ? reportData.teamA : reportData.teamB;
    const finalLoser = (reportData.teamA?.score || 0) >= 10 ? reportData.teamB : reportData.teamA;
    instructionLines.push(`• Selamat kepada **${finalWinner?.name}** atas kemenangannya!`);
    instructionLines.push(`• Terima kasih kepada **${finalLoser?.name}** atas partisipasinya!`);
  } else if (penaltyIsWinner) {
    instructionLines.push(`• **${winnerTeamObj?.name}** (2x Warning SS Hand)`);
    instructionLines.push(`  └ **${winnerPlayerIgn}** (Deckloss)`);

    const isWinnerOut =
      (winnerPlayerObj?.remainingLife ?? 1) <= 1 ||
      Boolean(winnerPlayerObj?.deck1?.isRepeatUsed || winnerPlayerObj?.deck2?.isRepeatUsed);

    if (isWinnerOut) {
      instructionLines.push(`• **${winnerTeamObj?.name}** (Next player)`);
    } else {
      const hasWinnerPhysicalWin = hasPlayerPhysicalWin(games, winnerPlayerObj?.ign);
      const canRepeat = winnerTeamRepeatsUsed < 2 && !hasWinnerPhysicalWin;
      instructionLines.push(`• **${winnerPlayerIgn}** (${canRepeat ? 'Next deck or repeat' : 'Next deck'})`);
    }

    if ((loserPlayerObj?.remainingLife ?? 0) <= 0) {
      instructionLines.push(`• **${loserTeamObj?.name}** (Next player)`);
    } else {
      instructionLines.push(`• **${loserPlayerObj?.ign}** (Next deck)`);
    }
  } else {
    instructionLines.push(`• **${winnerPlayerIgn || 'Pemenang'}** (Stay table)`);

    if (penaltyIsLoser) {
      instructionLines.push(`• **${loserTeamObj?.name}** (2x Warning SS Hand)`);
      if ((loserPlayerObj?.remainingLife ?? 0) <= 0) {
        instructionLines.push(`  └ **${loserTeamObj?.name}** (Next player) (Deckloss)`);
      } else {
        const hasLoserPhysicalWin = hasPlayerPhysicalWin(games, loserPlayerObj?.ign);
        const canRepeat = loserTeamRepeatsUsed < 2 && !hasLoserPhysicalWin;
        instructionLines.push(`  └ **${loserPlayerObj?.ign}** (${canRepeat ? 'Next deck or repeat' : 'Next deck'}) (Deckloss)`);
      }
    } else {
      if ((loserPlayerObj?.remainingLife ?? 0) <= 0) {
        instructionLines.push(`• **${loserTeamObj?.name}** (Next player)`);
      } else {
        const hasLoserPhysicalWin = hasPlayerPhysicalWin(games, loserPlayerObj?.ign);
        const canRepeat = loserTeamRepeatsUsed < 2 && !hasLoserPhysicalWin;
        instructionLines.push(`• **${loserPlayerObj?.ign}** (${canRepeat ? 'Next deck or repeat' : 'Next deck'})`);
      }
    }
  }

  reportData.currentInstructions = {
    header: sectionHeader,
    lines: instructionLines,
  };

  return { sectionHeader, instructionLines, isTeamAPenalty, isTeamBPenalty };
}

export async function buildMatchReportEmbed(match: any, reportData: any, winnerOpt?: 'A' | 'B') {
  let hasRepeatInLogs = false;
  let hasDecklossInLogs = false;

  const matchLogsLines = (reportData.games || []).map((g: any) => {
    const isAWin = g.winner === 'teamA';
    const isDecklossA = g.isDeckloss && g.decklossTeam === 'teamA';
    const isDecklossB = g.isDeckloss && g.decklossTeam === 'teamB';

    if (g.isDeckloss) hasDecklossInLogs = true;
    if (g.playerA?.isRepeat || g.playerB?.isRepeat) hasRepeatInLogs = true;

    let scoreTagA = isAWin ? 'W' : 'L';
    let scoreTagB = isAWin ? 'L' : 'W';

    if (g.playerA?.isRepeat) scoreTagA = isAWin ? 'WR' : 'LR';
    if (g.playerB?.isRepeat) scoreTagB = isAWin ? 'LR' : 'WR';

    if (g.isDeckloss) {
      if (isDecklossA) {
        scoreTagA = 'TL';
        scoreTagB = 'TW';
      } else if (isDecklossB) {
        scoreTagA = 'TW';
        scoreTagB = 'TL';
      }
    }

    return `• G${g.gameNumber}: ${g.playerA.ign} **${scoreTagA} — ${scoreTagB}** ${g.playerB.ign}`;
  });

  let glossaryText = '';
  if (hasRepeatInLogs && hasDecklossInLogs) {
    glossaryText = `\n\n*Keterangan: WR/LR = Win/Loss (Repeat) • TW/TL = Technical Win/Loss (Deckloss)*`;
  } else if (hasRepeatInLogs) {
    glossaryText = `\n\n*Keterangan: WR/LR = Win/Loss (Repeat)*`;
  } else if (hasDecklossInLogs) {
    glossaryText = `\n\n*Keterangan: TW/TL = Technical Win/Loss (Deckloss)*`;
  }

  const m = match as any;
  const groupOrDivision = match?.groupName || match?.stage || 'Regular Season';
  const matchWeek = match.weekNumber ?? reportData.week ?? 5;

  const emojiA = await getTeamEmojiByMatch(match, 'A', reportData.teamA?.slug || reportData.teamA?.name);
  const emojiB = await getTeamEmojiByMatch(match, 'B', reportData.teamB?.slug || reportData.teamB?.name);

  const teamNameA = String(reportData.teamA?.name || 'TIM A').toUpperCase();
  const teamNameB = String(reportData.teamB?.name || 'TIM B').toUpperCase();

  const refereeDisplay = m.refereeDiscordId ? `<@${m.refereeDiscordId}>` : m.refereeName || m.referee || 'Belum ditentukan';
  const { streamerDisplay, streamUrlDisplay } = resolveStreamDisplay(match, reportData);

  const scheduleDisplay = formatMatchSchedule(
    m.matchDate || m.date || reportData.metadata?.date,
    m.matchTime || m.time || reportData.metadata?.time
  );

  let winnerColorHex = '#3b82f6';
  if (winnerOpt === 'A') winnerColorHex = match?.teamAColor || '#3b82f6';
  else if (winnerOpt === 'B') winnerColorHex = match?.teamBColor || '#ef4444';

  const isMatchEnded = Boolean(reportData.isFinished);
  const scoreSectionTitle = isMatchEnded ? '🏆 **Skor Akhir:**' : '📊 **Skor Sementara:**';
  const separator = '──────────────────────────────';

  const instructions = reportData.currentInstructions || {
    header: '📢 **Instruksi Game #1:**',
    lines: ['• Pertandingan siap dimulai!'],
  };

  const logsDisplay = matchLogsLines.length > 0 ? matchLogsLines.join('\n') : '*Belum ada game yang dimainkan.*';

  return {
    title: `⚔️ LIVE MATCH REPORT — WEEK ${matchWeek}`,
    color: hexToDecimal(winnerColorHex),
    description:
      `**Informasi Pertandingan:**\n` +
      `• **Divisi:** ${groupOrDivision} — Week ${matchWeek}\n` +
      `• **Match:** ${teamNameA} vs ${teamNameB}\n` +
      `• **Jadwal:** ${scheduleDisplay}\n` +
      `• **Referee:** ${refereeDisplay}\n` +
      `• **Streamer:** ${streamerDisplay}\n` +
      `• **Live Match:** ${streamUrlDisplay}\n` +
      `${separator}\n\n` +
      `📜 **Game Logs:**\n` +
      logsDisplay +
      `${glossaryText}\n` +
      `${separator}\n\n` +
      `${instructions.header}\n` +
      instructions.lines.join('\n') +
      `\n\n` +
      `${scoreSectionTitle}\n` +
      `# ${emojiA || '🔴'} ${reportData.teamA.score} ── ${reportData.teamB.score} ${emojiB || '🔵'}`,
    footer: { text: getEmbedFooterText() },
  };
}

export async function publishMatchReport(channelId: string, matchId: string, embed: any) {
  try {
    const rawMsg = await kv.hget<any>('discord:match_messages', matchId);
    let msgData: any = rawMsg ? (typeof rawMsg === 'string' ? JSON.parse(rawMsg) : rawMsg) : {};

    const oldReportMsgId = msgData.matchChannel?.lastReportMsgId;
    if (oldReportMsgId) {
      await discordAPI(`/channels/${channelId}/messages/${oldReportMsgId}`, 'DELETE').catch(() => {});
    }

    const postRes = await discordAPI(`/channels/${channelId}/messages`, 'POST', { embeds: [embed] });
    if (postRes?.id) {
      const freshRaw = await kv.hget<any>('discord:match_messages', matchId);
      let freshData: any = freshRaw ? (typeof freshRaw === 'string' ? JSON.parse(freshRaw) : freshRaw) : msgData;
      if (!freshData.matchChannel) freshData.matchChannel = { channelId };
      freshData.matchChannel.channelId = channelId;
      freshData.matchChannel.lastReportMsgId = postRes.id;
      await kv.hset('discord:match_messages', { [matchId]: freshData });
    }
  } catch (err) {
    console.error('Error saat publish match report embed:', err);
  }
}

export async function saveAndSyncMatchState(match: any, reportData: any) {
  const matchWeek = match.weekNumber ?? reportData.week ?? 5;
  await kv.hset('twi:match_reports', { [match.id]: reportData });
  await syncCampTrackers(match.id, matchWeek, reportData, match).catch(console.error);

  if (reportData.isFinished) {
    await syncOfficialMatchReport(match, reportData).catch(console.error);
  }
}

export function buildDecklossClaimMenu(
  matchId: string,
  innocentTeamKey: 'teamA' | 'teamB',
  innocentTeam: any,
  reasonType: 'warning' | 'timer' = 'warning'
) {
  const eligiblePlayers = (innocentTeam.lineup || []).filter((p: any) => (p.remainingLife ?? 2) > 0);
  const selectOptions: any[] = [];

  eligiblePlayers.forEach((p: any) => {
    if (p.deck1 && !p.deck1.isDead) {
      selectOptions.push({
        label: `${p.ign} — ${p.deck1.archetype}`,
        value: `${innocentTeamKey}::${p.ign}::${p.deck1.archetype}::${reasonType}`,
        description: `Deck 1 • Sisa Life: ${p.remainingLife}`,
      });
    }
    if (p.deck2 && !p.deck2.isDead) {
      selectOptions.push({
        label: `${p.ign} — ${p.deck2.archetype}`,
        value: `${innocentTeamKey}::${p.ign}::${p.deck2.archetype}::${reasonType}`,
        description: `Deck 2 • Sisa Life: ${p.remainingLife}`,
      });
    }
  });

  if (selectOptions.length === 0) return null;

  return [
    {
      type: 1,
      components: [
        {
          type: 3,
          custom_id: `deckloss_claim_${matchId}`,
          placeholder: 'Pilih pemain penerima Technical Win...',
          min_values: 1,
          max_values: 1,
          options: selectOptions.slice(0, 25),
        },
      ],
    },
  ];
}
  
