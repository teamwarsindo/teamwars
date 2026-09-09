import { discordAPI } from '@/lib/discord/utils';
import { GameContext } from './types';
import {
  computeNextInstructions,
  buildMatchReportEmbed,
  publishMatchReport,
  saveAndSyncMatchState,
  buildDecklossClaimMenu,
} from './renderer';

export async function handleGameEdit(ctx: GameContext) {
  const { channelId, appId, token, match, reportData, optMap, isBeforeKickoff, userIsAdmin } = ctx;

  if (!reportData.games || reportData.games.length === 0) {
    return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
      content: '❌ Belum ada rekaman game yang dapat diedit.',
    });
  }

  const latestIndex = reportData.games.length - 1;
  const targetGameNumber = optMap.game !== undefined ? Number(optMap.game) : reportData.games.length;
  const targetIndex = reportData.games.findIndex((g: any) => g.gameNumber === targetGameNumber);

  if (targetIndex === -1) {
    return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
      content: `❌ Game ${targetGameNumber} tidak ditemukan. Total game saat ini: ${reportData.games.length}.`,
    });
  }

  if (optMap.ss_hand_a === undefined && optMap.ss_hand_b === undefined) {
    return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
      content: '⚠️ Harap tentukan parameter yang ingin diubah (`ss_hand_a` atau `ss_hand_b`).',
    });
  }

  const isMiddleGame = targetIndex < latestIndex;
  const targetGame = reportData.games[targetIndex];

  const simSsHandA = optMap.ss_hand_a !== undefined ? Boolean(optMap.ss_hand_a) : (targetGame.ssHandA ?? true);
  const simSsHandB = optMap.ss_hand_b !== undefined ? Boolean(optMap.ss_hand_b) : (targetGame.ssHandB ?? true);

  // Simulasi hitung total warning jika perubahan diterapkan
  let simWarningsA = 0;
  let simWarningsB = 0;

  reportData.games.forEach((g: any, idx: number) => {
    const valA = idx === targetIndex ? simSsHandA : (g.ssHandA ?? true);
    const valB = idx === targetIndex ? simSsHandB : (g.ssHandB ?? true);
    if (!valA) simWarningsA++;
    if (!valB) simWarningsB++;
  });

  // Tolak langsung jika mengedit game lampau dan memicu warning >= 2
  if (isMiddleGame && (simWarningsA >= 2 || simWarningsB >= 2)) {
    const violatedTeam = simWarningsA >= 2 ? reportData.teamA.name : reportData.teamB.name;
    return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
      content:
        `❌ **Permintaan Ditolak!**\n` +
        `Pengeditan SS Hand pada Game ${targetGameNumber} dibatalkan karena menyebabkan **${violatedTeam}** mencapai **2x Warning (Deckloss)** di tengah match yang sudah berjalan.\n` +
        `Silakan lakukan penyesuaian manual bersama head referee jika ada sanksi susulan.`,
    });
  }

  // Terapkan perubahan jika aman atau jika targetnya adalah game terakhir
  targetGame.ssHandA = simSsHandA;
  targetGame.ssHandB = simSsHandB;
  reportData.games[targetIndex] = targetGame;
  reportData.teamA.warningsUsed = simWarningsA;
  reportData.teamB.warningsUsed = simWarningsB;

  // Evaluasi instruksi berdasarkan game terakhir
  const latestGame = reportData.games[latestIndex];
  const winnerOpt = latestGame.winner === 'teamA' ? 'A' : 'B';
  const pA = (reportData.teamA?.lineup || []).find((p: any) => p.ign?.toLowerCase() === latestGame.playerA?.ign?.toLowerCase());
  const pB = (reportData.teamB?.lineup || []).find((p: any) => p.ign?.toLowerCase() === latestGame.playerB?.ign?.toLowerCase());

  const { isTeamAPenalty, isTeamBPenalty } = computeNextInstructions(reportData, winnerOpt, pA, pB);

  // Simpan state & sync match
  if (!isBeforeKickoff) {
    await saveAndSyncMatchState(match, reportData);
  }

  const matchEmbed = await buildMatchReportEmbed(match, reportData, winnerOpt);

  if (isBeforeKickoff && userIsAdmin) {
    return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', { embeds: [matchEmbed] });
  }

  await publishMatchReport(channelId, match.id, matchEmbed);

  // Sanksi 2x Warning hanya diproses jika terjadi pada game terakhir
  if (!reportData.isFinished && (isTeamAPenalty || isTeamBPenalty)) {
    const penaltyTeam = isTeamAPenalty ? reportData.teamA : reportData.teamB;
    const innocentTeam = isTeamAPenalty ? reportData.teamB : reportData.teamA;
    const innocentTeamKey = isTeamAPenalty ? 'teamB' : 'teamA';
    const components = buildDecklossClaimMenu(match.id, innocentTeamKey, innocentTeam);

    if (components) {
      return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
        content:
          `✅ **Status SS Hand Game ${targetGame.gameNumber} berhasil diperbarui.**\n\n` +
          `⚠️ **PERINGATAN SANKSI DECKLOSS TERDETEKSI!**\n` +
          `• **${penaltyTeam.name}** telah mencapai **2x Warning SS Hand**.\n` +
          `• Silakan pilih pemain dan deck dari **${innocentTeam.name}** untuk klaim **Technical Win (TW)**:`,
        components,
      });
    }
  }

  return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
    content:
      `✅ **Status SS Hand Game ${targetGame.gameNumber} berhasil diperbarui.**\n` +
      `• SS Hand Tim A: **${targetGame.ssHandA ? 'Terkirim' : 'Tidak Terkirim'}**\n` +
      `• SS Hand Tim B: **${targetGame.ssHandB ? 'Terkirim' : 'Tidak Terkirim'}**\n` +
      `• Akumulasi Warning: ${reportData.teamA.name} (${simWarningsA}/2) | ${reportData.teamB.name} (${simWarningsB}/2)`,
  });
}
