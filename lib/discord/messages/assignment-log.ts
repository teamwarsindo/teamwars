import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI } from '@/lib/discord/utils';
import { MatchScheduleItem } from '@/lib/types/tournament';

function formatMatchTime(isoString?: string): string {
  if (!isoString) return 'TBA';
  const date = new Date(isoString);
  return date.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }) + ' WIB';
}

// 🟢 1. KIRIM EMBED LOG ASSIGN BARU
export async function sendAssignmentLog(params: {
  match: MatchScheduleItem;
  staffDiscordId: string;
  roleType: 'REFEREE' | 'STREAMER';
}): Promise<string | null> {
  const { match, staffDiscordId, roleType } = params;
  const chAssign = DISCORD_CONFIG.CH_ASSIGN;
  if (!chAssign) return null;

  const isRef = roleType === 'REFEREE';
  const titleText = isRef ? '⚖️ Referee Assignment' : '🎥 Streamer Assignment';
  const roleLabel = isRef ? 'Referee' : 'Streamer';

  const embed = {
    title: titleText,
    description: `${match.groupName || 'Tournament'} • ${match.weekName || 'Week 1'}`,
    color: isRef ? 0x3b82f6 : 0x9333ea,
    fields: [
      {
        name: '⚔️ Matchup',
        value: `**${match.teamAName}** vs **${match.teamBName}**`,
        inline: false,
      },
      {
        name: '📅 Waktu Pertandingan',
        value: formatMatchTime(match.matchDate),
        inline: false,
      },
      {
        name: '📌 Match Channel',
        value: (match as any).discordChannelId ? `<#${(match as any).discordChannelId}>` : '_Pending_',
        inline: false,
      },
    ],
    footer: { text: 'Team Wars Indonesia Season 7' },
  };

  const content = `${isRef ? '⚖️' : '🎥'} <@${staffDiscordId}> ditugaskan sebagai **${roleLabel}**!`;

  const res = await discordAPI(`/channels/${chAssign}/messages`, 'POST', {
    content,
    embeds: [embed],
  }).catch(() => null);

  return res?.id || null;
}

// 🛑 2. REPLY LOG BERHALANGAN (REASSIGN)
export async function sendReassignReplyNote(params: {
  targetLogMsgId: string;
  oldStaffDiscordId: string;
  roleType: 'REFEREE' | 'STREAMER';
}) {
  const { targetLogMsgId, oldStaffDiscordId, roleType } = params;
  const chAssign = DISCORD_CONFIG.CH_ASSIGN;
  if (!chAssign || !targetLogMsgId) return;

  const roleLabel = roleType === 'REFEREE' ? 'Referee' : 'Streamer';
  const icon = roleType === 'REFEREE' ? '⚖️' : '🎥';

  await discordAPI(`/channels/${chAssign}/messages`, 'POST', {
    content: `🛑 ${icon} <@${oldStaffDiscordId}> berhalangan bertugas sebagai **${roleLabel}**!`,
    message_reference: { message_id: targetLogMsgId },
  }).catch(() => null);
}

// ✅ 3. REPLY LOG TERIMA KASIH & UPDATE EMBED STATUS/SKOR (COMPLETE)
export async function completeAssignmentLog(params: {
  match: MatchScheduleItem;
  targetLogMsgId: string;
  staffDiscordId: string;
  roleType: 'REFEREE' | 'STREAMER';
}) {
  const { match, targetLogMsgId, staffDiscordId, roleType } = params;
  const chAssign = DISCORD_CONFIG.CH_ASSIGN;
  if (!chAssign || !targetLogMsgId) return;

  const isRef = roleType === 'REFEREE';
  const roleLabel = isRef ? 'Referee' : 'Streamer';
  const icon = isRef ? '⚖️' : '🎥';

  await discordAPI(`/channels/${chAssign}/messages`, 'POST', {
    content: `✅ Terima kasih ${icon} <@${staffDiscordId}> sudah bertugas sebagai **${roleLabel}**!`,
    message_reference: { message_id: targetLogMsgId },
  }).catch(() => null);

  const existingMsg = await discordAPI(`/channels/${chAssign}/messages/${targetLogMsgId}`, 'GET').catch(() => null);
  if (existingMsg && existingMsg.embeds && existingMsg.embeds[0]) {
    const oldEmbed = existingMsg.embeds[0];
    const scoreA = match.teamAScore ?? 0;
    const scoreB = match.teamBScore ?? 0;

    const updatedFields = oldEmbed.fields.map((f: any) => {
      if (f.name.includes('Match Channel')) {
        return {
          name: '⏳ Status & Skor',
          value: `\`✅ Selesai\` • **${scoreA} - ${scoreB}**`,
          inline: false,
        };
      }
      return f;
    });

    await discordAPI(`/channels/${chAssign}/messages/${targetLogMsgId}`, 'PATCH', {
      embeds: [
        {
          ...oldEmbed,
          color: 0x10b981,
          fields: updatedFields,
        },
      ],
    }).catch(() => null);
  }
}