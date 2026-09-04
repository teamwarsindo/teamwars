import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { discordAPI } from '@/lib/discord/utils';

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

// Format emoji slug tim <:kodeTim:emojiId>
export function getTeamEmoji(teamData: any): string {
  if (teamData?.emojiId && teamData?.slug) {
    return `<:${teamData.slug}:${teamData.emojiId}>`;
  }
  return '⚔️';
}

// Generate teks instruksi khusus Camp Tim
export function generateCampInstruction(team: any, opponentName: string, isWinner: boolean, lastPlayer: any): string {
  if (!lastPlayer) return `${team.name} tentukan pemain.`;

  const p = (team.lineup || []).find((x: any) => x.ign.toLowerCase() === lastPlayer.ign.toLowerCase());
  const remainingLife = p?.remainingLife ?? 2;

  // Jika tim ini menang di ronde tadi
  if (isWinner) {
    return `**${lastPlayer.ign}** bertahan di meja tanding. Menunggu lawan dari ${opponentName}.`;
  }

  // Jika tim ini kalah ronde tadi
  if (remainingLife <= 0) {
    const alivePlayers = (team.lineup || []).filter((x: any) => (x.remainingLife ?? 2) > 0);
    const countGugur = (team.lineup || []).filter((x: any) => (x.remainingLife ?? 2) <= 0).length;
    const urutanStr = ['pertama', 'kedua', 'ketiga', 'keempat', 'kelima'][countGugur] || 'berikutnya';

    if (alivePlayers.length === 0) return `Semua pemain telah tereliminasi. Pertandingan berakhir.`;
    return `${team.name} pilih pemain ${urutanStr}.`;
  }

  // Jika masih ada sisa nyawa (Kalah ronde pertama)
  const canRepeat = (team.repeatsUsed || 0) < 2 && (p.totalWins || 0) === 0;
  const d1 = p.deck1;
  const d2 = p.deck2;
  const unusedDeck = [d1, d2].find((d) => d && !d.isDead);

  if (canRepeat && unusedDeck) {
    return `${p.ign} gunakan repeat untuk deck ${lastPlayer.archetype} atau gunakan deck ${unusedDeck.archetype}.`;
  } else if (unusedDeck) {
    return `${p.ign} gunakan deck ${unusedDeck.archetype}.`;
  }

  return `${team.name} pilih pemain berikutnya.`;
}

// Render tampilan text Tracker Camp
export function renderCampTrackerText(teamKey: 'teamA' | 'teamB', reportData: any, matchWeek: number | string): string {
  const team = teamKey === 'teamA' ? reportData.teamA : reportData.teamB;
  const opponent = teamKey === 'teamA' ? reportData.teamB : reportData.teamA;
  const emoji = getTeamEmoji(team);

  const games: any[] = reportData.games || [];
  const lastGame = games.length > 0 ? games[games.length - 1] : null;
  const isWinner = lastGame ? lastGame.winner === teamKey : false;
  const lastPlayer = lastGame ? (teamKey === 'teamA' ? lastGame.playerA : lastGame.playerB) : null;

  const repeatCount = team.repeatsUsed || 0;
  const warningCount = team.warningsUsed || 0;

  // Daftar pelanggaran SS Hand
  const ssViolations: string[] = [];
  games.forEach((g) => {
    if (teamKey === 'teamA' && g.ssHandA === false) {
      ssViolations.push(`• ${g.playerA?.ign} (Game ${g.gameNumber})`);
    }
    if (teamKey === 'teamB' && g.ssHandB === false) {
      ssViolations.push(`• ${g.playerB?.ign} (Game ${g.gameNumber})`);
    }
  });

  // Lineup
  const lineupLines = (team.lineup || []).map((p: any, idx: number) => {
    const life = p.remainingLife ?? 2;
    let lifeBadge = '[❤️❤️]';
    let nameDisplay = `**${p.ign}**`;

    if (life === 1) lifeBadge = '[❤️]';
    if (life <= 0) {
      lifeBadge = '[💀]';
      nameDisplay = `~~${p.ign}~~`;
    }

    const renderDeckLine = (d: any, isLast: boolean) => {
      const prefix = isLast ? '┗' : '┣';
      if (!d) return `${prefix} ⚪ Kosong`;
      const skillText = d.skill ? ` • ${d.skill}` : '';
      const repeatTag = d.isRepeatUsed ? ' `[R]`' : '';

      if (d.isDead && d.isRepeatUsed) {
        return `${prefix} 🔴 ~~${d.archetype}${skillText}~~${repeatTag}`;
      }
      if (d.isDead && !d.losses) {
        return `${prefix} ⚫ ~~${d.archetype}${skillText}~~`;
      }
      if (d.isDead) {
        return `${prefix} 🔴 ~~${d.archetype}${skillText}~~`;
      }
      return `${prefix} 🟢 ${d.archetype}${skillText}`;
    };

    return (
      `**${idx + 1}. \`${lifeBadge}\` ${nameDisplay}** (${p.idDuelLinks || '-'})\n` +
      `${renderDeckLine(p.deck1, false)}\n` +
      `${renderDeckLine(p.deck2, true)}`
    );
  });

  const instructionText = generateCampInstruction(team, opponent.name, isWinner, lastPlayer);

  return (
    `📊 **LIVE MATCH TRACKER — WEEK ${matchWeek}**\n` +
    `${emoji} **${String(team.name).toUpperCase()}**\n\n` +
    `Repeat: \`${repeatCount}/2\` | Warning SS: \`${warningCount}/2\`\n` +
    `Pelanggaran SS:\n` +
    (ssViolations.length > 0 ? `${ssViolations.join('\n')}\n\n` : `• Tidak ada\n\n`) +
    `**Lineup & Deck:**\n` +
    lineupLines.join('\n\n') +
    `\n\n📢 **Instruksi:**\n${instructionText}`
  );
}

// Helper Sync Live Tracker Camp (DELETE lalu POST ULANG)
export async function syncCampTrackers(matchId: string, matchWeek: number | string, reportData: any) {
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
    const resA = await discordAPI(`/channels/${msgData.campA.channelId}/messages`, 'POST', {
      content: renderCampTrackerText('teamA', reportData, matchWeek),
    });
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
    const resB = await discordAPI(`/channels/${msgData.campB.channelId}/messages`, 'POST', {
      content: renderCampTrackerText('teamB', reportData, matchWeek),
    });
    if (resB?.id) {
      msgData.campB.trackerMsgId = resB.id;
      changed = true;
    }
  }

  if (changed) {
    await kv.hset('discord:match_messages', { [matchId]: JSON.stringify(msgData) });
  }
      }
