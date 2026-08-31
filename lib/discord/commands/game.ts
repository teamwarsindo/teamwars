import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { discordAPI, getEmbedFooterText } from '@/lib/discord/utils';
import { sendOrUpdateLiveTracker, TrackerPlayer } from '@/lib/discord/messages/match-briefing';

// 🛡️ Hak Akses: Wasit & Admin
function isStaff(interaction: any): boolean {
  try {
    const member = interaction?.member;
    const roles: string[] = member?.roles || [];
    const permissions = BigInt(member?.permissions || '0');
    const isAdmin = (permissions & BigInt(0x8)) === BigInt(0x8);
    return (
      isAdmin ||
      (!!DISCORD_CONFIG.ROLE_ADMIN && roles.includes(DISCORD_CONFIG.ROLE_ADMIN)) ||
      (!!DISCORD_CONFIG.ROLE_CHIEF && roles.includes(DISCORD_CONFIG.ROLE_CHIEF)) ||
      (!!DISCORD_CONFIG.ROLE_REFEREE && roles.includes(DISCORD_CONFIG.ROLE_REFEREE))
    );
  } catch {
    return false;
  }
}

function getOptionMap(options: any[] = []): Record<string, any> {
  const map: Record<string, any> = {};
  for (const opt of options) {
    map[opt.name] = opt.value;
  }
  return map;
}

// 🔍 Lookup Match Berdasarkan Channel Pertandingan
async function resolveMatchFromChannel(channelId: string) {
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

// 🔄 Helper Sync Live Tracker Camp Tim A & Tim B
async function syncCampTrackers(matchId: string, matchDateIso: string, reportData: any) {
  const matchMessages = (await kv.hgetall<Record<string, any>>('discord:match_messages')) || {};
  const rawMsg = matchMessages[matchId];
  if (!rawMsg) return;

  const msgData = typeof rawMsg === 'string' ? JSON.parse(rawMsg) : rawMsg;

  const mapTracker = (lineup: any[]): TrackerPlayer[] =>
    (lineup || []).map((p) => ({
      ign: p.ign,
      idDuelLinks: p.idDuelLinks || '',
      deck1: p.deck1 ? { archetype: p.deck1.archetype, skill: p.deck1.skill } : null,
      deck2: p.deck2 ? { archetype: p.deck2.archetype, skill: p.deck2.skill } : null,
    }));

  let changed = false;

  // Sync Camp A
  if (msgData.campA?.channelId) {
    const trackerIdA = await sendOrUpdateLiveTracker({
      channelId: msgData.campA.channelId,
      matchDateIso,
      submittedPlayers: mapTracker(reportData.teamA?.lineup),
      existingMsgId: msgData.campA.trackerMsgId,
    });
    msgData.campA.trackerMsgId = trackerIdA;
    changed = true;
  }

  // Sync Camp B
  if (msgData.campB?.channelId) {
    const trackerIdB = await sendOrUpdateLiveTracker({
      channelId: msgData.campB.channelId,
      matchDateIso,
      submittedPlayers: mapTracker(reportData.teamB?.lineup),
      existingMsgId: msgData.campB.trackerMsgId,
    });
    msgData.campB.trackerMsgId = trackerIdB;
    changed = true;
  }

  if (changed) {
    await kv.hset('discord:match_messages', { [matchId]: JSON.stringify(msgData) });
  }
}

// 🚀 Helper edit deferred interaction message (@original)
async function sendFollowup(interaction: any, payload: any) {
  const appId = process.env.DISCORD_CLIENT_ID;
  const token = interaction.token;
  await discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', payload).catch(console.error);
}

// ⚡ EKSEKUSI ASYNC (BACKGROUND)
export async function executeGameTask(interaction: any) {
  try {
    if (!isStaff(interaction)) {
      return sendFollowup(interaction, {
        content: '❌ Akses Ditolak! Hanya **Wasit Bertugas** dan **Admin** yang dapat menggunakan command ini.',
      });
    }

    const channelId = interaction.channel_id;
    const match = await resolveMatchFromChannel(channelId);

    // 🔒 Deteksi: Pastikan hanya berjalan di Channel Match yang aktif
    if (!match) {
      return sendFollowup(interaction, {
        content: '❌ Command ini hanya dapat dijalankan di dalam **Channel Match** yang aktif!',
      });
    }

    const reportData = (await kv.hget<any>('twi:match_reports', match.id)) || {};
    if (!reportData.teamA || !reportData.teamB) {
      return sendFollowup(interaction, {
        content: '❌ Dokumen match report belum ditemukan untuk pertandingan ini.',
      });
    }

    const rawOptions = interaction.data?.options || [];
    const subCommandObj = rawOptions[0]?.type === 1 ? rawOptions[0] : null;
    const subCommandName = subCommandObj?.name || 'add';
    const subOptions = subCommandObj ? subCommandObj.options || [] : rawOptions;
    const optMap = getOptionMap(subOptions);

    // ========================================================================
    // 🟢 SUBCOMMAND 1: ADD (Catat Hasil Game Baru)
    // ========================================================================
    if (subCommandName === 'add') {
      const scoreA = reportData.teamA?.score || 0;
      const scoreB = reportData.teamB?.score || 0;

      // 🔒 KUNCI: Tidak bisa add jika sudah ada tim yang mencapai 10 skor atau status match selesai
      if (scoreA >= 10 || scoreB >= 10 || reportData.isFinished) {
        return sendFollowup(interaction, {
          content: '⚠️ **Pertandingan sudah selesai!** Skor telah mencapai batas kemenangan. Jika ada kesalahan input ronde, gunakan `/game del` terlebih dahulu untuk melakukan rollback.',
        });
      }

      const winnerOpt = optMap.pemenang; // 'A' | 'B'
      const playerAIgn = String(optMap.pemain_a || '').trim();
      const deckAName = String(optMap.deck_a || '').trim();
      const playerBIgn = String(optMap.pemain_b || '').trim();
      const deckBName = String(optMap.deck_b || '').trim();
      const statusKalah = optMap.status_kalah || 'REGULAR'; // 'REGULAR' | 'REPEAT' | 'PENALTY_2'
      const notes = optMap.catatan || '';

      const lineupA: any[] = reportData.teamA?.lineup || [];
      const lineupB: any[] = reportData.teamB?.lineup || [];

      const pA = lineupA.find((p) => String(p.ign || '').toLowerCase() === playerAIgn.toLowerCase());
      const pB = lineupB.find((p) => String(p.ign || '').toLowerCase() === playerBIgn.toLowerCase());

      if (!pA) return sendFollowup(interaction, { content: `❌ Pemain Tim A **${playerAIgn}** tidak terdaftar di lineup!` });
      if (!pB) return sendFollowup(interaction, { content: `❌ Pemain Tim B **${playerBIgn}** tidak terdaftar di lineup!` });

      const dA = [pA.deck1, pA.deck2].find((d) => d && String(d.archetype || '').toLowerCase() === deckAName.toLowerCase());
      const dB = [pB.deck1, pB.deck2].find((d) => d && String(d.archetype || '').toLowerCase() === deckBName.toLowerCase());

      if (!dA) return sendFollowup(interaction, { content: `❌ Deck **${deckAName}** milik ${pA.ign} tidak valid!` });
      if (!dB) return sendFollowup(interaction, { content: `❌ Deck **${deckBName}** milik ${pB.ign} tidak valid!` });

      const gameNumber = (reportData.games?.length || 0) + 1;
      const winnerTeamKey = winnerOpt === 'A' ? 'teamA' : 'teamB';

      // Kalkulasi Kemenangan & Kekalahan
      if (winnerOpt === 'A') {
        reportData.teamA.score = scoreA + 1;
        dA.wins = (dA.wins || 0) + 1;
        pA.totalWins = (pA.totalWins || 0) + 1;

        // Tim B Kalah
        if (statusKalah === 'REPEAT') {
          reportData.teamB.repeatsUsed = (reportData.teamB.repeatsUsed || 0) + 1;
          dB.isRepeatUsed = true;
        } else if (statusKalah === 'PENALTY_2') {
          pB.remainingLife = Math.max(0, (pB.remainingLife || 2) - 2);
          if (pB.deck1) pB.deck1.isDead = true;
          if (pB.deck2) pB.deck2.isDead = true;
        } else {
          pB.remainingLife = Math.max(0, (pB.remainingLife || 2) - 1);
          dB.isDead = true;
          dB.losses = (dB.losses || 0) + 1;
          pB.totalLosses = (pB.totalLosses || 0) + 1;
        }
      } else {
        reportData.teamB.score = scoreB + 1;
        dB.wins = (dB.wins || 0) + 1;
        pB.totalWins = (pB.totalWins || 0) + 1;

        // Tim A Kalah
        if (statusKalah === 'REPEAT') {
          reportData.teamA.repeatsUsed = (reportData.teamA.repeatsUsed || 0) + 1;
          dA.isRepeatUsed = true;
        } else if (statusKalah === 'PENALTY_2') {
          pA.remainingLife = Math.max(0, (pA.remainingLife || 2) - 2);
          if (pA.deck1) pA.deck1.isDead = true;
          if (pA.deck2) pA.deck2.isDead = true;
        } else {
          pA.remainingLife = Math.max(0, (pA.remainingLife || 2) - 1);
          dA.isDead = true;
          dA.losses = (dA.losses || 0) + 1;
          pA.totalLosses = (pA.totalLosses || 0) + 1;
        }
      }

      dA.lastGameNumber = gameNumber;
      dB.lastGameNumber = gameNumber;

      // Catat Ronde Game
      const gameRecord = {
        gameNumber,
        winner: winnerTeamKey,
        playerA: { ign: pA.ign, idDuelLinks: pA.idDuelLinks, archetype: dA.archetype, skill: dA.skill },
        playerB: { ign: pB.ign, idDuelLinks: pB.idDuelLinks, archetype: dB.archetype, skill: dB.skill },
        lossCondition: statusKalah,
        notes,
        timestamp: new Date().toISOString(),
      };

      if (!reportData.games) reportData.games = [];
      reportData.games.push(gameRecord);
      reportData.finalScore = { teamA: reportData.teamA.score, teamB: reportData.teamB.score };

      // Cek apakah match selesai setelah penambahan game ini
      const isTeamAWon = reportData.teamA.score >= 10 || lineupB.every((p: any) => (p.remainingLife ?? 0) <= 0);
      const isTeamBWon = reportData.teamB.score >= 10 || lineupA.every((p: any) => (p.remainingLife ?? 0) <= 0);

      if (isTeamAWon) {
        reportData.isFinished = true;
        reportData.winnerTeam = 'teamA';
      } else if (isTeamBWon) {
        reportData.isFinished = true;
        reportData.winnerTeam = 'teamB';
      }

      // Simpan ke KV
      await kv.hset('twi:match_reports', { [match.id]: reportData });

      // Sinkronisasi Live Tracker ke kedua camp tim
      syncCampTrackers(match.id, match.matchDate, reportData).catch(console.error);

      // Kirim Game Result Log standar ke Channel Match
      const winnerName = winnerOpt === 'A' ? reportData.teamA.name : reportData.teamB.name;
      const gameEmbed = {
        title: `⚔️ HASIL GAME ${gameNumber} — ${winnerName} WIN!`,
        color: winnerOpt === 'A' ? 0x3b82f6 : 0xef4444,
        description:
          `**${reportData.teamA.name}** \`${reportData.teamA.score}\` — \`${reportData.teamB.score}\` **${reportData.teamB.name}**\n\n` +
          `• **Tim A:** ${pA.ign} (${dA.archetype})\n` +
          `• **Tim B:** ${pB.ign} (${dB.archetype})\n` +
          (statusKalah !== 'REGULAR' ? `• **Kondisi:** \`${statusKalah}\`\n` : '') +
          (notes ? `• **Catatan Wasit:** *${notes}*\n` : ''),
        footer: { text: getEmbedFooterText() },
      };

      return sendFollowup(interaction, { embeds: [gameEmbed] });
    }

    // ========================================================================
    // 🔴 SUBCOMMAND 2: DEL (Rollback Game Terakhir)
    // ========================================================================
    if (subCommandName === 'del') {
      const games: any[] = reportData.games || [];

      // 🔒 KUNCI: Tidak bisa rollback jika riwayat game masih kosong
      if (games.length === 0) {
        return sendFollowup(interaction, {
          content: '⚠️ **Belum ada riwayat game yang dicatat!** Tidak ada ronde yang dapat dihapus/di-rollback.',
        });
      }

      const targetGameNum = optMap.game_number ? Number(optMap.game_number) : games.length;
      if (targetGameNum !== games.length) {
        return sendFollowup(interaction, {
          content: `❌ Rollback saat ini hanya dapat dilakukan pada game terakhir (**Game ${games.length}**)!`,
        });
      }

      const poppedGame = games.pop();
      const winner = poppedGame.winner;
      const lossCondition = poppedGame.lossCondition || 'REGULAR';

      // Rollback Skor
      if (winner === 'teamA') {
        reportData.teamA.score = Math.max(0, (reportData.teamA.score || 1) - 1);
      } else {
        reportData.teamB.score = Math.max(0, (reportData.teamB.score || 1) - 1);
      }

      // Rollback Pemain & Deck Tim A
      const pA = (reportData.teamA.lineup || []).find((p: any) => p.ign.toLowerCase() === poppedGame.playerA.ign.toLowerCase());
      if (pA) {
        const dA = [pA.deck1, pA.deck2].find((d) => d && d.archetype?.toLowerCase() === poppedGame.playerA.archetype?.toLowerCase());
        if (winner === 'teamA') {
          if (dA) dA.wins = Math.max(0, (dA.wins || 1) - 1);
          pA.totalWins = Math.max(0, (pA.totalWins || 1) - 1);
        } else {
          if (lossCondition === 'REPEAT') {
            reportData.teamA.repeatsUsed = Math.max(0, (reportData.teamA.repeatsUsed || 1) - 1);
            if (dA) dA.isRepeatUsed = false;
          } else if (lossCondition === 'PENALTY_2') {
            pA.remainingLife = Math.min(2, (pA.remainingLife || 0) + 2);
            if (pA.deck1) pA.deck1.isDead = false;
            if (pA.deck2) pA.deck2.isDead = false;
          } else {
            if (dA) {
              dA.isDead = false;
              dA.losses = Math.max(0, (dA.losses || 1) - 1);
            }
            pA.remainingLife = Math.min(2, (pA.remainingLife || 0) + 1);
            pA.totalLosses = Math.max(0, (pA.totalLosses || 1) - 1);
          }
        }
      }

      // Rollback Pemain & Deck Tim B
      const pB = (reportData.teamB.lineup || []).find((p: any) => p.ign.toLowerCase() === poppedGame.playerB.ign.toLowerCase());
      if (pB) {
        const dB = [pB.deck1, pB.deck2].find((d) => d && d.archetype?.toLowerCase() === poppedGame.playerB.archetype?.toLowerCase());
        if (winner === 'teamB') {
          if (dB) dB.wins = Math.max(0, (dB.wins || 1) - 1);
          pB.totalWins = Math.max(0, (pB.totalWins || 1) - 1);
        } else {
          if (lossCondition === 'REPEAT') {
            reportData.teamB.repeatsUsed = Math.max(0, (reportData.teamB.repeatsUsed || 1) - 1);
            if (dB) dB.isRepeatUsed = false;
          } else if (lossCondition === 'PENALTY_2') {
            pB.remainingLife = Math.min(2, (pB.remainingLife || 0) + 2);
            if (pB.deck1) pB.deck1.isDead = false;
            if (pB.deck2) pB.deck2.isDead = false;
          } else {
            if (dB) {
              dB.isDead = false;
              dB.losses = Math.max(0, (dB.losses || 1) - 1);
            }
            pB.remainingLife = Math.min(2, (pB.remainingLife || 0) + 1);
            pB.totalLosses = Math.max(0, (pB.totalLosses || 1) - 1);
          }
        }
      }

      reportData.finalScore = { teamA: reportData.teamA.score, teamB: reportData.teamB.score };
      reportData.isFinished = false;
      reportData.winnerTeam = null;

      await kv.hset('twi:match_reports', { [match.id]: reportData });
      syncCampTrackers(match.id, match.matchDate, reportData).catch(console.error);

      return sendFollowup(interaction, {
        content: `🔄 **Game ${targetGameNum} Berhasil Dihapus & Di-Rollback!**\nSkor kembali menjadi **${reportData.teamA.name} \`${reportData.teamA.score}\` — \`${reportData.teamB.score}\` ${reportData.teamB.name}**.`,
      });
    }

    return sendFollowup(interaction, { content: 'Subcommand tidak dikenali.' });
  } catch (error: any) {
    console.error('Error executeGameTask:', error);
    return sendFollowup(interaction, { content: `❌ Terjadi kesalahan: ${error.message || 'Internal Error'}` });
  }
}

// 🟢 Entry point command: Balas seketika dengan Type 5 (Deferred Response)
export async function handleGameCommand(interaction: any) {
  executeGameTask(interaction);
  return { type: 5 };
      }
          
