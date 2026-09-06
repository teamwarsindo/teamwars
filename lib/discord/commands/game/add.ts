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

// Helper format hari dan tanggal Indonesia (Sabtu, 5 September 2026 — 20.00 WIB)
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

export async function handleGameAdd(ctx: GameContext) {
  const { channelId, appId, token, match, reportData, optMap, isBeforeKickoff, userIsAdmin } = ctx;

  const scoreA = reportData.teamA?.score || 0;
  const scoreB = reportData.teamB?.score || 0;

  if (scoreA >= 10 || scoreB >= 10) {
    return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
      content: '⚠️ **Pertandingan sudah selesai!** Skor telah mencapai batas kemenangan 10.',
    });
  }

  const winnerOpt = optMap.pemenang;
  const playerAIgn = String(optMap.pemain_a || '').trim();
  const rawDeckA = String(optMap.deck_a || '').trim();
  const playerBIgn = String(optMap.pemain_b || '').trim();
  const rawDeckB = String(optMap.deck_b || '').trim();
  const ssHandA = optMap.ss_hand_a !== undefined ? Boolean(optMap.ss_hand_a) : true;
  const ssHandB = optMap.ss_hand_b !== undefined ? Boolean(optMap.ss_hand_b) : true;
  const notes = optMap.catatan || '';

  const isRepeatA = rawDeckA.startsWith('REPEAT:');
  const isRepeatB = rawDeckB.startsWith('REPEAT:');
  const deckAName = isRepeatA ? rawDeckA.replace('REPEAT:', '') : rawDeckA;
  const deckBName = isRepeatB ? rawDeckB.replace('REPEAT:', '') : rawDeckB;

  const lineupA: any[] = reportData.teamA?.lineup || [];
  const lineupB: any[] = reportData.teamB?.lineup || [];

  const pA = lineupA.find((p) => String(p.ign || '').toLowerCase() === playerAIgn.toLowerCase());
  const pB = lineupB.find((p) => String(p.ign || '').toLowerCase() === playerBIgn.toLowerCase());

  if (!pA) return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', { content: `❌ Pemain Tim A **${playerAIgn}** tidak terdaftar!` });
  if (!pB) return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', { content: `❌ Pemain Tim B **${playerBIgn}** tidak terdaftar!` });

  const dA = [pA.deck1, pA.deck2].find((d) => d && String(d.archetype || '').toLowerCase() === deckAName.toLowerCase());
  const dB = [pB.deck1, pB.deck2].find((d) => d && String(d.archetype || '').toLowerCase() === deckBName.toLowerCase());

  if (!dA) return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', { content: `❌ Deck **${deckAName}** milik ${pA.ign} tidak valid!` });
  if (!dB) return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', { content: `❌ Deck **${deckBName}** milik ${pB.ign} tidak valid!` });

  const gameNumber = (reportData.games?.length || 0) + 1;

  // 1. Logika Aktivasi Repeat
  if (isRepeatA && !dA.isRepeatUsed) {
    dA.isRepeatUsed = true;
    dA.isDead = false;
    if (dA === pA.deck1 && pA.deck2) pA.deck2.isDead = true;
    if (dA === pA.deck2 && pA.deck1) pA.deck1.isDead = true;
    pA.remainingLife = 1;
  }

  if (isRepeatB && !dB.isRepeatUsed) {
    dB.isRepeatUsed = true;
    dB.isDead = false;
    if (dB === pB.deck1 && pB.deck2) pB.deck2.isDead = true;
    if (dB === pB.deck2 && pB.deck1) pB.deck1.isDead = true;
    pB.remainingLife = 1;
  }

  // Hitung repeatsUsed secara dinamis murni dari total deck yang aktif repeat di lineup
  reportData.teamA.repeatsUsed = lineupA.reduce(
    (count: number, p: any) => count + (p.deck1?.isRepeatUsed ? 1 : 0) + (p.deck2?.isRepeatUsed ? 1 : 0),
    0
  );
  reportData.teamB.repeatsUsed = lineupB.reduce(
    (count: number, p: any) => count + (p.deck1?.isRepeatUsed ? 1 : 0) + (p.deck2?.isRepeatUsed ? 1 : 0),
    0
  );

  const winnerTeamKey = winnerOpt === 'A' ? 'teamA' : 'teamB';

  // 2. Kalkulasi Skor & Status Hidup
  if (winnerOpt === 'A') {
    reportData.teamA.score = scoreA + 1;
    dA.wins = (dA.wins || 0) + 1;
    dA.lastGameNumber = gameNumber;
    pA.totalWins = (pA.totalWins || 0) + 1;

    pB.remainingLife = Math.max(0, (pB.remainingLife || 2) - 1);
    dB.isDead = true;
    dB.losses = (dB.losses || 0) + 1;
    dB.lastGameNumber = gameNumber;
    pB.totalLosses = (pB.totalLosses || 0) + 1;
  } else {
    reportData.teamB.score = scoreB + 1;
    dB.wins = (dB.wins || 0) + 1;
    dB.lastGameNumber = gameNumber;
    pB.totalWins = (pB.totalWins || 0) + 1;

    pA.remainingLife = Math.max(0, (pA.remainingLife || 2) - 1);
    dA.isDead = true;
    dA.losses = (dA.losses || 0) + 1;
    dA.lastGameNumber = gameNumber;
    pA.totalLosses = (pA.totalLosses || 0) + 1;
  }

  // 3. Akumulasi Warning SS Hand
  if (!ssHandA) {
    reportData.teamA.warningsUsed = (reportData.teamA.warningsUsed || 0) + 1;
  }

  if (!ssHandB) {
    reportData.teamB.warningsUsed = (reportData.teamB.warningsUsed || 0) + 1;
  }

  const isPlayerARepeatActive = dA.isRepeatUsed === true;
  const isPlayerBRepeatActive = dB.isRepeatUsed === true;

  const gameRecord = {
    gameNumber,
    winner: winnerTeamKey,
    playerA: {
      ign: pA.ign,
      idDuelLinks: pA.idDuelLinks,
      archetype: dA.archetype,
      skill: dA.skill,
      isRepeat: isPlayerARepeatActive,
    },
    playerB: {
      ign: pB.ign,
      idDuelLinks: pB.idDuelLinks,
      archetype: dB.archetype,
      skill: dB.skill,
      isRepeat: isPlayerBRepeatActive,
    },
    ssHandA,
    ssHandB,
    isDeckloss: false,
    decklossTeam: '',
    notes,
    timestamp: new Date().toISOString(),
  };

  if (!reportData.games) reportData.games = [];
  reportData.games.push(gameRecord);
  reportData.finalScore = { teamA: reportData.teamA.score, teamB: reportData.teamB.score };

  // 4. Update status pemenang & penyelesaian jika skor 10
  const isTeamAWon = reportData.teamA.score >= 10;
  const isTeamBWon = reportData.teamB.score >= 10;
  const isMatchEnded = isTeamAWon || isTeamBWon;

  if (isMatchEnded) {
    reportData.isFinished = true;
    reportData.winnerTeam = isTeamAWon ? 'teamA' : 'teamB';
  } else {
    reportData.isFinished = false;
    reportData.winnerTeam = null;
  }

  // 5. Format Game Logs
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

  // 6. Metadata Header Embed
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

  const winnerColorHex = winnerOpt === 'A' 
    ? (match?.teamAColor || '#3b82f6') 
    : (match?.teamBColor || '#ef4444');

  // 7. Penentuan Instruksi Game Berikutnya
  const nextGameNumber = reportData.games.length + 1;
  const winnerPlayerIgn = winnerOpt === 'A' ? pA.ign : pB.ign;
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
    // Sanksi Deckloss untuk pemenang duel meja
    instructionLines.push(`• **${winnerTeamObj.name}** (2x Warning SS Hand)`);
    instructionLines.push(`  └ **${winnerPlayerIgn}** (Deckloss)`);

    const isWinnerOut =
      (winnerPlayerObj.remainingLife ?? 1) <= 1 ||
      Boolean(winnerPlayerObj.deck1?.isRepeatUsed || winnerPlayerObj.deck2?.isRepeatUsed);

    if (isWinnerOut) {
      instructionLines.push(`• **${winnerTeamObj.name}** (Next player)`);
    } else {
      const hasWinnerPhysicalWin = hasPlayerPhysicalWin(reportData.games, winnerPlayerObj.ign);
      const canRepeat = winnerTeamRepeatsUsed < 2 && !hasWinnerPhysicalWin;
      if (canRepeat) {
        instructionLines.push(`• **${winnerPlayerIgn}** (Next deck or repeat)`);
      } else {
        instructionLines.push(`• **${winnerPlayerIgn}** (Next deck)`);
      }
    }

    if ((loserPlayerObj.remainingLife ?? 0) <= 0) {
      instructionLines.push(`• **${loserTeamObj.name}** (Next player)`);
    } else {
      instructionLines.push(`• **${loserPlayerObj.ign}** (Next deck)`);
    }
  } else {
    // Pemenang duel meja aman
    instructionLines.push(`• **${winnerPlayerIgn}** (Stay table)`);

    if (penaltyIsLoser) {
      // Pecundang duel meja terkena sanksi Deckloss
      instructionLines.push(`• **${loserTeamObj.name}** (2x Warning SS Hand)`);

      if ((loserPlayerObj.remainingLife ?? 0) <= 0) {
        instructionLines.push(`  └ **${loserTeamObj.name}** (Next player) (Deckloss)`);
      } else {
        const hasLoserPhysicalWin = hasPlayerPhysicalWin(reportData.games, loserPlayerObj.ign);
        const canRepeat = loserTeamRepeatsUsed < 2 && !hasLoserPhysicalWin;
        if (canRepeat) {
          instructionLines.push(`  └ **${loserPlayerObj.ign}** (Next deck or repeat) (Deckloss)`);
        } else {
          instructionLines.push(`  └ **${loserPlayerObj.ign}** (Next deck) (Deckloss)`);
        }
      }
    } else {
      // Alur normal tanpa sanksi
      if ((loserPlayerObj.remainingLife ?? 0) <= 0) {
        instructionLines.push(`• **${loserTeamObj.name}** (Next player)`);
      } else {
        const hasLoserPhysicalWin = hasPlayerPhysicalWin(reportData.games, loserPlayerObj.ign);
        const canRepeat = loserTeamRepeatsUsed < 2 && !hasLoserPhysicalWin;
        if (canRepeat) {
          instructionLines.push(`• **${loserPlayerObj.ign}** (Next deck or repeat)`);
        } else {
          instructionLines.push(`• **${loserPlayerObj.ign}** (Next deck)`);
        }
      }
    }
  }

  // Simpan instruksi aktif ke reportData agar sinkron dengan tracker camp
  reportData.currentInstructions = {
    header: sectionHeader,
    lines: instructionLines,
  };

  const matchWeek = match.weekNumber ?? reportData.week ?? 5;

  // 8. Simpan ke KV
  if (!isBeforeKickoff) {
    await kv.hset('twi:match_reports', { [match.id]: reportData });
    await syncCampTrackers(match.id, matchWeek, reportData, match, gameRecord).catch(console.error);

    if (isMatchEnded) {
      await syncOfficialMatchReport(match, reportData).catch(console.error);
    }
  }

  const scoreSectionTitle = isMatchEnded ? '🏆 **Skor Akhir:**' : '📊 **Skor Sementara:**';
  const separator = '──────────────────────────────';

  // 9. Render Embed Live Match Report
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

  // 10. Hapus Pesan Lama dan Kirim Pesan Baru
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
    console.error('Error saat delete-and-repost match report:', err);
  }

  // 11. Cek Sanksi Deckloss: Jika 2x Warning SS Hand terpicu, kirim Select Menu untuk Wasit
  if (!isMatchEnded && (isTeamAPenalty || isTeamBPenalty)) {
    const penaltyTeam = isTeamAPenalty ? reportData.teamA : reportData.teamB;
    const innocentTeam = isTeamAPenalty ? reportData.teamB : reportData.teamA;
    const innocentTeamKey = isTeamAPenalty ? 'teamB' : 'teamA';

    // Ambil pemain lawan yang masih memiliki nyawa aktif
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
          `✅ **Game ${gameNumber} berhasil dicatat.**\n\n` +
          `⚠️ **PERINGATAN SANKSI DECKLOSS!**\n` +
          `• **${penaltyTeam.name}** telah mencapai **2x Warning SS Hand**.\n` +
          `• Silakan pilih pemain dan deck dari **${innocentTeam.name}** untuk klaim **Technical Win (TW)**:`,
        components: [
          {
            type: 1, // Action Row
            components: [
              {
                type: 3, // String Select Menu
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

  // Respon standar jika tidak ada penalti 2x Warning
  return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
    content: `✅ **Game ${gameNumber} berhasil dicatat.**`,
  });
}
