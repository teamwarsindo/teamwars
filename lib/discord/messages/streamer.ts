import { DISCORD_CONFIG } from '../config';
import { discordAPI } from '../utils';

export async function sendOrUpdateStreamerSummaryEmbed(params: {
  weekName: string;
  matches: Array<{
    matchId: string;
    groupName?: string;
    teamAName: string;
    teamBName: string;
    matchChannelId?: string;
    matchDateIso?: string;
    refereeName?: string;
    refereeDiscordId?: string;
    streamerName?: string;
    streamerDiscordId?: string;
    streamLink?: string;
  }>;
}): Promise<boolean> {
  const targetChannelId = DISCORD_CONFIG.CH_STREAMER;
  if (!targetChannelId || params.matches.length === 0) return false;

  // 1. Kelompokkan Match Berdasarkan Group Name (Group A, Group B, dst.)
  const groupedMatches = params.matches.reduce((acc, m) => {
    const groupKey = m.groupName || 'Group Stage';
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(m);
    return acc;
  }, {} as Record<string, typeof params.matches>);

  // 2. Loop & Kirim 1 Pesan Embed Per Group Stage
  for (const [groupName, matchesList] of Object.entries(groupedMatches)) {
    const fields = matchesList.map((m) => {
      const cleanMatchNum = m.matchId.replace('match-', '');
      const formattedWIB = m.matchDateIso
        ? new Date(m.matchDateIso).toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Jakarta',
          }) + ' WIB'
        : 'Belum tersedia';

      const refereeDisplay = m.refereeDiscordId
        ? `<@${m.refereeDiscordId}>`
        : m.refereeName && m.refereeName.trim() !== ''
        ? m.refereeName
        : 'Belum tersedia';

      const streamerDisplay = m.streamerDiscordId
        ? `<@${m.streamerDiscordId}>`
        : m.streamerName && m.streamerName.trim() !== ''
        ? m.streamerName
        : 'Belum tersedia';

      const streamLinkDisplay = m.streamLink && m.streamLink.trim() !== ''
        ? `[Nonton Live Streaming](${m.streamLink})`
        : 'Belum tersedia';

      const matchChannelDisplay = m.matchChannelId ? `<#${m.matchChannelId}>` : 'Belum tersedia';

      return {
        name: `⚔️ M${cleanMatchNum}: ${m.teamAName} VS ${m.teamBName}`,
        value: 
          `📅 **Jadwal Pertandingan:** ${formattedWIB}\n` +
          `📍 **Channel Match:** ${matchChannelDisplay}\n` +
          `⚖️ **Referee:** ${refereeDisplay}\n` +
          `🎥 **Streamer:** ${streamerDisplay}\n` +
          `📺 **Live Stream:** ${streamLinkDisplay}`,
        inline: false,
      };
    });

    const embedObject = {
      title: `📢 PILAH JADWAL MATCH - ${groupName.toUpperCase()} (${params.weekName})`,
      color: 0xf1c40f,
      description: `Halo Referee & Streamer! Silakan cek jadwal **${groupName}** di bawah dan pilih match yang ingin kamu tangani.`,
      fields: fields.slice(0, 25),
      footer: { text: 'Team Wars Indonesia Season 7' },
    };

    const pingContent = `<@&${DISCORD_CONFIG.ROLE_REFEREE}> <@&${DISCORD_CONFIG.ROLE_CREATIVE}>`;

    // Kirim pesan per group stage
    await discordAPI(`/channels/${targetChannelId}/messages`, 'POST', {
      content: pingContent,
      embeds: [embedObject],
    });

    // Jeda antar group 300ms
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return true;
}