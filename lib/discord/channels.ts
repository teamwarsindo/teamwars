import { DISCORD_CONFIG } from './config';
import { discordAPI } from './utils';

// 🟢 CREATION: Text Channel Tim Pendaftaran
export async function createDiscordChannel(teamName: string, roleId: string) {
  const guildId = DISCORD_CONFIG.GUILD_ID; 
  const parentCategoryId = DISCORD_CONFIG.CT_TEAM_ID; 

  if (!guildId || !roleId) return null;

  const data = await discordAPI(`/guilds/${guildId}/channels`, 'POST', {
    name: teamName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    type: 0, 
    parent_id: parentCategoryId,
    permission_overwrites: [
      { id: guildId, type: 0, deny: "1024" }, // Hide dari @everyone
      { id: roleId, type: 0, allow: "3072", deny: "139280" },
      { id: DISCORD_CONFIG.BOT_ROLE_ID, type: 0, allow: "142352" }
    ]
  });

  return data?.id || null;
}

// 🟢 CREATION: Voice Channel Tim Pendaftaran
export async function createDiscordVoiceChannel(teamName: string, roleId: string) {
  const guildId = DISCORD_CONFIG.GUILD_ID; 
  const parentCategoryId = DISCORD_CONFIG.CT_TEAM_ID; 

  if (!guildId || !roleId) return null;

  const data = await discordAPI(`/guilds/${guildId}/channels`, 'POST', {
    name: teamName, 
    type: 2, 
    parent_id: parentCategoryId,
    permission_overwrites: [
      { id: guildId, type: 0, deny: "1049600" },
      { id: roleId, type: 0, allow: "1049600" },
      { id: DISCORD_CONFIG.BOT_ROLE_ID, type: 0, allow: "1049616" }
    ]
  });

  return data?.id || null;
}

// 🟢 HELPER: Fallback singkatan jika kodeTim belum diset di Redis
function getFallbackAbbreviation(teamName: string): string {
  const words = teamName.trim().split(/\s+/);
  if (words.length > 1) {
    return words.map((w) => w[0]).join('').toLowerCase();
  }
  return teamName.substring(0, 4).toLowerCase();
}

// 🟢 GENERATE / SYNC MATCH DISCORD CHANNEL & EMBED
export async function createMatchDiscordChannel(params: {
  matchId: string;
  teamAName: string;
  teamBName: string;
  kodeTimA?: string;
  kodeTimB?: string;
  weekName?: string;
  roleAId?: string;
  roleBId?: string;
  refereeName?: string;
  refereeDiscordId?: string;
  streamerName?: string;
  streamerDiscordId?: string;
  streamLink?: string;
  matchDateIso?: string;
  isSync?: boolean;
}) {
  const guildId = DISCORD_CONFIG.GUILD_ID;
  const parentCategoryId = DISCORD_CONFIG.CT_MATCH_ID;

  if (!guildId) return null;

  const abbrA = params.kodeTimA || getFallbackAbbreviation(params.teamAName);
  const abbrB = params.kodeTimB || getFallbackAbbreviation(params.teamBName);

  const cleanMatchNum = params.matchId.replace('match-', '');
  const targetChannelName = `⚔️-m${cleanMatchNum}-${abbrA}-${abbrB}`;

  // 1. Cek Apakah Channel Sudah Ada
  const allGuildChannels = await discordAPI(`/guilds/${guildId}/channels`, 'GET');
  let channelId: string | null = null;

  if (Array.isArray(allGuildChannels)) {
    const existingChannel = allGuildChannels.find(
      (ch: any) => ch.parent_id === parentCategoryId && ch.name === targetChannelName
    );
    if (existingChannel) {
      channelId = existingChannel.id;
    }
  }

  // 2. Permission Overwrites (Deny @everyone & Role Tim Terkait)
  const permission_overwrites: any[] = [
    { id: guildId, type: 0, deny: "1024" },
    { id: DISCORD_CONFIG.BOT_ROLE_ID, type: 0, allow: "142352" },
  ];

  if (params.roleAId) {
    permission_overwrites.push({ id: params.roleAId, type: 0, deny: "1024" });
  }
  if (params.roleBId) {
    permission_overwrites.push({ id: params.roleBId, type: 0, deny: "1024" });
  }

  if (params.refereeDiscordId) permission_overwrites.push({ id: params.refereeDiscordId, type: 1, allow: "3072" });
  if (params.streamerDiscordId) permission_overwrites.push({ id: params.streamerDiscordId, type: 1, allow: "3072" });

  // 3. Create / Update Channel
  if (!channelId) {
    const createdData = await discordAPI(`/guilds/${guildId}/channels`, 'POST', {
      name: targetChannelName,
      type: 0,
      parent_id: parentCategoryId,
      permission_overwrites,
    });
    channelId = createdData?.id || null;
  } else {
    await discordAPI(`/channels/${channelId}`, 'PATCH', { permission_overwrites }).catch(() => null);
  }

  if (!channelId) return null;

  // 4. Bersihkan Pesan Bot Lama
  const existingMessages = await discordAPI(`/channels/${channelId}/messages?limit=10`, 'GET');
  if (Array.isArray(existingMessages)) {
    for (const msg of existingMessages) {
      if (msg.author?.id === DISCORD_CONFIG.BOT_ROLE_ID || msg.embeds?.length > 0) {
        await discordAPI(`/channels/${channelId}/messages/${msg.id}`, 'DELETE').catch(() => null);
      }
    }
  }

  // 5. Format Dynamic Teks
  const formattedWIB = params.matchDateIso
    ? new Date(params.matchDateIso).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      }) + ' WIB'
    : 'Jadwal Belum Ditentukan';

  const refereeDisplay = params.refereeDiscordId 
    ? `<@${params.refereeDiscordId}> (${params.refereeName || 'Wasit'})` 
    : (params.refereeName && params.refereeName.trim() !== '' ? params.refereeName : 'Belum Ditugaskan');

  const streamerDisplay = params.streamerDiscordId 
    ? `<@${params.streamerDiscordId}> (${params.streamerName || 'Streamer'})` 
    : (params.streamerName && params.streamerName.trim() !== '' ? params.streamerName : 'Belum Ditugaskan');

  // 6. Embed Payload
  const embedPayload: any = {
    embeds: [
      {
        title: `🏆 Group Stage - ${params.weekName || 'Week 1'}`,
        color: 0x00d2ff,
        description: `**${params.teamAName}** VS **${params.teamBName}**\n\nSelamat bertanding di channel khusus pertandingan kalian.`,
        fields: [
          { name: '📅 Jadwal Pertandingan', value: formattedWIB, inline: false },
          { name: '⚖️ Wasit Bertugas', value: refereeDisplay, inline: true },
          { name: '🎥 Streamer', value: streamerDisplay, inline: true },
          { name: '📺 Live Stream', value: params.streamLink ? `[Nonton Live Streaming](${params.streamLink})` : '-', inline: false },
          { name: '📢 Informasi Reschedule', value: 'Diskusikan jadwal baru bersama tim lawan. Klik tombol **Ajukan Reschedule** di bawah jika ingin mengajukan perubahan waktu.', inline: false },
        ],
        footer: { text: 'Team Wars Indonesia Season 7' },
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 1,
            label: 'Edit Match Report',
            custom_id: `btn_edit_match_${params.matchId}`,
            emoji: { name: '📝' },
          },
          {
            type: 2,
            style: 2,
            label: 'Ajukan Reschedule',
            custom_id: `btn_request_reschedule_${params.matchId}`,
            emoji: { name: '📅' },
          },
        ],
      },
    ],
  };

  await discordAPI(`/channels/${channelId}/messages`, 'POST', embedPayload);

  return channelId;
}

// 🟢 DELETE MATCH DISCORD CHANNEL
export async function deleteMatchDiscordChannel(matchId: string, teamAName: string, teamBName: string) {
  const guildId = DISCORD_CONFIG.GUILD_ID;
  const parentCategoryId = DISCORD_CONFIG.CT_MATCH_ID;

  if (!guildId) return false;

  const cleanMatchNum = matchId.replace('match-', '');
  const allGuildChannels = await discordAPI(`/guilds/${guildId}/channels`, 'GET');

  if (Array.isArray(allGuildChannels)) {
    const existingChannel = allGuildChannels.find(
      (ch: any) => ch.parent_id === parentCategoryId && ch.name.includes(`-m${cleanMatchNum}-`)
    );

    if (existingChannel) {
      await discordAPI(`/channels/${existingChannel.id}`, 'DELETE');
      return true;
    }
  }

  return false;
}