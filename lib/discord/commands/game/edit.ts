import { kv } from '@vercel/kv';
import { discordAPI, getEmbedFooterText, hexToDecimal } from '@/lib/discord/utils';
import {
  GameContext,
  syncCampTrackers,
  getTeamEmojiByMatch,
  resolveStreamDisplay,
  hasPlayerPhysicalWin,
} from './types';
import { syncOfficialMatchReport } from './official-report';

function formatMatchSchedule(matchDateStr?: string, matchTimeStr?: string): string {
  if (!matchDateStr) return 'Belum ditentukan';

  try {
    const d = new Date(matchDateStr);
    const dateFormatted = d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    });

    const timeFormatted = matchTimeStr ? ` — ${matchTimeStr.replace(':', '.')} WIB` : '';
    return `${dateFormatted}${timeFormatted}`;
  } catch {
    return matchDateStr + (matchTimeStr ? ` — ${matchTimeStr} WIB` : '');
  }
}

export async function handleGameEdit(ctx: GameContext) {
  const { channelId, appId, token, match, reportData, optMap, isBeforeKickoff, userIsAdmin } = ctx;

  if (!reportData.games || reportData.games.length === 0) {
    return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
      content: '❌ Belum ada rekaman game yang dapat diedit.',
    });
  }

  // 1. Ambil game terakhir
  const lastIndex = reportData.games.length - 1;
  const lastGame = reportData.games[lastIndex];

  const oldSsHandA = lastGame.ssHandA ?? true;
  const oldSsHandB = lastGame.ssHandB ?? true;

  // Baca input wajib boolean ss_hand_a & ss_hand_b
  const newSsHandA = Boolean(optMap.ss_hand_a);
  const newSsHandB = Boolean(optMap.ss_hand_b);

  // 2. Koreksi Rekalkulasi warningsUsed Tim A & Tim B
  // Tim A
  if (oldSsHandA !== newSsHandA) {
    if (!newSsHandA && oldSsHandA) {
      reportData.teamA.warningsUsed = (reportData.teamA.warningsUsed || 0) + 1;
    } else if (newSsHandA && !oldSsHandA) {
      reportData.teamA.warningsUsed = Math.max(0, (reportData.teamA.warningsUsed || 0) - 1);
    }
  }

  // Tim B
  if (oldSsHandB !== newSsHandB) {
    if (!newSsHandB && oldSsHandB) {
      reportData.teamB.warningsUsed = (reportData.teamB.warningsUsed || 0) + 1;
    } else if (newSsHandB && !oldSsHandB) {
      reportData.teamB.warningsUsed = Math.max(0, (reportData.teamB.warningsUsed || 0) - 1);
    }
  }

  // Perbarui data game terakhir
  lastGame.ssHandA = newSsHandA;
  lastGame.ssHandB = newSsHandB;
  reportData.games[lastIndex] = lastGame;

  // 3. Format Game Logs
  let hasRepeatInLogs = false;
  let hasDecklossInLogs = false;

  const matchLogsLines = reportData.games.map((g: any) => {
    const isAWin = g.winner === 'teamA';
    const isDecklossA = g.isDeckloss && g.decklossTeam === 'teamA';
    const isDecklossB = g.isDeckloss && g.decklossTeam === 'teamB';

    if (g.isDeckloss) hasDecklossInLogs = true;
    if (g.playerA?.isRepeat || g.playerB?.isRepeat) hasRepeatInLogs = true;

    let scoreTagA = isAWin ? 'W' : 'L';
    let scoreTagB = isAWin ? 'L' : 'W';

    if (g.playerA?.isRepeat) scoreTagA = isAWin ? 'WR' : 'LR';
    if (g.playerB?.isRepeat) scoreTagB = isAWin ? 'LR' : 'WR';
    if (isDecklossA) scoreTagA = 'TL';
    if (isDecklossB) scoreTagB = 'TL';
    if (g.isDeckloss && !isDecklossA && isAWin) scoreTagA = 'TW';
    if (g.isDeckloss && !isDecklossB && !isAWin) scoreTagB = 'TW';

    return `• G${g.gameNumber}: ${g.playerA.ign} **${scoreTagA} — ${scoreTagB}** ${g.playerB.ign}`;
  });

  let glossaryText = '';
  if (hasRepeatInLogs && hasDecklossInLogs) {
    glossaryText = `\n\n*Keterangan: WR/LR = Win/Loss (Repeat) • TL/TW = Technical Loss/Win (Deckloss)*`;
  } else if (hasRepeatInLogs) {
    glossaryText = `\n\n*Keterangan: WR/LR = Win/Loss (Repeat)*`;
  } else if (hasDecklossInLogs) {
    glossaryText = `\n\n*Keterangan: TL/TW = Technical Loss/Win (Deckloss)*`;
  }

  // 4. Metadata Header Embed
  const m = match as any;
  const groupOrDivision = match?.groupName || match?.stage || 'Regular Season';

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

  const winnerOpt = lastGame.winner === 'teamA' ? 'A' : 'B';
  const winnerColorHex = winnerOpt === 'A' 
    ? (match?.teamAColor || '#3b82f6') 
    : (match?.teamBColor || '#ef4444');

  // 5. Penentuan Instruksi Game Berikutnya
  const nextGameNumber = reportData.games.length + 1;
  const isMatchEnded = Boolean(reportData.isFinished);

  const pA = (reportData.teamA?.lineup || []).find((p: any) => p.ign === lastGame.playerA.ign);
  const pB = (reportData.teamB?.lineup || []).find((p: any) => p.ign === lastGame.playerB.ign);

  const winnerPlayerIgn = winnerOpt === 'A' ? pA?.ign : pB?.ign;
  const winnerPlayerObj = winnerOpt === 'A' ? pA : pB;
  const winnerTeamObj = winnerOpt === 'A' ? reportData.teamA : reportData.teamB;
  const winnerTeamRepeatsUsed = winnerTeamObj.repeatsUsed || 0;

  const loserPlayerObj = winnerOpt === 'A' ? pB : pA;
  const loserTeamObj = winnerOpt === 'A' ? reportData.teamB : reportData.teamA;
  const loserTeamRepeatsUsed = loserTeamObj.repeatsUsed || 0;

  const isTeamAPenalty = (reportData.teamA?.warningsUsed || 0) >= 2;
  const isTeamBPenalty = (reportData.teamB?.warningsUsed || 0) >= 2;
  const penaltyIsWinner = (isTeamAPenalty && winnerOpt === 'A') || (isTeamBPenalty && winnerOpt === 'B');
  const penaltyIsLoser = (isTeamAPenalty && winnerOpt === 'B') || (isTeamBPenalty && winnerOpt === 'A');

  let sectionHeader = `📢 **Instruksi Game #${nextGameNumber}:**`;
  let instructionLines: string[] = [];

  if (isMatchEnded) {
    sectionHeader = `📢 **Status Pertandingan:**`;
    const finalWinner = reportData.teamA.score >= 10 ? reportData.teamA : reportData.teamB;
    const finalLoser = reportData.teamA.score >= 10 ? reportData.teamB : reportData.teamA;
    instructionLines.push(`• Selamat kepada **${finalWinner.name}** atas kemenangannya!`);
    instructionLines.push(`• Terima kasih kepada **${finalLoser.name}** atas partisipasinya!`);
  } else if (penaltyIsWinner) {
    instructionLines.push(`• **${winnerTeamObj.name}** (2x Warning SS Hand)`);
    instructionLines.push(`  └ **${winnerPlayerIgn}** (Deckloss)`);

    const isWinnerOut =
      (winnerPlayerObj?.remainingLife ?? 1) <= 1 ||
      Boolean(winnerPlayerObj?.deck1?.isRepeatUsed || winnerPlayerObj?.deck2?.isRepeatUsed);

    if (isWinnerOut) {
      instructionLines.push(`• **${winnerTeamObj.name}** (Next player)`);
    } else {
      const hasWinnerPhysicalWin = hasPlayerPhysicalWin(reportData.games, winnerPlayerObj?.ign);
      const canRepeat = winnerTeamRepeatsUsed < 2 && !hasWinnerPhysicalWin;
      if (canRepeat) {
        instructionLines.push(`• **${winnerPlayerIgn}** (Next deck or repeat)`);
      } else {
        instructionLines.push(`• **${winnerPlayerIgn}** (Next deck)`);
      }
    }

    if ((loserPlayerObj?.remainingLife ?? 0) <= 0) {
      instructionLines.push(`• **${loserTeamObj.name}** (Next player)`);
    } else {
      instructionLines.push(`• **${loserPlayerObj?.ign}** (Next deck)`);
    }
  } else {
    instructionLines.push(`• **${winnerPlayerIgn}** (Stay table)`);

    if (penaltyIsLoser) {
      instructionLines.push(`• **${loserTeamObj.name}** (2x Warning SS Hand)`);

      if ((loserPlayerObj?.remainingLife ?? 0) <= 0) {
        instructionLines.push(`  └ **${loserTeamObj.name}** (Next player) (Deckloss)`);
      } else {
        const hasLoserPhysicalWin = hasPlayerPhysicalWin(reportData.games, loserPlayerObj?.ign);
        const canRepeat = loserTeamRepeatsUsed < 2 && !hasLoserPhysicalWin;
        if (canRepeat) {
          instructionLines.push(`  └ **${loserPlayerObj?.ign}** (Next deck or repeat) (Deckloss)`);
        } else {
          instructionLines.push(`  └ **${loserPlayerObj?.ign}** (Next deck) (Deckloss)`);
        }
      }
    } else {
      if ((loserPlayerObj?.remainingLife ?? 0) <= 0) {
        instructionLines.push(`• **${loserTeamObj.name}** (Next player)`);
      } else {
        const hasLoserPhysicalWin = hasPlayerPhysicalWin(reportData.games, loserPlayerObj?.ign);
        const canRepeat = loserTeamRepeatsUsed < 2 && !hasLoserPhysicalWin;
        if (canRepeat) {
          instructionLines.push(`• **${loserPlayerObj?.ign}** (Next deck or repeat)`);
        } else {
          instructionLines.push(`• **${loserPlayerObj?.ign}** (Next deck)`);
        }
      }
    }
  }

  reportData.currentInstructions = {
    header: sectionHeader,
    lines: instructionLines,
  };

  const matchWeek = match.weekNumber ?? reportData.week ?? 5;

  // 6. Simpan ke KV & Sinkronisasi Camp
  if (!isBeforeKickoff) {
    await kv.hset('twi:match_reports', { [match.id]: reportData });
    await syncCampTrackers(match.id, matchWeek, reportData, match, lastGame).catch(console.error);

    if (isMatchEnded) {
      await syncOfficialMatchReport(match, reportData).catch(console.error);
    }
  }

  const scoreSectionTitle = isMatchEnded ? '🏆 **Skor Akhir:**' : '📊 **Skor Sementara:**';
  const separator = '──────────────────────────────';

  // 7. Render Embed Live Match Report
  const matchEmbed = {
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
      matchLogsLines.join('\n') +
      `${glossaryText}\n` +
      `${separator}\n\n` +
      `${sectionHeader}\n` +
      instructionLines.join('\n') +
      `\n\n` +
      `${scoreSectionTitle}\n` +
      `# ${emojiA || '🔴'} ${reportData.teamA.score} ── ${reportData.teamB.score} ${emojiB || '🔵'}`,
    footer: { text: getEmbedFooterText() },
  };

  if (isBeforeKickoff && userIsAdmin) {
    return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', { embeds: [matchEmbed] });
  }

  // 8. Hapus Pesan Lama dan Kirim Embed Baru
  try {
    const rawMsg = await kv.hget<any>('discord:match_messages', match.id);
    let msgData: any = rawMsg ? (typeof rawMsg === 'string' ? JSON.parse(rawMsg) : rawMsg) : {};

    const oldReportMsgId = msgData.matchChannel?.lastReportMsgId;
    if (oldReportMsgId) {
      await discordAPI(`/channels/${channelId}/messages/${oldReportMsgId}`, 'DELETE').catch((err) => {
        console.warn(`Gagal menghapus pesan lama ${oldReportMsgId}:`, err);
      });
    }

    const postRes = await discordAPI(`/channels/${channelId}/messages`, 'POST', { embeds: [matchEmbed] });

    if (postRes?.id) {
      const freshRaw = await kv.hget<any>('discord:match_messages', match.id);
      let freshData: any = freshRaw ? (typeof freshRaw === 'string' ? JSON.parse(freshRaw) : freshRaw) : msgData;

      if (!freshData.matchChannel) freshData.matchChannel = { channelId };
      freshData.matchChannel.channelId = channelId;
      freshData.matchChannel.lastReportMsgId = postRes.id;

      await kv.hset('discord:match_messages', { [match.id]: freshData });
    }
  } catch (err) {
    console.error('Error saat delete-and-repost match report (edit):', err);
  }

  // 9. Cek Sanksi Deckloss jika hasil edit memicu 2x Warning
  if (!isMatchEnded && (isTeamAPenalty || isTeamBPenalty)) {
    const penaltyTeam = isTeamAPenalty ? reportData.teamA : reportData.teamB;
    const innocentTeam = isTeamAPenalty ? reportData.teamB : reportData.teamA;
    const innocentTeamKey = isTeamAPenalty ? 'teamB' : 'teamA';

    const eligiblePlayers = (innocentTeam.lineup || []).filter((p: any) => (p.remainingLife ?? 2) > 0);
    const selectOptions: any[] = [];

    eligiblePlayers.forEach((p: any) => {
      if (p.deck1 && !p.deck1.isDead) {
        selectOptions.push({
          label: `${p.ign} — ${p.deck1.archetype}`,
          value: `${innocentTeamKey}::${p.ign}::${p.deck1.archetype}`,
          description: `Deck 1 • Sisa Life: ${p.remainingLife}`,
        });
      }
      if (p.deck2 && !p.deck2.isDead) {
        selectOptions.push({
          label: `${p.ign} — ${p.deck2.archetype}`,
          value: `${innocentTeamKey}::${p.ign}::${p.deck2.archetype}`,
          description: `Deck 2 • Sisa Life: ${p.remainingLife}`,
        });
      }
    });

    if (selectOptions.length > 0) {
      return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
        content:
          `✅ **Status SS Hand Game ${lastGame.gameNumber} berhasil diperbarui.**\n\n` +
          `⚠️ **PERINGATAN SANKSI DECKLOSS TERDETEKSI!**\n` +
          `• **${penaltyTeam.name}** telah mencapai **2x Warning SS Hand**.\n` +
          `• Silakan pilih pemain dan deck dari **${innocentTeam.name}** untuk klaim **Technical Win (TW)**:`,
        components: [
          {
            type: 1,
            components: [
              {
                type: 3,
                custom_id: `deckloss_claim_${match.id}`,
                placeholder: 'Pilih pemain penerima Technical Win...',
                min_values: 1,
                max_values: 1,
                options: selectOptions.slice(0, 25),
              },
            ],
          },
        ],
      });
    }
  }

  return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
    content: `✅ **Status SS Hand Game ${lastGame.gameNumber} berhasil diperbarui.**\n• SS Hand Tim A: **${newSsHandA ? 'Terkirim' : 'Tidak Terkirim'}**\n• SS Hand Tim B: **${newSsHandB ? 'Terkirim' : 'Tidak Terkirim'}**`,
  });
}
  
