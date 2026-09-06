import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';
import { discordAPI, getEmbedFooterText, hexToDecimal } from '@/lib/discord/utils';
import {
  syncCampTrackers,
  getTeamEmojiByMatch,
  resolveStreamDisplay,
  hasPlayerPhysicalWin,
} from './types';
import { syncOfficialMatchReport } from './official-report';

export async function handleDecklossClaimSelect(body: any) {
  try {
    const customId: string = body.data?.custom_id || '';
    const matchId = customId.replace('deckloss_claim_', '');
    const selectedVal: string = body.data?.values?.[0] || '';
    const [innocentTeamKey, targetPlayerIgn, targetArchetype] = selectedVal.split('::');

    if (!innocentTeamKey || !targetPlayerIgn || !targetArchetype) {
      return NextResponse.json({
        type: 4,
        data: { content: '❌ Data pilihan penerima TW tidak valid.', flags: 64 },
      });
    }

    const reportData = await kv.hget<any>('twi:match_reports', matchId);
    if (!reportData) {
      return NextResponse.json({
        type: 4,
        data: { content: '❌ Match report tidak ditemukan di database.', flags: 64 },
      });
    }

    const schedules = (await kv.get<any[]>('twi:schedules')) || [];
    const match = schedules.find((m) => m.id === matchId) || {};

    const penaltyTeamKey = innocentTeamKey === 'teamA' ? 'teamB' : 'teamA';
    const penaltyTeam = reportData[penaltyTeamKey];
    const innocentTeam = reportData[innocentTeamKey];

    // 1. Validasi Pemain Penerima (Innocent Team)
    const targetPlayer = (innocentTeam.lineup || []).find(
      (p: any) => String(p.ign || '').toLowerCase() === targetPlayerIgn.toLowerCase()
    );
    const targetDeck = [targetPlayer?.deck1, targetPlayer?.deck2].find(
      (d: any) => d && String(d.archetype || '').toLowerCase() === targetArchetype.toLowerCase()
    );

    if (!targetPlayer || !targetDeck) {
      return NextResponse.json({
        type: 4,
        data: { content: '❌ Pemain atau deck penerima sanksi tidak ditemukan.', flags: 64 },
      });
    }

    // 2. Tentukan Pemain Pelanggar (Penalty Team) dari duel game terakhir
    const games: any[] = reportData.games || [];
    const lastGame = games.length > 0 ? games[games.length - 1] : null;
    const penaltyPlayerIgn = penaltyTeamKey === 'teamA' ? lastGame?.playerA?.ign : lastGame?.playerB?.ign;

    const penaltyPlayer = (penaltyTeam.lineup || []).find(
      (p: any) => String(p.ign || '').toLowerCase() === String(penaltyPlayerIgn || '').toLowerCase()
    );

    // Cari deck pelanggar yang sedang aktif atau yang baru saja dimainkan
    let penaltyDeck = [penaltyPlayer?.deck1, penaltyPlayer?.deck2].find(
      (d: any) => d && !d.isDead
    );
    if (!penaltyDeck && penaltyPlayer) {
      penaltyDeck = penaltyPlayer.deck2 || penaltyPlayer.deck1;
    }

    // 3. Eksekusi Poin & Status
    // Skor Tim & Statistik Deck Penerima (TW)
    innocentTeam.score = (innocentTeam.score || 0) + 1;
    targetPlayer.totalWins = (targetPlayer.totalWins || 0) + 1;
    targetDeck.wins = (targetDeck.wins || 0) + 1;
    // Nyawa targetPlayer tetap utuh 2 dan deck tidak mati!

    // Sanksi untuk Pelanggar (TL)
    if (penaltyPlayer) {
      penaltyPlayer.remainingLife = Math.max(0, (penaltyPlayer.remainingLife || 1) - 1);
      penaltyPlayer.totalLosses = (penaltyPlayer.totalLosses || 0) + 1;
    }
    if (penaltyDeck) {
      penaltyDeck.isDead = true;
      penaltyDeck.losses = (penaltyDeck.losses || 0) + 1;
    }

    // Reset counter warning tim pelanggar
    penaltyTeam.warningsUsed = 0;

    // 4. Catat Game Sanksi Resmi
    const sanctionGameNumber = games.length + 1;
    const sanctionGameRecord = {
      gameNumber: sanctionGameNumber,
      winner: innocentTeamKey,
      playerA:
        penaltyTeamKey === 'teamA'
          ? {
              ign: penaltyPlayer?.ign || 'Pemain',
              idDuelLinks: penaltyPlayer?.idDuelLinks,
              archetype: penaltyDeck?.archetype || 'Deckloss',
              isRepeat: Boolean(penaltyDeck?.isRepeatUsed),
            }
          : {
              ign: targetPlayer.ign,
              idDuelLinks: targetPlayer.idDuelLinks,
              archetype: targetDeck.archetype,
              isRepeat: Boolean(targetDeck.isRepeatUsed),
            },
      playerB:
        penaltyTeamKey === 'teamB'
          ? {
              ign: penaltyPlayer?.ign || 'Pemain',
              idDuelLinks: penaltyPlayer?.idDuelLinks,
              archetype: penaltyDeck?.archetype || 'Deckloss',
              isRepeat: Boolean(penaltyDeck?.isRepeatUsed),
            }
          : {
              ign: targetPlayer.ign,
              idDuelLinks: targetPlayer.idDuelLinks,
              archetype: targetDeck.archetype,
              isRepeat: Boolean(targetDeck.isRepeatUsed),
            },
      ssHandA: true,
      ssHandB: true,
      isDeckloss: true,
      decklossTeam: penaltyTeamKey,
      notes: `Sanksi 2x Warning SS Hand (${penaltyTeam.name})`,
      timestamp: new Date().toISOString(),
    };

    games.push(sanctionGameRecord);
    reportData.finalScore = { teamA: reportData.teamA.score, teamB: reportData.teamB.score };

    // 5. Cek Kondisi Selesai (Skor 10)
    const isTeamAWon = reportData.teamA.score >= 10;
    const isTeamBWon = reportData.teamB.score >= 10;
    const isMatchEnded = isTeamAWon || isTeamBWon;

    if (isMatchEnded) {
      reportData.isFinished = true;
      reportData.winnerTeam = isTeamAWon ? 'teamA' : 'teamB';
    }

    // 6. Format Logs Tampilan
    let hasRepeatInLogs = false;
    let hasDecklossInLogs = false;

    const matchLogsLines = games.map((g: any) => {
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
    } else if (hasDecklossInLogs) {
      glossaryText = `\n\n*Keterangan: TL/TW = Technical Loss/Win (Deckloss)*`;
    }

    // 7. Instruksi Pasca Deckloss
    const nextGameNumber = games.length + 1;
    let sectionHeader = `📢 **Instruksi Game #${nextGameNumber}:**`;
    let instructionLines: string[] = [];

    if (isMatchEnded) {
      sectionHeader = `📢 **Status Pertandingan:**`;
      const finalWinner = reportData.teamA.score >= 10 ? reportData.teamA : reportData.teamB;
      const finalLoser = reportData.teamA.score >= 10 ? reportData.teamB : reportData.teamA;
      instructionLines.push(`• Selamat kepada **${finalWinner.name}** atas kemenangannya!`);
      instructionLines.push(`• Terima kasih kepada **${finalLoser.name}** atas partisipasinya!`);
    } else {
      // Pemain pelanggar
      const isPenaltyPlayerOut = (penaltyPlayer?.remainingLife ?? 0) <= 0;
      if (isPenaltyPlayerOut) {
        instructionLines.push(`• **${penaltyTeam.name}** (Next player)`);
      } else {
        const hasWonPhysically = penaltyPlayer ? hasPlayerPhysicalWin(games, penaltyPlayer.ign) : false;
        const canRepeat = (penaltyTeam.repeatsUsed || 0) < 2 && !hasWonPhysically;
        if (canRepeat) {
          instructionLines.push(`• **${penaltyPlayer?.ign}** (Next deck or repeat)`);
        } else {
          instructionLines.push(`• **${penaltyPlayer?.ign}** (Next deck)`);
        }
      }

      // Pemain penerima TW Stay Table
      instructionLines.push(`• **${targetPlayer.ign}** (Stay table)`);
    }

    reportData.currentInstructions = { header: sectionHeader, lines: instructionLines };

    const matchWeek = match.weekNumber ?? reportData.week ?? 5;

    // 8. Simpan ke KV & Sinkronisasi
    await kv.hset('twi:match_reports', { [matchId]: reportData });
    await syncCampTrackers(matchId, matchWeek, reportData, match, sanctionGameRecord).catch(console.error);

    if (isMatchEnded) {
      await syncOfficialMatchReport(match, reportData).catch(console.error);
    }

    // 9. Update Embed Match Room
    const emojiA = await getTeamEmojiByMatch(match, 'A', reportData.teamA?.slug || reportData.teamA?.name);
    const emojiB = await getTeamEmojiByMatch(match, 'B', reportData.teamB?.slug || reportData.teamB?.name);
    const groupOrDivision = match?.groupName || match?.stage || 'Regular Season';
    const refereeDisplay = match.refereeDiscordId ? `<@${match.refereeDiscordId}>` : match.refereeName || match.referee || 'Belum ditentukan';
    const { streamerDisplay, streamUrlDisplay } = resolveStreamDisplay(match, reportData);
    const scoreSectionTitle = isMatchEnded ? '🏆 **Skor Akhir:**' : '📊 **Skor Sementara:**';

    const matchEmbed = {
      title: `⚔️ LIVE MATCH REPORT — WEEK ${matchWeek}`,
      color: hexToDecimal('#f59e0b'),
      description:
        `**Informasi Pertandingan:**\n` +
        `• **Divisi:** ${groupOrDivision} — Week ${matchWeek}\n` +
        `• **Match:** ${String(reportData.teamA?.name || 'TIM A').toUpperCase()} vs ${String(reportData.teamB?.name || 'TIM B').toUpperCase()}\n` +
        `• **Referee:** ${refereeDisplay}\n` +
        `• **Streamer:** ${streamerDisplay}\n` +
        `• **Live Match:** ${streamUrlDisplay}\n` +
        `──────────────────────────────\n\n` +
        `📜 **Game Logs:**\n` +
        matchLogsLines.join('\n') +
        `${glossaryText}\n` +
        `──────────────────────────────\n\n` +
        `${sectionHeader}\n` +
        instructionLines.join('\n') +
        `\n\n` +
        `${scoreSectionTitle}\n` +
        `# ${emojiA || '🔴'} ${reportData.teamA.score} ── ${reportData.teamB.score} ${emojiB || '🔵'}`,
      footer: { text: getEmbedFooterText() },
    };

    const messages = (await kv.hgetall<Record<string, any>>('discord:match_messages')) || {};
    const msgData = messages[matchId] || {};
    const channelId = msgData.matchChannel?.channelId || body.channel_id;
    const oldReportMsgId = msgData.matchChannel?.lastReportMsgId;

    if (channelId) {
      if (oldReportMsgId) {
        await discordAPI(`/channels/${channelId}/messages/${oldReportMsgId}`, 'DELETE').catch(console.warn);
      }
      const postRes = await discordAPI(`/channels/${channelId}/messages`, 'POST', { embeds: [matchEmbed] });
      if (postRes?.id) {
        msgData.matchChannel = { ...(msgData.matchChannel || {}), channelId, lastReportMsgId: postRes.id };
        await kv.hset('discord:match_messages', { [matchId]: msgData });
      }
    }

    // 10. Update pesan interaksi wasit (Type 7: Update Interaction Message)
    return NextResponse.json({
      type: 7,
      data: {
        content: `⚖️ **Sanksi Deckloss Berhasil Diterapkan!**\n• Poin **TW** diberikan kepada **${targetPlayer.ign}** (${targetDeck.archetype}).\n• Skor pertandingan telah otomatis diperbarui.`,
        components: [], // Hapus Select Menu agar tidak bisa diklik dua kali
      },
    });
  } catch (err: any) {
    console.error('Error handling deckloss select:', err);
    return NextResponse.json({
      type: 4,
      data: { content: `❌ Terjadi kesalahan saat memproses sanksi: ${err.message}`, flags: 64 },
    });
  }
                          }
      
