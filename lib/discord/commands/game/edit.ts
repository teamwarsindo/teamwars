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

  const lastIndex = reportData.games.length - 1;
  const lastGame = reportData.games[lastIndex];

  // Jangan ubah status jika opsi tidak disertakan wasit (gunakan nilai sebelumnya)
  const oldSsHandA = lastGame.ssHandA ?? true;
  const oldSsHandB = lastGame.ssHandB ?? true;
  const newSsHandA = optMap.ss_hand_a !== undefined ? Boolean(optMap.ss_hand_a) : oldSsHandA;
  const newSsHandB = optMap.ss_hand_b !== undefined ? Boolean(optMap.ss_hand_b) : oldSsHandB;

  if (optMap.ss_hand_a === undefined && optMap.ss_hand_b === undefined) {
    return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
      content: '⚠️ Harap tentukan parameter yang ingin diubah (`ss_hand_a` atau `ss_hand_b`).',
    });
  }

  // 1. Rekalkulasi Warning SS Hand
  if (oldSsHandA !== newSsHandA) {
    reportData.teamA.warningsUsed = Math.max(0, (reportData.teamA.warningsUsed || 0) + (newSsHandA ? -1 : 1));
  }
  if (oldSsHandB !== newSsHandB) {
    reportData.teamB.warningsUsed = Math.max(0, (reportData.teamB.warningsUsed || 0) + (newSsHandB ? -1 : 1));
  }

  lastGame.ssHandA = newSsHandA;
  lastGame.ssHandB = newSsHandB;
  reportData.games[lastIndex] = lastGame;

  // 2. Evaluasi Ulang Instruksi
  const winnerOpt = lastGame.winner === 'teamA' ? 'A' : 'B';
  const pA = (reportData.teamA?.lineup || []).find((p: any) => p.ign?.toLowerCase() === lastGame.playerA?.ign?.toLowerCase());
  const pB = (reportData.teamB?.lineup || []).find((p: any) => p.ign?.toLowerCase() === lastGame.playerB?.ign?.toLowerCase());

  const { isTeamAPenalty, isTeamBPenalty } = computeNextInstructions(reportData, winnerOpt, pA, pB);

  // 3. Simpan & Render Embed
  if (!isBeforeKickoff) {
    await saveAndSyncMatchState(match, reportData);
  }

  const matchEmbed = await buildMatchReportEmbed(match, reportData, winnerOpt);

  if (isBeforeKickoff && userIsAdmin) {
    return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', { embeds: [matchEmbed] });
  }

  await publishMatchReport(channelId, match.id, matchEmbed);

  // 4. Munculkan Select Menu jika koreksi memicu Sanksi 2x Warning
  if (!reportData.isFinished && (isTeamAPenalty || isTeamBPenalty)) {
    const penaltyTeam = isTeamAPenalty ? reportData.teamA : reportData.teamB;
    const innocentTeam = isTeamAPenalty ? reportData.teamB : reportData.teamA;
    const innocentTeamKey = isTeamAPenalty ? 'teamB' : 'teamA';
    const components = buildDecklossClaimMenu(match.id, innocentTeamKey, innocentTeam);

    if (components) {
      return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
        content:
          `✅ **Status SS Hand Game ${lastGame.gameNumber} berhasil diperbarui.**\n\n` +
          `⚠️ **PERINGATAN SANKSI DECKLOSS TERDETEKSI!**\n` +
          `• **${penaltyTeam.name}** telah mencapai **2x Warning SS Hand**.\n` +
          `• Silakan pilih pemain dan deck dari **${innocentTeam.name}** untuk klaim **Technical Win (TW)**:`,
        components,
      });
    }
  }

  return discordAPI(`/webhooks/${appId}/${token}/messages/@original`, 'PATCH', {
    content:
      `✅ **Status SS Hand Game ${lastGame.gameNumber} berhasil diperbarui.**\n` +
      `• SS Hand Tim A: **${newSsHandA ? 'Terkirim' : 'Tidak Terkirim'}**\n` +
      `• SS Hand Tim B: **${newSsHandB ? 'Terkirim' : 'Tidak Terkirim'}**`,
  });
}
  
