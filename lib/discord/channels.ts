import { DISCORD_CONFIG } from './config';
import { discordAPI } from './utils';

export async function createDiscordChannel(teamName: string, roleId: string) {
  const guildId = DISCORD_CONFIG.GUILD_ID; 
  const parentCategoryId = DISCORD_CONFIG.CT_TEAM_ID; 

  if (!guildId || !roleId) return null;

  const data = await discordAPI(`/guilds/${guildId}/channels`, 'POST', {
    name: teamName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    type: 0, 
    parent_id: parentCategoryId,
    permission_overwrites: [
      { id: guildId, type: 0, deny: "1024" },
      { id: roleId, type: 0, allow: "3072", deny: "139280" },
      { id: DISCORD_CONFIG.BOT_ROLE_ID, type: 0, allow: "142352" }
    ]
  });

  return data?.id || null;
}

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

// Helper untuk membuat singkatan nama tim (misal: "UX Dino Rampage" -> "uxdr")
function getTeamAbbreviation(teamName: string): string {
  const words = teamName.trim().split(/\s+/);
  if (words.length > 1) {
    return words.map((w) => w[0]).join('').toLowerCase();
  }
  return teamName.substring(0, 4).toLowerCase();
}

// Berikan Role Tim A & Tim B ke User Wasit
export async function assignTeamRolesToReferee(guildId: string, refereeUserId?: string, roleAId?: string, roleBId?: string) {
  if (!refereeUserId || !guildId) return;

  if (roleAId) {
    await discordAPI(`/guilds/${guildId}/members/${refereeUserId}/roles/${roleAId}`, 'PUT').catch(() => null);
  }
  if (roleBId) {
    await discordAPI(`/guilds/${guildId}/members/${refereeUserId}/roles/${roleBId}`, 'PUT').catch(() => null);
  }
}

// 🟢 GENERATE / SYNC MATCH CHANNEL & SEND EMBED
export async function createMatchDiscordChannel(params: {
  matchId: string;
  teamAName: string;
  teamBName: string;
  weekName?: string;
  roleAId?: string;
  roleBId?: string;
  refereeName?: string;
  refereeDiscordId?: string;
  streamerName?: string;
  streamerDiscordId?: string;
  streamLink?: string;
  matchDateIso?: string;
  isSync?: boolean; // 👈 Opsi penentu apakah ini tindakan Sync (tanpa ping)
}) {
  const guildId = DISCORD_CONFIG.GUILD_ID;
  const parentCategoryId = DISCORD_CONFIG.CT_MATCH_ID;

  if (!guildId) return null;

  // Format ID Match singkat (misal "match-12" -> "m12")
  const shortMatchId = params.matchId.replace("match-", "m");
  const abbrA = getTeamAbbreviation(params.teamAName);
  const abbrB = getTeamAbbreviation(params.teamBName);

  // Hasil nama channel singkat: ⚔️-m12-uxdr-fpfd
  const channelName = `⚔️-${shortMatchId}-${abbrA}-${abbrB}`;

  const permission_overwrites: any[] = [
    { id: guildId, type: 0, deny: "1024" }, // Lock dari @everyone
    { id: DISCORD_CONFIG.BOT_ROLE_ID, type: 0, allow: "142352" }, // Bot Full Access
  ];

  // Access User Wasit ID
  if (params.refereeDiscordId) {
    permission_overwrites.push({ id: params.refereeDiscordId, type: 1, allow: "3072" });
  }

  // Access User Streamer ID
  if (params.streamerDiscordId) {
    permission_overwrites.push({ id: params.streamerDiscordId, type: 1, allow: "3072" });
  }

  // Access Role Tim A & Tim B
  if (params.roleAId) {
    permission_overwrites.push({ id: params.roleAId, type: 0, allow: "3072" });
  }
  if (params.roleBId) {
    permission_overwrites.push({ id: params.roleBId, type: 0, allow: "3072" });
  }

  const data = await discordAPI(`/guilds/${guildId}/channels`, 'POST', {
    name: channelName,
    type: 0,
    parent_id: parentCategoryId,
    permission_overwrites,
  });

  const channelId = data?.id;
  if (!channelId) return null;

  // Berikan Role Tim A & Tim B ke User Wasit yang bertugas
  if (params.refereeDiscordId) {
    await assignTeamRolesToReferee(guildId, params.refereeDiscordId, params.roleAId, params.roleBId);
  }

  // 1. Bersihkan pesan sambutan lama jika ada (saat re-sync)
  const existingMessages = await discordAPI(`/channels/${channelId}/messages?limit=5`, 'GET');
  if (Array.isArray(existingMessages)) {
    for (const msg of existingMessages) {
      if (msg.author?.id === DISCORD_CONFIG.BOT_ROLE_ID || msg.embeds?.length > 0) {
        await discordAPI(`/channels/${channelId}/messages/${msg.id}`, 'DELETE').catch(() => null);
      }
    }
  }

  // Format Waktu WIB
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
    : 'Jadwal Menunggu Konfirmasi';

  // 2. Tentukan apakah perlu ping role di luar embed atau tidak
  const roleMentions = [
    params.roleAId ? `<@&${params.roleAId}>` : params.teamAName,
    params.roleBId ? `<@&${params.roleBId}>` : params.teamBName,
  ].join(' ');

  // Jika isSync = true, content dikosongkan (tanpa ping tag)
  const contentText = params.isSync ? undefined : `${roleMentions} ⚔️ Match kalian telah disiapkan!`;

  const currentWeek = params.weekName || 'Week 1';

  // Payload Kirim Pesan Sambutan Baru + Embed + Button
  const embedPayload: any = {
    embeds: [
      {
        title: `🏆 Group Stage - ${currentWeek}`,
        color: 0x00d2ff,
        description: `**${params.teamAName}** VS **${params.teamBName}**\n\nHallo kedua tim! Selamat bertanding di channel khusus pertandingan kalian.`,
        fields: [
          { name: '📅 Jadwal Pertandingan', value: formattedWIB, inline: false },
          { name: '⚖️ Wasit Bertugas', value: params.refereeDiscordId ? `<@${params.refereeDiscordId}> (${params.refereeName || '-'})` : (params.refereeName || '-'), inline: true },
          { name: '🎥 Streamer', value: params.streamerDiscordId ? `<@${params.streamerDiscordId}> (${params.streamerName || '-'})` : (params.streamerName || '-'), inline: true },
          { name: '📺 Live Stream', value: params.streamLink ? `[Nonton Streaming](${params.streamLink})` : 'Belum Ada Link', inline: false },
          { name: '📢 Informasi Reschedule', value: 'Jika ingin mengajukan perubahan jadwal (Reschedule), harap langsung menghubungi **Admin Tournament**.', inline: false },
        ],
        footer: { text: 'Team Wars Indonesia Season 7' },
      },
    ],
    components: [
      {
        type: 1, // Action Row
        components: [
          {
            type: 2, // Button
            style: 1, // Primary (Blue)
            label: 'Edit Match Report',
            custom_id: `btn_edit_match_${params.matchId}`,
            emoji: { name: '📝' },
          },
        ],
      },
    ],
  };

  if (contentText) {
    embedPayload.content = contentText;
  }

  await discordAPI(`/channels/${channelId}/messages`, 'POST', embedPayload);

  return channelId;
    }
