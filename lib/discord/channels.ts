import { DISCORD_CONFIG } from './config';
import { discordAPI } from './utils';

// 🟢 CREATION: Text Channel Tim
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

// 🟢 CREATION: Voice Channel Tim
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

// 🟢 HELPER: Singkatan nama tim (misal: "Final Chapter" -> "fc")
function getTeamAbbreviation(teamName: string): string {
  const words = teamName.trim().split(/\s+/);
  if (words.length > 1) {
    return words.map((w) => w[0]).join('').toLowerCase();
  }
  return teamName.substring(0, 4).toLowerCase();
}

// 🟢 HELPER: Berikan Role Tim A & Tim B ke User Wasit
export async function assignTeamRolesToReferee(guildId: string, refereeUserId?: string, roleAId?: string, roleBId?: string) {
  if (!refereeUserId || !guildId) return;

  if (roleAId) {
    await discordAPI(`/guilds/${guildId}/members/${refereeUserId}/roles/${roleAId}`, 'PUT').catch(() => null);
  }
  if (roleBId) {
    await discordAPI(`/guilds/${guildId}/members/${refereeUserId}/roles/${roleBId}`, 'PUT').catch(() => null);
  }
}

// 🟢 GENERATE / SYNC MATCH DISCORD CHANNEL & EMBED (PRODUCTION MODE)
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
  isSync?: boolean; // True = Tanpa Mention Role
}) {
  const guildId = DISCORD_CONFIG.GUILD_ID;
  const parentCategoryId = DISCORD_CONFIG.CT_MATCH_ID;

  if (!guildId) return null;

  // Nama channel standar produksi: ⚔️-m1-fc-ds
  const cleanMatchNum = params.matchId.replace('match-', '');
  const targetChannelName = `⚔️-m${cleanMatchNum}-${getTeamAbbreviation(params.teamAName)}-${getTeamAbbreviation(params.teamBName)}`;

  // 1. CEK DULU APAKAH CHANNEL SUDAH ADA DI DISCORD (PENCEGAHAN DUPLIKAT!)
  const allGuildChannels = await discordAPI(`/guilds/${guildId}/channels`, 'GET');
  let channelId: string | null = null;

  if (Array.isArray(allGuildChannels)) {
    const existingChannel = allGuildChannels.find(
      (ch: any) => ch.parent_id === parentCategoryId && ch.name === targetChannelName
    );

    if (existingChannel) {
      channelId = existingChannel.id; // Gunakan channel lama yang sudah ada
    }
  }

  // 2. PERMISSION OVERWRITES: DENY @everyone & DENY ROLE TIM TERKAIT (KUNCI TOTAL)
  const permission_overwrites: any[] = [
    { id: guildId, type: 0, deny: "1024" }, // Deny View Channel @everyone
    { id: DISCORD_CONFIG.BOT_ROLE_ID, type: 0, allow: "142352" }, // Bot Full Access
  ];

  // Kunci akses untuk Role Tim A dan Role Tim B (Deny View)
  if (params.roleAId) {
    permission_overwrites.push({ id: params.roleAId, type: 0, deny: "1024" });
  }
  if (params.roleBId) {
    permission_overwrites.push({ id: params.roleBId, type: 0, deny: "1024" });
  }

  // Izinkan Wasit & Streamer jika Discord ID terisi
  if (params.refereeDiscordId) {
    permission_overwrites.push({ id: params.refereeDiscordId, type: 1, allow: "3072" });
  }
  if (params.streamerDiscordId) {
    permission_overwrites.push({ id: params.streamerDiscordId, type: 1, allow: "3072" });
  }

  // 3. JIKA CHANNEL BELUM ADA, BUAT BARU. JIKA SUDAH ADA, UPDATE PERMISSION
  if (!channelId) {
    const createdData = await discordAPI(`/guilds/${guildId}/channels`, 'POST', {
      name: targetChannelName,
      type: 0,
      parent_id: parentCategoryId,
      permission_overwrites,
    });

    channelId = createdData?.id || null;
  } else {
    // Update permission channel lama agar tetap terkunci
    await discordAPI(`/channels/${channelId}`, 'PATCH', { permission_overwrites }).catch(() => null);
  }

  if (!channelId) return null;

  // Assign Role Tim ke Wasit jika diisi
  if (params.refereeDiscordId) {
    await assignTeamRolesToReferee(guildId, params.refereeDiscordId, params.roleAId, params.roleBId);
  }

  // 4. BERSIHKAN PESAN BOT LAMA DI CHANNEL
  const existingMessages = await discordAPI(`/channels/${channelId}/messages?limit=10`, 'GET');
  if (Array.isArray(existingMessages)) {
    for (const msg of existingMessages) {
      if (msg.author?.id === DISCORD_CONFIG.BOT_ROLE_ID || msg.embeds?.length > 0) {
        await discordAPI(`/channels/${channelId}/messages/${msg.id}`, 'DELETE').catch(() => null);
      }
    }
  }

  // 5. PENENTUAN NOTIFIKASI MENTION/PING (Hanya saat Generate, tidak saat Sync)
  let contentText: string | undefined = undefined;
  if (!params.isSync) {
    const roleMentions = [
      params.roleAId ? `<@&${params.roleAId}>` : params.teamAName,
      params.roleBId ? `<@&${params.roleBId}>` : params.teamBName,
    ].join(' ');
    contentText = `${roleMentions} ⚔️ Match kalian telah disiapkan!`;
  }

  // 6. FORMAT EMBED & ACTION BUTTONS
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

  const embedPayload: any = {
    embeds: [
      {
        title: `🏆 Group Stage - ${params.weekName || 'Week 1'}`,
        color: 0x00d2ff,
        description: `**${params.teamAName}** VS **${params.teamBName}**\n\nSelamat bertanding di channel khusus pertandingan kalian.`,
        fields: [
          { name: '📅 Jadwal Pertandingan', value: formattedWIB, inline: false },
          { name: '⚖️ Wasit Bertugas', value: params.refereeDiscordId ? `<@${params.refereeDiscordId}> (${params.refereeName || 'Wasit'})` : (params.refereeName || '-'), inline: true },
          { name: '🎥 Streamer', value: params.streamerDiscordId ? `<@${params.streamerDiscordId}> (${params.streamerName || 'Streamer'})` : (params.streamerName || '-'), inline: true },
          { name: '📺 Live Stream', value: params.streamLink ? `[Nonton Streaming](${params.streamLink})` : '-', inline: false },
          { name: '📢 Informasi Reschedule', value: 'Diskusikan jadwal baru bersama tim lawan. Klik tombol **Ajukan Reschedule** di bawah untuk konfirmasi persetujuan.', inline: false },
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
            style: 1, // Primary (Blue)
            label: 'Edit Match Report',
            custom_id: `btn_edit_match_${params.matchId}`,
            emoji: { name: '📝' },
          },
          {
            type: 2,
            style: 2, // Secondary (Gray)
            label: 'Ajukan Reschedule',
            custom_id: `btn_request_reschedule_${params.matchId}`,
            emoji: { name: '📅' },
          },
        ],
      },
    ],
  };

  if (contentText) {
    embedPayload.content = contentText;
  }

  // Kirim Embed Ke Channel
  await discordAPI(`/channels/${channelId}/messages`, 'POST', embedPayload);

  return channelId;
}

// 🟢 DELETE MATCH DISCORD CHANNEL (Fungsi Hapus Channel dari Discord)
export async function deleteMatchDiscordChannel(matchId: string, teamAName: string, teamBName: string) {
  const guildId = DISCORD_CONFIG.GUILD_ID;
  const parentCategoryId = DISCORD_CONFIG.CT_MATCH_ID;

  if (!guildId) return false;

  const cleanMatchNum = matchId.replace('match-', '');
  const targetChannelName = `⚔️-m${cleanMatchNum}-${getTeamAbbreviation(teamAName)}-${getTeamAbbreviation(teamBName)}`;

  const allGuildChannels = await discordAPI(`/guilds/${guildId}/channels`, 'GET');
  if (Array.isArray(allGuildChannels)) {
    const existingChannel = allGuildChannels.find(
      (ch: any) => ch.parent_id === parentCategoryId && ch.name === targetChannelName
    );

    if (existingChannel) {
      await discordAPI(`/channels/${existingChannel.id}`, 'DELETE');
      return true;
    }
  }

  return false;
}