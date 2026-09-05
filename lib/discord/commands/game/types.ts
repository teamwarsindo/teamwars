import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { discordAPI, getEmbedFooterText } from '@/lib/discord/utils';

export interface GameContext {
  interaction: any;
  channelId: string;
  appId: string;
  token: string;
  match: MatchScheduleItem;
  reportData: any;
  optMap: Record<string, any>;
  isBeforeKickoff: boolean;
  userIsAdmin: boolean;
}

export function getOptionMap(options: any[] = []): Record<string, any> {
  const map: Record<string, any> = {};
  for (const opt of options) map[opt.name] = opt.value;
  return map;
}

export async function resolveMatchFromChannel(channelId: string) {
  const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
  const currentMatch = schedules.find((m) => m.discordChannelId === channelId);
  if (currentMatch) return currentMatch;

  const messages = (await kv.hgetall<Record<string, any>>('discord:match_messages')) || {};
  for (const [matchId, raw] of Object.entries(messages)) {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (data.matchChannel?.channelId === channelId) {
      return schedules.find((m) => m.id === matchId) || null;
    }
  }
  return null;
}

// 🏷️ Ambil emoji tim dari database 'twi:teams'
export async function getTeamEmojiByMatch(match: any, teamKey: 'A' | 'B'): Promise<string> {
  if (!match) return '⚔️';
  const targetId = teamKey === 'A' ? (match.teamAId || match.teamA) : (match.teamBId || match.teamB);
  if (!targetId) return '⚔️';

  try {
    const teams = (await kv.get<any[]>('twi:teams')) || [];
    const found = teams.find(
      (t) =>
        String(t.id).toLowerCase() === String(targetId).toLowerCase() ||
        String(t.slug).toLowerCase() === String(targetId).toLowerCase() ||
        String(t.name).toLowerCase() === String(targetId).toLowerCase()
    );

    if (found?.emoji) return found.emoji;
    if (found?.emojiId) {
      const code = found.slug || found.code || targetId;
      return `<:${code}:${found.emojiId}>`;
    }
  } catch (err) {
    console.error('Error fetching team emoji:', err);
  }

  if (teamKey === 'A' && match.teamAEmoji) return match.teamAEmoji;
  if (teamKey === 'B' && match.teamBEmoji) return match.teamBEmoji;

  return '⚔️';
}

// 🎥 Helper deteksi platform dan tautan live streaming
export function resolveStreamDisplay(match: any, reportData?: any): { streamerDisplay: string; streamUrlDisplay: string } {
  const meta = reportData?.metadata || {};
  const streamerId = match?.streamerDiscordId || meta.streamerDiscordId;
  const streamerName = match?.streamer || match?.streamerName || meta.streamer;
  const streamUrl = match?.streamLink || meta.streamUrl || meta.streamLink;

  let streamerDisplay = '-';
  if (streamerId) {
    streamerDisplay = `<@${streamerId}>`;
  } else if (streamerName && streamerName.trim() !== '') {
    streamerDisplay = streamerName;
  }

  let streamUrlDisplay = 'Sharescreen Pemain';
  if (streamUrl && typeof streamUrl === 'string' && streamUrl.trim() !== '') {
    const cleanUrl = streamUrl.trim();
    if (cleanUrl.includes('tiktok.com')) {
      streamUrlDisplay = `[TikTok Live](${cleanUrl})`;
    } else if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
      streamUrlDisplay = `[YouTube Live](${cleanUrl})`;
    } else {
      streamUrlDisplay = `[Live Streaming](${cleanUrl})`;
    }
  }

  return { streamerDisplay, streamUrlDisplay };
}

// 🏷️ Helper format riwayat game per deck ([G1, G2R, G3R, G4R])
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
    return isRepeat ? `G${g.gameNumber}R` : `G${g.gameNumber}`;
  });

  return ` [${tags.join(', ')}]`;
}

// 📊 Render Embed Live Match Tracker di Camp
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

  // 1. Hitung Sisa Nyawa Tim (Akumulasi deck aktif)
  let aliveDecksCount = 0;
  (team.lineup || []).forEach((p: any) => {
    if (p.deck1 && !p.deck1.isDead) aliveDecksCount++;
    if (p.deck2 && !p.deck2.isDead) aliveDecksCount++;
  });

  const repeatsUsed = team.repeatsUsed || 0;
  const warningsUsed = team.warningsUsed || 0;

  // 2. Format Lineup Pemain & Cabang Deck
  const lineupSections = (team.lineup || []).map((p: any, idx: number) => {
    const pIgn = p.ign || 'Pemain';
    const dlId = p.idDuelLinks ? ` (${p.idDuelLinks})` : '';

    const formatDeck = (deck: any, isLast: boolean) => {
      const branch = isLast ? '┗' : '┣';
      if (!deck) return `${branch} ❌ Belum Submit`;

      const shortSkill = deck.skill ? skillsMap[deck.skill] || deck.skill : '';
      const skillText = shortSkill ? ` • ${shortSkill}` : '';
      const fullName = `${deck.archetype}${skillText}`;

      // Kasus Hangus akibat Repeat
      if (deck.isDead && !deck.losses && !deck.wins) {
        return `${branch} ❌ ~~${fullName}~~ [Hangus]`;
      }

      // Kasus Gugur / Kalah
      if (deck.isDead) {
        const historyTag = formatDeckHistoryTag(games, pIgn, deck.archetype);
        return `${branch} ❌ ~~${fullName}~~${historyTag}`;
      }

      // Kasus Deck Masih Aktif
      const historyTag = formatDeckHistoryTag(games, pIgn, deck.archetype);
      return `${branch} ✅ ${fullName}${historyTag}`;
    };

    return `${idx + 1}. ${pIgn}${dlId}\n${formatDeck(p.deck1, false)}\n${formatDeck(p.deck2, true)}`;
  });

  // 3. Riwayat Pelanggaran SS Hand
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
      } else if (warningCounter === 2) {
        ssViolations.push(`• G${g.gameNumber}: ${violatorIgn} *(Warning 2 / Deckloss)*`);
        warningCounter = 0;
      }
    }
  });

  const violationText = ssViolations.length > 0 ? ssViolations.join('\n') : '• Tidak ada';

  // 4. Instruksi Pertandingan Dinamis Tanpa Asumsi
  const lastGame = games.length > 0 ? games[games.length - 1] : null;
  const isWinner = lastGame ? lastGame.winner === teamKey : false;
  const lastPlayer = lastGame ? (teamKey === 'teamA' ? lastGame.playerA : lastGame.playerB) : null;
  const lastPlayerObj = lastPlayer
    ? (team.lineup || []).find((x: any) => x.ign?.toLowerCase() === lastPlayer.ign?.toLowerCase())
    : null;

  let instructionLines: string[] = [];

  if (reportData.isFinished) {
    const isMatchWinner = reportData.winnerTeam === teamKey;
    instructionLines.push(
      isMatchWinner
        ? `• Selamat kepada **${team.name}** atas kemenangannya!`
        : `• Pertandingan telah selesai. Terima kasih atas partisipasinya!`
    );
  } else if (!lastGame) {
    instructionLines.push(`• **${team.name}** persiapkan pemain pertama.`);
  } else if (isWinner) {
    instructionLines.push(`• **${lastPlayer.ign}** (Stay table)`);
    instructionLines.push(`• Menunggu lawan dari **${opponent.name}**.`);
  } else {
    const isDecklossTriggered =
      (teamKey === 'teamA' && lastGame.ssHandA === false && warningsUsed === 0) ||
      (teamKey === 'teamB' && lastGame.ssHandB === false && warningsUsed === 0);

    const isPlayerDead = (lastPlayerObj?.remainingLife ?? 0) <= 0;

    if (isDecklossTriggered && isPlayerDead) {
      instructionLines.push(`• **${team.name}** terkena sanksi akumulasi 2x Warning SS Hand (Deckloss)`);
      instructionLines.push(`• **${lastPlayer.ign}** telah gugur, sanksi Deckloss wajib dibebankan ke pemain pilihan tim selanjutnya`);
      instructionLines.push(`• **${team.name}** tentukan pemain berikutnya beserta deck yang akan dipotong Deckloss`);
    } else if (isPlayerDead) {
      instructionLines.push(`• **${lastPlayer.ign}** telah gugur.`);
      instructionLines.push(`• **${team.name}** tentukan pemain berikutnya.`);
    } else {
      const canRepeat = repeatsUsed < 2 && (lastPlayerObj?.totalWins || 0) === 0;
      if (canRepeat) {
        instructionLines.push(`• **${lastPlayer.ign}** gunakan repeat untuk deck ${lastPlayer.archetype} atau gunakan deck kedua.`);
      } else {
        instructionLines.push(`• **${lastPlayer.ign}** silakan gunakan deck berikutnya.`);
      }
    }
  }

  // 5. Susun Embed Murni Acuan Tangkapan Layar
  const description =
    `🟩 **EMBED: Live Tracker (Week ${matchWeek})**\n\n` +
    `📦 **Sisa Nyawa Tim:** ${aliveDecksCount} / 10\n` +
    `🔄 **Repeat:** ${repeatsUsed} / 2\n` +
    `⚠️ **Warning SS Aktif:** ${warningsUsed} / 2\n\n` +
    `🔗 **Regulasi:** [teamwars.web.id/rules](https://teamwars.web.id/rules)\n\n` +
    `${lineupSections.join('\n\n')}\n\n` +
    `⚠️ **Riwayat Pelanggaran SS Hand**\n` +
    `${violationText}\n\n` +
    `📢 **Instruksi Pertandingan**\n` +
    `${instructionLines.join('\n')}`;

  return {
    color: 0x2ecc71,
    description,
    footer: { text: getEmbedFooterText() },
  };
}

// 🔁 Sync Tracker ke Camp (Delete-and-Repost)
export async function syncCampTrackers(matchId: string, matchWeek: number | string, reportData: any, match: any) {
  try {
    const matchMessages = (await kv.hgetall<Record<string, any>>('discord:match_messages')) || {};
    const rawMsg = matchMessages[matchId];
    if (!rawMsg) return;

    const msgData = typeof rawMsg === 'string' ? JSON.parse(rawMsg) : rawMsg;
    let changed = false;

    // Camp Tim A
    if (msgData.campA?.channelId) {
      if (msgData.campA.trackerMsgId) {
        await discordAPI(`/channels/${msgData.campA.channelId}/messages/${msgData.campA.trackerMsgId}`, 'DELETE').catch(() => null);
      }
      const embedA = await renderCampTrackerEmbed('teamA', reportData, match, matchWeek);
      const resA = await discordAPI(`/channels/${msgData.campA.channelId}/messages`, 'POST', { embeds: [embedA] });
      if (resA?.id) {
        msgData.campA.trackerMsgId = resA.id;
        changed = true;
      }
    }

    // Camp Tim B
    if (msgData.campB?.channelId) {
      if (msgData.campB.trackerMsgId) {
        await discordAPI(`/channels/${msgData.campB.channelId}/messages/${msgData.campB.trackerMsgId}`, 'DELETE').catch(() => null);
      }
      const embedB = await renderCampTrackerEmbed('teamB', reportData, match, matchWeek);
      const resB = await discordAPI(`/channels/${msgData.campB.channelId}/messages`, 'POST', { embeds: [embedB] });
      if (resB?.id) {
        msgData.campB.trackerMsgId = resB.id;
        changed = true;
      }
    }

    if (changed) {
      await kv.hset('discord:match_messages', { [matchId]: JSON.stringify(msgData) });
    }
  } catch (err) {
    console.error('Error syncing camp trackers:', err);
  }
    }
