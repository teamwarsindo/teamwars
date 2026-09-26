import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { getOptionMap } from './types';
import {
  buildMatchReportEmbed,
  publishMatchReport,
  saveAndSyncMatchState,
  hasPlayerPhysicalWin,
} from './renderer';

export async function handleDecklossClaimSelect(interaction: any) {
  const channelId = interaction.channel_id;

  const schedules = await kv.get<any[]>('twi:schedules');
  const match = (schedules || []).find(
    (s) => s.channelId === channelId || s.matchChannelId === channelId
  );

  if (!match) {
    return NextResponse.json({
      type: 4,
      data: { content: '❌ Pertandingan tidak ditemukan untuk channel ini.', flags: 64 },
    });
  }

  const reportData = await kv.hget<any>('twi:match_reports', match.id);
  if (!reportData) {
    return NextResponse.json({
      type: 4,
      data: { content: '❌ Laporan pertandingan tidak ditemukan.', flags: 64 },
    });
  }

  if (reportData.isFinished) {
    return NextResponse.json({
      type: 4,
      data: { content: '⚠️ Pertandingan ini sudah selesai.', flags: 64 },
    });
  }

  const selectedVal: string = interaction.data?.values?.[0] || '';
  const [innocentTeamKey, targetPlayerIgn, targetArchetype, reasonType] = selectedVal.split('::');

  if (!innocentTeamKey || !targetPlayerIgn || !targetArchetype) {
    return NextResponse.json({
      type: 4,
      data: { content: '❌ Data seleksi klaim tidak valid.', flags: 64 },
    });
  }

  const penaltyTeamKey = innocentTeamKey === 'teamA' ? 'teamB' : 'teamA';
  const innocentTeam = innocentTeamKey === 'teamA' ? reportData.teamA : reportData.teamB;
  const penaltyTeam = penaltyTeamKey === 'teamA' ? reportData.teamA : reportData.teamB;

  const games: any[] = reportData.games || [];
  const gameNumber = games.length + 1;

  innocentTeam.score = (innocentTeam.score || 0) + 1;

  if (reasonType === 'warning') {
    penaltyTeam.warningsUsed = 0;
  }

  const lastGame = games[games.length - 1];
  const penaltyPlayerObj = (penaltyTeam.lineup || []).find((p: any) => {
    if (!lastGame) return false;
    const ignToCheck = penaltyTeamKey === 'teamA' ? lastGame.playerA?.ign : lastGame.playerB?.ign;
    return String(p.ign || '').toLowerCase() === String(ignToCheck || '').toLowerCase();
  });

  if (penaltyPlayerObj) {
    penaltyPlayerObj.remainingLife = Math.max(0, (penaltyPlayerObj.remainingLife ?? 2) - 1);
    penaltyPlayerObj.totalLosses = (penaltyPlayerObj.totalLosses || 0) + 1;

    const lastDeckName = penaltyTeamKey === 'teamA' ? lastGame?.playerA?.archetype : lastGame?.playerB?.archetype;
    const targetDeck = [penaltyPlayerObj.deck1, penaltyPlayerObj.deck2].find(
      (d) => d && String(d.archetype || '').toLowerCase() === String(lastDeckName || '').toLowerCase()
    );
    if (targetDeck) {
      targetDeck.isDead = true;
    }
  }

  const isMatchFinished = (reportData.teamA.score || 0) >= 10 || (reportData.teamB.score || 0) >= 10;
  reportData.isFinished = isMatchFinished;

  const notesLabel =
    reasonType === 'warning'
      ? `Sanksi 2x Warning SS Hand (${penaltyTeam.name})`
      : `Sanksi Deckloss (${penaltyTeam.name})`;

  const gameRecord = {
    gameNumber,
    playerA: {
      ign: innocentTeamKey === 'teamA' ? targetPlayerIgn : (penaltyPlayerObj?.ign || penaltyTeam.name),
      archetype: innocentTeamKey === 'teamA' ? targetArchetype : 'Deckloss',
      isRepeat: false,
    },
    playerB: {
      ign: innocentTeamKey === 'teamB' ? targetPlayerIgn : (penaltyPlayerObj?.ign || penaltyTeam.name),
      archetype: innocentTeamKey === 'teamB' ? targetArchetype : 'Deckloss',
      isRepeat: false,
    },
    winner: innocentTeamKey,
    isDeckloss: true,
    decklossTeam: penaltyTeamKey,
    notes: notesLabel,
  };

  games.push(gameRecord);
  reportData.games = games;

  if (!reportData.isFinished) {
    const nextGameNumber = gameNumber + 1;
    const instructionLines: string[] = [];

    instructionLines.push(`• **${penaltyTeam.name}** (${notesLabel})`);

    if ((penaltyPlayerObj?.remainingLife || 0) <= 0) {
      instructionLines.push(`  └ **${penaltyTeam.name}** (Next player)`);
    } else {
      const hasWonPhysically = hasPlayerPhysicalWin(games, penaltyPlayerObj?.ign);
      const canRepeat = (penaltyTeam.repeatsUsed || 0) < 2 && !hasWonPhysically;
      instructionLines.push(`  └ **${penaltyPlayerObj?.ign}** (${canRepeat ? 'Next deck or repeat' : 'Next deck'})`);
    }

    instructionLines.push(`• **${targetPlayerIgn}** (Stay table)`);

    reportData.currentInstructions = {
      header: `📢 **Instruksi Game #${nextGameNumber}:**`,
      lines: instructionLines,
    };
  }

  await saveAndSyncMatchState(match, reportData);
  const embed = await buildMatchReportEmbed(match, reportData, innocentTeamKey === 'teamA' ? 'A' : 'B');
  await publishMatchReport(channelId, match.id, embed);

  return NextResponse.json({
    type: 4,
    data: {
      content: `✅ Sanksi Deckloss berhasil diaplikasikan kepada **${penaltyTeam.name}**. Kemenangan teknis diberikan kepada **${targetPlayerIgn}** (${targetArchetype}).`,
    },
  });
}
