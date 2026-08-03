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

// 🟢 HELPER: Singkatan nama tim (misal: "UX Dino Rampage" -> "uxdr")
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

// 🟢 GENERATE / SYNC MATCH CHANNEL & EMBED (SUPPORT TESTING MODE)
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
  isSync?: boolean;    // True jika klik Sync Match per-item (tanpa ping role)
  isTesting?: boolean; // True jika mode testing active
}) {
  const guildId = DISCORD_CONFIG.GUILD_ID;
  const parentCategoryId = DISCORD_CONFIG.CT_MATCH_ID;

  if (!guildId) return null;

  const isTesting = !!params.isTesting;

  // 1. Penentuan Nama Channel
  const channelName = isTesting
    ? `⚔️-match-test`
    : `⚔️-${params.matchId.replace("match-", "m")}-${getTeamAbbreviation(params.teamAName)}-${getTeamAbbreviation(params.teamBName)}`;

  // 2. Data Fallback / Dummy jika Mode Testing
  const teamA = isTesting ? 'Testing Team Alpha' : params.teamAName;
  const teamB = isTesting ? 'Testing Team Beta' : params.teamBName;
  const currentWeek = isTesting ? 'Week Test' : (params.weekName || 'Week 1');

  // 3. System Permission Overwrites
  const permission_overwrites: any[] = [
    { id: guildId, type: 0, deny: "1024" }, // Lock dari @everyone
    { id: DISCORD_CONFIG.BOT_ROLE_ID, type: 0, allow: "142352" }, // Bot Full Access
  ];

  if (!isTesting) {
    if (params.refereeDiscordId) permission_overwrites.push({ id: params.refereeDiscordId, type: 1, allow: "3072" });
    if (params.streamerDiscordId) permission_overwrites.push({ id: params.streamerDiscordId, type: 1, allow: "3072" });
    if (params.roleAId) permission_overwrites.push({ id: params.roleAId, type: 0, allow: "3072" });
    if (params.roleBId) permission_overwrites.push({ id: params.roleBId, type: 0, allow: "3072" });
  } else {
    // Di mode testing, berikan akses channel ke Role Admin
    if (DISCORD_CONFIG.ROLE_ADMIN) {
      permission_overwrites.push({ id: DISCORD_CONFIG.ROLE_ADMIN, type: 0, allow: "3072" });
    }
  }

  // 4. Request Discord API: Create / Get Channel
  const data = await discordAPI(`/guilds/${guildId}/channels`, 'POST', {
    name: channelName,
    type: 0,
    parent_id: parentCategoryId,
    permission_overwrites,
  });

  const channelId = data?.id;
  if (!channelId) return null;

  // 5. Assign Role Tim ke Wasit (Hanya saat produksi)
  if (!isTesting && params.refereeDiscordId) {
    await assignTeamRolesToReferee(guildId, params.refereeDiscordId, params.roleAId, params.roleBId);
  }

  // 6. Bersihkan Pesan Bot Lama (saat Sync / Re-generate)
  const existingMessages = await discordAPI(`/channels/${channelId}/messages?limit=5`, 'GET');
  if (Array.isArray(existingMessages)) {
    for (const msg of existingMessages) {
      if (msg.author?.id === DISCORD_CONFIG.BOT_ROLE_ID || msg.embeds?.length > 0) {
        await discordAPI(`/channels/${channelId}/messages/${msg.id}`, 'DELETE').catch(() => null);
      }
    }
  }

  // 7. Format Waktu WIB
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
    : 'Kamis, 6 Agustus 2026 — 20.00 WIB (Testing)';

  // 8. Logika Ping Notifikasi di Luar Embed
  let contentText: string | undefined = undefined;
  if (isTesting) {
    contentText = DISCORD_CONFIG.ROLE_ADMIN
      ? `<@&${DISCORD_CONFIG.ROLE_ADMIN}> 🧪 **[TESTING MODE]** Pesan ujicoba match channel!`
      : `🧪 **[TESTING MODE]** Pesan ujicoba match channel!`;
  } else if (!params.isSync) {
    // Ping Role Tim A & B hanya dikirim saat BUKAN Sync
    const roleMentions = [
      params.roleAId ? `<@&${params.roleAId}>` : teamA,
      params.roleBId ? `<@&${params.roleBId}>` : teamB,
    ].join(' ');
    contentText = `${roleMentions} ⚔️ Match kalian telah disiapkan!`;
  }

  // 9. Payload Embed + Button Action Row
  const embedPayload: any = {
    embeds: [
      {
        title: `🏆 Group Stage - ${currentWeek}`,
        color: isTesting ? 0xffaa00 : 0x00d2ff, // Oranye saat Testing, Biru saat Produksi
        description: `**${teamA}** VS **${teamB}**\n\nHallo! ${isTesting ? 'Ini adalah simulasi pengiriman pesan match di channel test.' : 'Selamat bertanding di channel khusus pertandingan kalian.'}`,
        fields: [
          { name: '📅 Jadwal Pertandingan', value: formattedWIB, inline: false },
          { name: '⚖️ Wasit Bertugas', value: params.refereeDiscordId ? `<@${params.refereeDiscordId}> (${params.refereeName || 'Wasit Test'})` : (params.refereeName || 'Wasit Test'), inline: true },
          { name: '🎥 Streamer', value: params.streamerDiscordId ? `<@${params.streamerDiscordId}> (${params.streamerName || 'Streamer Test'})` : (params.streamerName || 'Streamer Test'), inline: true },
          { name: '📺 Live Stream', value: params.streamLink ? `[Nonton Streaming](${params.streamLink})` : '[Link Streaming Test](https://youtube.com)', inline: false },
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

  // 10. Send Final Message to Discord Channel
  await discordAPI(`/channels/${channelId}/messages`, 'POST', embedPayload);

  return channelId;
     }
