import { DISCORD_CONFIG } from './config';
import { discordAPI } from './utils';

// ... (fungsi createDiscordChannel, createDiscordVoiceChannel, & getTeamAbbreviation tetap sama)

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
  isSync?: boolean;
  isTesting?: boolean; // 👈 Mode Testing Parameter
}) {
  const guildId = DISCORD_CONFIG.GUILD_ID;
  const parentCategoryId = DISCORD_CONFIG.CT_MATCH_ID;

  if (!guildId) return null;

  // 🧪 PENGATURAN MODE TESTING
  const isTesting = !!params.isTesting;

  // 1. Format Nama Channel (Jika testing, gunakan ⚔️-match-test)
  const channelName = isTesting
    ? `⚔️-match-test`
    : `⚔️-${params.matchId.replace("match-", "m")}-${getTeamAbbreviation(params.teamAName)}-${getTeamAbbreviation(params.teamBName)}`;

  // Data Dummy jika mode Testing
  const teamA = isTesting ? 'Testing Team Alpha' : params.teamAName;
  const teamB = isTesting ? 'Testing Team Beta' : params.teamBName;
  const currentWeek = isTesting ? 'Week Test' : (params.weekName || 'Week 1');

  const permission_overwrites: any[] = [
    { id: guildId, type: 0, deny: "1024" }, // Lock @everyone
    { id: DISCORD_CONFIG.BOT_ROLE_ID, type: 0, allow: "142352" }, // Bot Access
  ];

  if (!isTesting) {
    if (params.refereeDiscordId) permission_overwrites.push({ id: params.refereeDiscordId, type: 1, allow: "3072" });
    if (params.streamerDiscordId) permission_overwrites.push({ id: params.streamerDiscordId, type: 1, allow: "3072" });
    if (params.roleAId) permission_overwrites.push({ id: params.roleAId, type: 0, allow: "3072" });
    if (params.roleBId) permission_overwrites.push({ id: params.roleBId, type: 0, allow: "3072" });
  } else {
    // Di mode testing, berikan akses penuh ke Role Admin
    if (DISCORD_CONFIG.ROLE_ADMIN) {
      permission_overwrites.push({ id: DISCORD_CONFIG.ROLE_ADMIN, type: 0, allow: "3072" });
    }
  }

  // Buat / Dapatkan Channel
  const data = await discordAPI(`/guilds/${guildId}/channels`, 'POST', {
    name: channelName,
    type: 0,
    parent_id: parentCategoryId,
    permission_overwrites,
  });

  const channelId = data?.id;
  if (!channelId) return null;

  // Assign Role ke Wasit jika bukan testing
  if (!isTesting && params.refereeDiscordId) {
    await assignTeamRolesToReferee(guildId, params.refereeDiscordId, params.roleAId, params.roleBId);
  }

  // Hapus pesan bot lama
  const existingMessages = await discordAPI(`/channels/${channelId}/messages?limit=5`, 'GET');
  if (Array.isArray(existingMessages)) {
    for (const msg of existingMessages) {
      if (msg.author?.id === DISCORD_CONFIG.BOT_ROLE_ID || msg.embeds?.length > 0) {
        await discordAPI(`/channels/${channelId}/messages/${msg.id}`, 'DELETE').catch(() => null);
      }
    }
  }

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

  // 🧪 PING SELECTION: Tag Admin jika testing, Tag Role Tim jika produksi (Non-Sync)
  let contentText: string | undefined = undefined;
  if (isTesting) {
    contentText = DISCORD_CONFIG.ROLE_ADMIN
      ? `<@&${DISCORD_CONFIG.ROLE_ADMIN}> 🧪 **[TESTING MODE]** Pesan ujicoba match channel!`
      : `🧪 **[TESTING MODE]** Pesan ujicoba match channel!`;
  } else if (!params.isSync) {
    const roleMentions = [
      params.roleAId ? `<@&${params.roleAId}>` : teamA,
      params.roleBId ? `<@&${params.roleBId}>` : teamB,
    ].join(' ');
    contentText = `${roleMentions} ⚔️ Match kalian telah disiapkan!`;
  }

  const embedPayload: any = {
    embeds: [
      {
        title: `🏆 Group Stage - ${currentWeek}`,
        color: isTesting ? 0xffaa00 : 0x00d2ff, // Warna Oranye saat Testing
        description: `**${teamA}** VS **${teamB}**\n\nHallo! ${isTesting ? 'Ini adalah simulasi pengiriman pesan match di channel test.' : 'Selamat bertanding di channel khusus pertandingan kalian.'}`,
        fields: [
          { name: '📅 Jadwal Pertandingan', value: formattedWIB, inline: false },
          { name: '⚖️ Wasit Bertugas', value: params.refereeDiscordId ? `<@${params.refereeDiscordId}> (${params.refereeName || 'Wasit Test'})` : (params.refereeName || 'Wasit Test'), inline: true },
          { name: '🎥 Streamer', value: params.streamerDiscordId ? `<@${params.streamerDiscordId}> (${params.streamerName || 'Streamer Test'})` : (params.streamerName || 'Streamer Test'), inline: true },
          { name: '📺 Live Stream', value: params.streamLink ? `[Nonton Streaming](${params.streamLink})` : '[Link Streaming Test](https://youtube.com)', inline: false },
          { name: '📢 Informasi Reschedule', value: 'Jika ingin mengajukan perubahan jadwal (Reschedule), harap langsung menghubungi **Admin Tournament**.', inline: false },
        ],
        footer: { text: 'Team Wars Indonesia Season 7 (Testing Mode)' },
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
