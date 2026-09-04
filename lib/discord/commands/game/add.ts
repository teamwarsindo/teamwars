import { kv } from '@vercel/kv';
import { discordAPI, formatWIBDate, getEmbedFooterText } from '@/lib/discord/utils';
import { GameContext, syncCampTrackers, getTeamEmojiFromMatch } from './types';

export async function handleGameAdd(ctx: GameContext) {
  const { channelId, appId, token, match, reportData, optMap, isBeforeKickoff, userIsAdmin } = ctx;

  const scoreA = reportData.teamA?.score || 0;
  const scoreB = reportData.teamB?.score || 0;

  if (scoreA >= 10 || scoreB >= 10 || reportData.isFinished) {
    return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
      content: '⚠️ **Pertandingan sudah selesai!** Skor telah mencapai batas kemenangan.',
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

  // 1. Logika Repeat
  if (isRepeatA) {
    reportData.teamA.repeatsUsed = (reportData.teamA.repeatsUsed || 0) + 1;
    dA.isRepeatUsed = true;
    dA.isDead = false;
    if (dA === pA.deck1 && pA.deck2) pA.deck2.isDead = true;
    if (dA === pA.deck2 && pA.deck1) pA.deck1.isDead = true;
    pA.remainingLife = 1;
  }

  if (isRepeatB) {
    reportData.teamB.repeatsUsed = (reportData.teamB.repeatsUsed || 0) + 1;
    dB.isRepeatUsed = true;
    dB.isDead = false;
    if (dB === pB.deck1 && pB.deck2) pB.deck2.isDead = true;
    if (dB === pB.deck2 && pB.deck1) pB.deck1.isDead = true;
    pB.remainingLife = 1;
  }

  const winnerTeamKey = winnerOpt === 'A' ? 'teamA' : 'teamB';

  // 2. Kalkulasi Skor & Status Hidup
  if (winnerOpt === 'A') {
    reportData.teamA.score = scoreA + 1;
    dA.wins = (dA.wins || 0) + 1;
    pA.totalWins = (pA.totalWins || 0) + 1;

    pB.remainingLife = Math.max(0, (pB.remainingLife || 2) - 1);
    dB.isDead = true;
    dB.losses = (dB.losses || 0) + 1;
    pB.totalLosses = (pB.totalLosses || 0) + 1;
  } else {
    reportData.teamB.score = scoreB + 1;
    dB.wins = (dB.wins || 0) + 1;
    pB.totalWins = (pB.totalWins || 0) + 1;

    pA.remainingLife = Math.max(0, (pA.remainingLife || 2) - 1);
    dA.isDead = true;
    dA.losses = (dA.losses || 0) + 1;
    pA.totalLosses = (pA.totalLosses || 0) + 1;
  }

  // 3. Akumulasi Warning SS Hand
  let decklossNotice = '';
  if (!ssHandA) {
    const currentW = (reportData.teamA.warningsUsed || 0) + 1;
    if (currentW >= 2) {
      reportData.teamA.warningsUsed = 0;
      reportData.teamB.score = (reportData.teamB.score || 0) + 1;
      decklossNotice += `\n⚠️ **${reportData.teamA.name}** terkena akumulasi 2x Warning SS Hand! Kena sanksi **Deckloss** (+1 Poin untuk ${reportData.teamB.name}) & status warning di-reset ke 0.`;
    } else {
      reportData.teamA.warningsUsed = currentW;
    }
  }

  if (!ssHandB) {
    const currentW = (reportData.teamB.warningsUsed || 0) + 1;
    if (currentW >= 2) {
      reportData.teamB.warningsUsed = 0;
      reportData.teamA.score = (reportData.teamA.score || 0) + 1;
      decklossNotice += `\n⚠️ **${reportData.teamB.name}** terkena akumulasi 2x Warning SS Hand! Kena sanksi **Deckloss** (+1 Poin untuk ${reportData.teamA.name}) & status warning di-reset ke 0.`;
    } else {
      reportData.teamB.warningsUsed = currentW;
    }
  }

  const gameRecord = {
    gameNumber,
    winner: winnerTeamKey,
    playerA: { ign: pA.ign, archetype: dA.archetype, skill: dA.skill, isRepeat: isRepeatA },
    playerB: { ign: pB.ign, archetype: dB.archetype, skill: dB.skill, isRepeat: isRepeatB },
    ssHandA,
    ssHandB,
    notes,
    timestamp: new Date().toISOString(),
  };

  if (!reportData.games) reportData.games = [];
  reportData.games.push(gameRecord);
  reportData.finalScore = { teamA: reportData.teamA.score, teamB: reportData.teamB.score };

  const isTeamAWon = reportData.teamA.score >= 10 || lineupB.every((p: any) => (p.remainingLife ?? 0) <= 0);
  const isTeamBWon = reportData.teamB.score >= 10 || lineupA.every((p: any) => (p.remainingLife ?? 0) <= 0);

  if (isTeamAWon) {
    reportData.isFinished = true;
    reportData.winnerTeam = 'teamA';
  } else if (isTeamBWon) {
    reportData.isFinished = true;
    reportData.winnerTeam = 'teamB';
  }

  const matchWeek = match.weekNumber ?? 5;

  if (!isBeforeKickoff) {
    await kv.hset('twi:match_reports', { [match.id]: reportData });
    syncCampTrackers(match.id, matchWeek, reportData, match).catch(console.error);
  }

  // 4. Match Logs 1 Baris dengan format [W] ⸺ [L]
  const matchLogsLines = reportData.games.map((g: any) => {
    const isAWin = g.winner === 'teamA';
    const tagRA = g.playerA.isRepeat ? ' `[R]`' : '';
    const tagRB = g.playerB.isRepeat ? ' `[R]`' : '';
    const resultFormat = isAWin ? '`[W]` ⸺ `[L]`' : '`[L]` ⸺ `[W]`';
    return `• **G${g.gameNumber}:** ${g.playerA.ign}${tagRA} ${resultFormat} ${g.playerB.ign}${tagRB}`;
  });

  // 5. Helper Deteksi Riwayat Game untuk Setiap Deck dari games[]
  const getDeckGameNumbers = (playerIgn: string, archetype: string): number[] => {
    const history: number[] = [];
    (reportData.games || []).forEach((g: any) => {
      if (
        (g.playerA?.ign?.toLowerCase() === playerIgn.toLowerCase() && g.playerA?.archetype?.toLowerCase() === archetype.toLowerCase()) ||
        (g.playerB?.ign?.toLowerCase() === playerIgn.toLowerCase() && g.playerB?.archetype?.toLowerCase() === archetype.toLowerCase())
      ) {
        history.push(g.gameNumber);
      }
    });
    return history;
  };

  // 6. Rekap Lineup Publik (Opsi 3: Anti-Bocor)
  const renderPublicDeck = (pIgn: string, deck: any, isLast: boolean) => {
    const prefix = isLast ? '┗' : '┣';
    if (!deck) return `${prefix} ❓ *[Belum Terbuka]*`;

    const history = getDeckGameNumbers(pIgn, deck.archetype);
    if (history.length > 0) {
      const gStr = deck.isRepeatUsed ? `[G${history.join(', G')}:R]` : `[G${history.join(', G')}]`;
      const skillText = deck.skill ? ` • ${deck.skill}` : '';
      if (deck.isDead) {
        return `${prefix} 🔴 ~~${deck.archetype}${skillText}~~ \`${gStr}\``;
      }
      return `${prefix} 🟢 ${deck.archetype}${skillText} \`${gStr}\``;
    }

    if (deck.isDead && !deck.losses) {
      return `${prefix} ⚫ *~~[Hangus: Repeat]~~*`;
    }

    return `${prefix} ❓ *[Belum Terbuka]*`;
  };

  const renderTeamLineupPublic = (team: any) => {
    const activeOrPlayed: string[] = [];
    let unplayedCount = 0;

    (team.lineup || []).forEach((p: any) => {
      const d1Games = p.deck1 ? getDeckGameNumbers(p.ign, p.deck1.archetype) : [];
      const d2Games = p.deck2 ? getDeckGameNumbers(p.ign, p.deck2.archetype) : [];
      const d1Burned = p.deck1?.isDead && !p.deck1?.losses;
      const d2Burned = p.deck2?.isDead && !p.deck2?.losses;

      if (d1Games.length > 0 || d2Games.length > 0 || d1Burned || d2Burned) {
        const life = p.remainingLife ?? 2;
        let badge = '[❤️❤️]';
        let status = '*(Sedang Main)*';
        let nameStr = `**${p.ign}**`;

        if (life === 1) badge = '[❤️]';
        if (life <= 0) {
          badge = '[💀]';
          status = '*(Gugur)*';
          nameStr = `~~${p.ign}~~`;
        }

        activeOrPlayed.push(
          `${activeOrPlayed.length + 1}. \`${badge}\` ${nameStr} ${status}\n` +
          `${renderPublicDeck(p.ign, p.deck1, false)}\n` +
          `${renderPublicDeck(p.ign, p.deck2, true)}`
        );
      } else {
        unplayedCount++;
      }
    });

    if (unplayedCount > 0) {
      activeOrPlayed.push(`• *Sisa ${unplayedCount} Pemain Belum Bertanding*`);
    }

    return activeOrPlayed.join('\n');
  };

  // 7. Header Metadata & Instruksi
  const m = match as any;
  const emojiA = getTeamEmojiFromMatch(match, 'A', reportData.teamA.slug || reportData.teamA.name);
  const emojiB = getTeamEmojiFromMatch(match, 'B', reportData.teamB.slug || reportData.teamB.name);

  const refereeDisplay = m.refereeDiscordId ? `<@${m.refereeDiscordId}>` : m.refereeName || 'Belum ditentukan';

  let streamerDisplay = 'Belum tersedia';
  if (m.streamLink) {
    streamerDisplay = `[YouTube Live Stream](${m.streamLink})`;
  } else if (m.streamerDiscordId) {
    streamerDisplay = `<@${m.streamerDiscordId}>`;
  } else if (m.streamerName) {
    streamerDisplay = m.streamerName;
  }

  const scheduleDisplay = formatWIBDate(match.matchDate);

  const winnerPlayerIgn = winnerOpt === 'A' ? pA.ign : pB.ign;
  const loserPlayerObj = winnerOpt === 'A' ? pB : pA;
  const loserTeam = winnerOpt === 'A' ? reportData.teamB : reportData.teamA;
  const loserTeamLineup = winnerOpt === 'A' ? lineupB : lineupA;

  let loserInstruction = '';
  if ((loserPlayerObj.remainingLife ?? 2) <= 0) {
    const countGugur = loserTeamLineup.filter((x: any) => (x.remainingLife ?? 2) <= 0).length;
    const urutanStr = ['pertama', 'kedua', 'ketiga', 'keempat', 'kelima'][countGugur] || 'berikutnya';
    loserInstruction = `• **${loserTeam.name}** pilih pemain ${urutanStr}`;
  } else {
    loserInstruction = `• **${loserPlayerObj.ign}** silakan gunakan repeat atau pakai deck selanjutnya`;
  }

  const instructions = reportData.isFinished
    ? `• Pertandingan telah selesai! Selamat kepada **${winnerOpt === 'A' ? reportData.teamA.name : reportData.teamB.name}** atas kemenangannya.`
    : `• **${winnerPlayerIgn}** bertahan di meja\n${loserInstruction}`;

  // 8. Susun Embed dengan Skor di Bagian Bawah
  const matchEmbed = {
    title: `⚔️ LIVE MATCH REPORT — WEEK ${matchWeek}`,
    color: winnerOpt === 'A' ? 0x3b82f6 : 0xef4444,
    description:
      `**Informasi Pertandingan:**\n` +
      `• **Referee:** ${refereeDisplay}\n` +
      `• **Streamer:** ${streamerDisplay}\n` +
      `• **Jadwal:** ${scheduleDisplay}\n` +
      (decklossNotice ? `${decklossNotice}\n` : '') +
      `\n━━━━━━━━━━━━━━━━━━━━\n\n` +
      `**Lineup & Status Deck:**\n\n` +
      `${emojiA} **${String(reportData.teamA.name).toUpperCase()}**\n` +
      `${renderTeamLineupPublic(reportData.teamA)}\n\n` +
      `${emojiB} **${String(reportData.teamB.name).toUpperCase()}**\n` +
      `${renderTeamLineupPublic(reportData.teamB)}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `**Match Logs:**\n` +
      matchLogsLines.join('\n') +
      `\n\n━━━━━━━━━━━━━━━━━━━━\n\n` +
      `# ${emojiA} \` ${reportData.teamA.score} ⸺ ${reportData.teamB.score} \` ${emojiB}\n\n` +
      `📢 **Instruksi:**\n${instructions}`,
    footer: { text: getEmbedFooterText() },
  };

  if (isBeforeKickoff && userIsAdmin) {
    return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', { embeds: [matchEmbed] });
  }

  // 9. Bersihkan Pesan Report Sebelumnya di Match Channel
  const matchMessages = (await kv.hgetall<Record<string, any>>('discord:match_messages')) || {};
  const rawMsg = matchMessages[match.id];
  let msgData: any = {};
  if (rawMsg) {
    msgData = typeof rawMsg === 'string' ? JSON.parse(rawMsg) : rawMsg;
    if (msgData.matchChannel?.lastReportMsgId) {
      await discordAPI(`/channels/${channelId}/messages/${msgData.matchChannel.lastReportMsgId}`, 'DELETE').catch(() => null);
    }
  }

  const postRes = await discordAPI(`/channels/${channelId}/messages`, 'POST', { embeds: [matchEmbed] });

  if (postRes?.id) {
    if (!msgData.matchChannel) msgData.matchChannel = { channelId };
    msgData.matchChannel.lastReportMsgId = postRes.id;
    await kv.hset('discord:match_messages', { [match.id]: JSON.stringify(msgData) });
  }

  return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
    content: `✅ **Game ${gameNumber} berhasil dicatat.**`,
  });
      }
