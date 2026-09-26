import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';
import { hasPlayerPhysicalWin } from './types';
import {
  buildMatchReportEmbed,
  publishMatchReport,
  saveAndSyncMatchState,
} from './renderer';

export async function handleDecklossClaimSelect(body: any) {
  try {
    const customId: string = body.data?.custom_id || '';
    const matchId = customId.replace('deckloss_claim_', '');
    const selectedVal: string = body.data?.values?.[0] || '';
    
    // Format custom value: innocentTeamKey::targetPlayerIgn::targetArchetype[::reason]
    const [innocentTeamKey, targetPlayerIgn, targetArchetype, reasonType] = selectedVal.split('::');

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

    // 1. Validasi Pemain Penerima TW (Innocent Team)
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

    // 2. Tentukan Pemain Pelanggar (Penalty Team) dari game terakhir
    const games: any[] = reportData.games || [];
    const lastGame = games.length > 0 ? games[games.length - 1] : null;
    const penaltyPlayerIgn = penaltyTeamKey === 'teamA' ? lastGame?.playerA?.ign : lastGame?.playerB?.ign;

    const penaltyPlayer = (penaltyTeam.lineup || []).find(
      (p: any) => String(p.ign || '').toLowerCase() === String(penaltyPlayerIgn || '').toLowerCase()
    );

    let penaltyDeck = [penaltyPlayer?.deck1, penaltyPlayer?.deck2].find((d: any) => d && !d.isDead);
    if (!penaltyDeck && penaltyPlayer) {
      penaltyDeck = penaltyPlayer.deck2 || penaltyPlayer.deck1;
    }

    // 📸 SIMPAN SNAPSHOT SEBELUM SANKSI DIAPLIKASIKAN
    const snapshotBeforeSanction = {
      teamA: JSON.parse(JSON.stringify(reportData.teamA)),
      teamB: JSON.parse(JSON.stringify(reportData.teamB)),
    };

    // 3. Eksekusi Poin & Status Hidup
    innocentTeam.score = (innocentTeam.score || 0) + 1;
    targetPlayer.totalWins = (targetPlayer.totalWins || 0) + 1;
    targetDeck.wins = (targetDeck.wins || 0) + 1;

    if (penaltyPlayer) {
      penaltyPlayer.remainingLife = Math.max(0, (penaltyPlayer.remainingLife || 1) - 1);
      penaltyPlayer.totalLosses = (penaltyPlayer.totalLosses || 0) + 1;
    }
    if (penaltyDeck) {
      penaltyDeck.isDead = true;
      penaltyDeck.losses = (penaltyDeck.losses || 0) + 1;
    }

    const isTimerPenalty = reasonType === 'timer';

    // Hanya reset counter jika sanksi berasal dari 2x warning SS Hand
    if (!isTimerPenalty) {
      penaltyTeam.warningsUsed = 0;
    }

    // 4. Catat Game Rekor Sanksi Resmi
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
              skill: penaltyDeck?.skill,
              isRepeat: Boolean(penaltyDeck?.isRepeatUsed),
            }
          : {
              ign: targetPlayer.ign,
              idDuelLinks: targetPlayer.idDuelLinks,
              archetype: targetDeck.archetype,
              skill: targetDeck.skill,
              isRepeat: Boolean(targetDeck.isRepeatUsed),
            },
      playerB:
        penaltyTeamKey === 'teamB'
          ? {
              ign: penaltyPlayer?.ign || 'Pemain',
              idDuelLinks: penaltyPlayer?.idDuelLinks,
              archetype: penaltyDeck?.archetype || 'Deckloss',
              skill: penaltyDeck?.skill,
              isRepeat: Boolean(penaltyDeck?.isRepeatUsed),
            }
          : {
              ign: targetPlayer.ign,
              idDuelLinks: targetPlayer.idDuelLinks,
              archetype: targetDeck.archetype,
              skill: targetDeck.skill,
              isRepeat: Boolean(targetDeck.isRepeatUsed),
            },
      ssHandA: true,
      ssHandB: true,
      isDeckloss: true,
      decklossTeam: penaltyTeamKey,
      notes: isTimerPenalty
        ? `Sanksi Deckloss Timer (${penaltyTeam.name})`
        : `Sanksi 2x Warning SS Hand (${penaltyTeam.name})`,
      timestamp: new Date().toISOString(),
      snapshot: snapshotBeforeSanction, // 👈 Terkunci aman untuk rollback del
    };

    games.push(sanctionGameRecord);
    reportData.finalScore = { teamA: reportData.teamA.score, teamB: reportData.teamB.score };

    const isTeamAWon = reportData.teamA.score >= 10;
    const isTeamBWon = reportData.teamB.score >= 10;
    const isMatchEnded = isTeamAWon || isTeamBWon;
    reportData.isFinished = isMatchEnded;
    reportData.winnerTeam = isMatchEnded ? (isTeamAWon ? 'teamA' : 'teamB') : null;

    // 5. Evaluasi Instruksi Pasca-Deckloss
    const nextGameNumber = games.length + 1;
    let sectionHeader = `📢 **Instruksi Game #${nextGameNumber}:**`;
    const instructionLines: string[] = [];

    if (isMatchEnded) {
      sectionHeader = `📢 **Status Pertandingan:**`;
      const finalWinner = reportData.teamA.score >= 10 ? reportData.teamA : reportData.teamB;
      const finalLoser = reportData.teamA.score >= 10 ? reportData.teamB : reportData.teamA;
      instructionLines.push(`• Selamat kepada **${finalWinner.name}** atas kemenangannya!`);
      instructionLines.push(`• Terima kasih kepada **${finalLoser.name}** atas partisipasinya!`);
    } else {
      const isPenaltyPlayerOut = (penaltyPlayer?.remainingLife ?? 0) <= 0;
      const timerSuffix = isTimerPenalty ? ' — Extra Timer 3 Menit' : '';

      if (isPenaltyPlayerOut) {
        instructionLines.push(`• **${penaltyTeam.name}** (Next player)${timerSuffix}`);
      } else {
        const hasWonPhysically = penaltyPlayer ? hasPlayerPhysicalWin(games, penaltyPlayer.ign) : false;
        const canRepeat = (penaltyTeam.repeatsUsed || 0) < 2 && !hasWonPhysically;
        const choiceDesc = canRepeat ? 'Next deck or repeat' : 'Next deck';
        instructionLines.push(`• **${penaltyPlayer?.ign}** (${choiceDesc})${timerSuffix}`);
      }
      instructionLines.push(`• **${targetPlayer.ign}** (Stay table)`);
    }

    reportData.currentInstructions = { header: sectionHeader, lines: instructionLines };

    // 6. Simpan KV & Update Live Embeds
    await saveAndSyncMatchState(match, reportData);

    const winnerOpt = innocentTeamKey === 'teamA' ? 'A' : 'B';
    const matchEmbed = await buildMatchReportEmbed(match, reportData, winnerOpt);

    const messages = (await kv.hgetall<Record<string, any>>('discord:match_messages')) || {};
    const channelId = messages[matchId]?.matchChannel?.channelId || body.channel_id;

    if (channelId) {
      await publishMatchReport(channelId, matchId, matchEmbed);
    }

    // 7. Respon Update Interaction (Type 7) untuk mencabut Select Menu
    return NextResponse.json({
      type: 7,
      data: {
        content: `⚖️ **Sanksi Deckloss Berhasil Diterapkan!**\n• Poin **TW** diberikan kepada **${targetPlayer.ign}** (${targetDeck.archetype}).\n• Skor pertandingan telah otomatis diperbarui.`,
        components: [],
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
