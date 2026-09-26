import { kv } from '@vercel/kv';
import { discordAPI, getEmbedFooterText, hexToDecimal } from '@/lib/discord/utils';
import { getTeamEmojiByMatch, hasPlayerPhysicalWin } from './helpers';

function formatDeckHistoryTag(games: any[], playerIgn: string, archetype: string): string {
  const matchingGames = games.filter((g) => {
    const isA =
      g.playerA?.ign?.toLowerCase() === playerIgn.toLowerCase() &&
      g.playerA?.archetype?.toLowerCase() === archetype.toLowerCase();
    const isB =
      g.playerB?.ign?.toLowerCase() === playerIgn.toLowerCase() &&
      g.playerB?.archetype?.toLowerCase() === archetype.toLowerCase();
    return isA || isB;
  });

  if (matchingGames.length === 0) return '';

  const tags = matchingGames.map((g) => {
    const isA = g.playerA?.ign?.toLowerCase() === playerIgn.toLowerCase();
    const isRepeat = isA ? g.playerA?.isRepeat : g.playerB?.isRepeat;
    const isDeckloss = g.isDeckloss;
    const isLoss = isDeckloss && g.decklossTeam === (isA ? 'teamA' : 'teamB');

    if (isDeckloss) {
      return isLoss ? `G${g.gameNumber}TL` : `G${g.gameNumber}TW`;
    }
    return isRepeat ? `G${g.gameNumber}R` : `G${g.gameNumber}`;
  });

  return ` [${tags.join(', ')}]`;
}

export async function renderCampTrackerEmbed(
  teamKey: 'teamA' | 'teamB',
  reportData: any,
  match: any,
  matchWeek: number | string
) {
  const team = teamKey === 'teamA' ? reportData.teamA : reportData.teamB;
  const opponent = teamKey === 'teamA' ? reportData.teamB : reportData.teamA;
  const games: any[] = reportData.games || [];
  const skillsMap: Record<string, string> = (await kv.get('twi:master_skills')) || {};
  const teamEmoji = await getTeamEmojiByMatch(match, teamKey === 'teamA' ? 'A' : 'B', team.slug || team.name);

  let aliveDecksCount = 0;
  (team.lineup || []).forEach((p: any) => {
    if (p.deck1 && !p.deck1.isDead) aliveDecksCount++;
    if (p.deck2 && !p.deck2.isDead) aliveDecksCount++;
  });

  const repeatsUsed = team.repeatsUsed || 0;
  const warningsUsed = team.warningsUsed || 0;

  const lineupSections = (team.lineup || []).map((p: any, idx: number) => {
    const pIgn = p.ign || 'Pemain';
    const dlId = p.idDuelLinks ? ` (${p.idDuelLinks})` : '';

    const formatDeck = (deck: any, isLast: boolean) => {
      const branch = isLast ? '┗' : '┣';
      if (!deck) return `${branch} ❌ Belum Submit`;

      const shortSkill = deck.skill ? skillsMap[deck.skill] || deck.skill : '';
      const skillText = shortSkill ? ` • ${shortSkill}` : '';
      const fullName = `${deck.archetype}${skillText}`;

      if (deck.isDead && !deck.losses && !deck.wins) {
        return `${branch} ❌ ~~${fullName}~~ [Hangus]`;
      }
      if (deck.isDead) {
        const historyTag = formatDeckHistoryTag(games, pIgn, deck.archetype);
        return `${branch} ❌ ~~${fullName}~~${historyTag}`;
      }
      const historyTag = formatDeckHistoryTag(games, pIgn, deck.archetype);
      return `${branch} ✅ ${fullName}${historyTag}`;
    };

    return `${idx + 1}. **${pIgn}**${dlId}\n${formatDeck(p.deck1, false)}\n${formatDeck(p.deck2, true)}`;
  });

  const ssViolations: string[] = [];
  let warningCounter = 0;
  games.forEach((g: any) => {
    const isViolatorA = teamKey === 'teamA' && g.ssHandA === false;
    const isViolatorB = teamKey === 'teamB' && g.ssHandB === false;

    if (isViolatorA || isViolatorB) {
      warningCounter++;
      const violatorIgn = isViolatorA ? g.playerA?.ign : g.playerB?.ign;
      if (warningCounter === 1) {
        ssViolations.push(`• G${g.gameNumber}: ${violatorIgn} *(Warning 1)*`);
      } else if (warningCounter >= 2) {
        ssViolations.push(`• G${g.gameNumber}: ${violatorIgn} *(Warning ${warningCounter} / Deckloss)*`);
      }
    }
  });

  const violationText = ssViolations.length > 0 ? ssViolations.join('\n') : '• Tidak ada';

  const isMatchEnded = (reportData.teamA?.score || 0) >= 10 || (reportData.teamB?.score || 0) >= 10;
  const lastGame = games.length > 0 ? games[games.length - 1] : null;
  const isWinner = lastGame ? lastGame.winner === teamKey : false;
  const lastPlayer = lastGame ? (teamKey === 'teamA' ? lastGame.playerA : lastGame.playerB) : null;
  const lastPlayerObj = lastPlayer
    ? (team.lineup || []).find((x: any) => x.ign?.toLowerCase() === lastPlayer.ign?.toLowerCase())
    : null;

  const thisTeamPenalty = warningsUsed >= 2;
  const opponentPenalty = (opponent?.warningsUsed || 0) >= 2;
  const isTimerPenalty = Boolean(lastGame?.isDeckloss && String(lastGame?.notes || '').toLowerCase().includes('timer'));

  let sectionTitle = '📢 **Instruksi Pertandingan:**';
  let instructionLines: string[] = [];

  if (isMatchEnded) {
    sectionTitle = '📢 **Status Pertandingan:**';
    if ((team.score || 0) >= 10) {
      instructionLines.push(`• Selamat kepada **${team.name}** atas kemenangannya!`);
    } else {
      instructionLines.push(`• Seluruh sisa nyawa habis. Terima kasih kepada **${team.name}** atas perjuangannya!`);
    }
  } else if (!lastGame) {
    instructionLines.push(`• **${team.name}** persiapkan pemain pertama.`);
  } else if (thisTeamPenalty) {
    instructionLines.push(`• ⚠️ **${team.name}** (2x Warning SS Hand)`);
    if (lastPlayer) {
      instructionLines.push(`  └ **${lastPlayer.ign}** (Deckloss)`);
    }

    const isLastPlayerOut =
      (lastPlayerObj?.remainingLife ?? 1) <= 1 ||
      Boolean(lastPlayerObj?.deck1?.isRepeatUsed || lastPlayerObj?.deck2?.isRepeatUsed);

    if (isLastPlayerOut) {
      instructionLines.push(`• **${team.name}** (Next player)`);
    } else {
      const hasWonPhysically = lastPlayerObj ? hasPlayerPhysicalWin(games, lastPlayerObj.ign) : false;
      const canRepeat = repeatsUsed < 2 && !hasWonPhysically;
      instructionLines.push(`• **${lastPlayer?.ign}** (${canRepeat ? 'Next deck or repeat' : 'Next deck'})`);
    }
    instructionLines.push(`• Menunggu keputusan/lawan dari **${opponent.name}**.`);
  } else if (opponentPenalty) {
    if (isWinner) instructionLines.push(`• **${lastPlayer?.ign}** (Stay table)`);
    instructionLines.push(`• Lawan (**${opponent.name}**) terkena 2x Warning SS Hand (Deckloss).`);
    instructionLines.push(`• **${team.name}** tentukan/siapkan pemain untuk klaim Technical Win.`);
  } else if (isWinner) {
    instructionLines.push(`• **${lastPlayer?.ign}** (Stay table)`);
    instructionLines.push(`• Menunggu lawan dari **${opponent.name}**.`);
  } else {
    const isPlayerDead = (lastPlayerObj?.remainingLife ?? 0) <= 0;
    const timerTag = isTimerPenalty ? ' — **Extra Timer 3 Menit**' : '';

    if (isPlayerDead) {
      instructionLines.push(`• **${lastPlayer?.ign}** telah gugur.`);
      instructionLines.push(`• **${team.name}** tentukan pemain berikutnya${timerTag}.`);
    } else {
      const hasWonPhysically = lastPlayerObj ? hasPlayerPhysicalWin(games, lastPlayerObj.ign) : false;
      const canRepeat = repeatsUsed < 2 && !hasWonPhysically;
      if (canRepeat) {
        instructionLines.push(`• **${lastPlayer?.ign}** gunakan repeat untuk deck ${lastPlayer?.archetype} atau gunakan deck kedua${timerTag}.`);
      } else {
        instructionLines.push(`• **${lastPlayer?.ign}** silakan gunakan deck berikutnya${timerTag}.`);
      }
    }
  }

  const description =
    `${teamEmoji} **${String(team.name).toUpperCase()}**\n\n` +
    `📦 Sisa Nyawa Tim: **${aliveDecksCount} / 10**\n` +
    `🔄 Repeat: **${repeatsUsed} / 2**\n` +
    `⚠️ Warning SS Aktif: **${warningsUsed} / 2**\n` +
    `🔗 Regulasi: [teamwars.web.id/rules](https://teamwars.web.id/rules)\n\n` +
    `${lineupSections.join('\n')}\n\n` +
    `⚠️ **Riwayat Pelanggaran SS Hand**\n` +
    `${violationText}\n\n` +
    `${sectionTitle}\n` +
    `${instructionLines.join('\n')}`;

  const teamColorHex =
    teamKey === 'teamA' ? match?.teamAColor || '#2ecc71' : match?.teamBColor || '#00a8fc';

  return {
    title: `📊 LIVE MATCH TRACKER — WEEK ${matchWeek}`,
    color: hexToDecimal(teamColorHex),
    description,
    footer: { text: getEmbedFooterText() },
  };
}

export async function syncCampTrackers(
  matchId: string,
  matchWeek: number | string,
  reportData: any,
  match: any
) {
  try {
    const rawMsg = await kv.hget<any>('discord:match_messages', matchId);
    let msgData: any = rawMsg ? (typeof rawMsg === 'string' ? JSON.parse(rawMsg) : rawMsg) : {};
    let isChanged = false;

    if (msgData.campA?.channelId) {
      const chA = msgData.campA.channelId;
      const oldIdA = msgData.campA.submitMsgId || msgData.campA.trackerMsgId;
      if (oldIdA) await discordAPI(`/channels/${chA}/messages/${oldIdA}`, 'DELETE').catch(() => {});

      const embedA = await renderCampTrackerEmbed('teamA', reportData, match, matchWeek);
      const resA = await discordAPI(`/channels/${chA}/messages`, 'POST', { embeds: [embedA] });
      if (resA?.id) {
        msgData.campA.submitMsgId = resA.id;
        msgData.campA.trackerMsgId = resA.id;
        isChanged = true;
      }
    }

    if (msgData.campB?.channelId) {
      const chB = msgData.campB.channelId;
      const oldIdB = msgData.campB.submitMsgId || msgData.campB.trackerMsgId;
      if (oldIdB) await discordAPI(`/channels/${chB}/messages/${oldIdB}`, 'DELETE').catch(() => {});

      const embedB = await renderCampTrackerEmbed('teamB', reportData, match, matchWeek);
      const resB = await discordAPI(`/channels/${chB}/messages`, 'POST', { embeds: [embedB] });
      if (resB?.id) {
        msgData.campB.submitMsgId = resB.id;
        msgData.campB.trackerMsgId = resB.id;
        isChanged = true;
      }
    }

    if (isChanged) {
      const freshRaw = await kv.hget<any>('discord:match_messages', matchId);
      let freshData: any = freshRaw ? (typeof freshRaw === 'string' ? JSON.parse(freshRaw) : freshRaw) : {};
      freshData = {
        ...freshData,
        campA: { ...(freshData.campA || {}), ...(msgData.campA || {}) },
        campB: { ...(freshData.campB || {}), ...(msgData.campB || {}) },
      };
      await kv.hset('discord:match_messages', { [matchId]: freshData });
    }
  } catch (err) {
    console.error('Error syncing camp trackers:', err);
  }
}
