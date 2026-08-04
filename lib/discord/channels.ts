import { DISCORD_CONFIG } from './config';
import { discordAPI } from './utils';
import { sendOrUpdateOpeningEmbed } from './messages/opening';
import { sendOrUpdateStreamerEmbed } from './messages/streamer';

function getFallbackAbbreviation(teamName: string): string {
  const words = teamName.trim().split(/\s+/);
  if (words.length > 1) {
    return words.map((w) => w[0]).join('').toLowerCase();
  }
  return teamName.substring(0, 4).toLowerCase();
}

function isValidSnowflake(id?: string): boolean {
  if (!id) return false;
  return /^\d{17,20}$/.test(id.trim());
}

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

// 🟢 GENERATE / SYNC MATCH DISCORD CHANNEL & EMBEDS
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
  openingMsgId?: string;
  streamerMsgId?: string;
  isSync?: boolean;
}): Promise<{ channelId: string | null; openingMsgId?: string | null; streamerMsgId?: string | null }> {
  const guildId = DISCORD_CONFIG.GUILD_ID;
  const parentCategoryId = DISCORD_CONFIG.CT_MATCH_ID;

  if (!guildId) return { channelId: null };

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

  // 2. OTOMATISASI ROLE WASIT KE CAMP TIM (JIKA WASIT PAKAI DISCORD ID VALID)
  const isRefereeIdValid = isValidSnowflake(params.refereeDiscordId);
  if (isRefereeIdValid && params.refereeDiscordId) {
    if (isValidSnowflake(params.roleAId)) {
      await discordAPI(`/guilds/${guildId}/members/${params.refereeDiscordId}/roles/${params.roleAId}`, 'PUT').catch(() => null);
    }
    if (isValidSnowflake(params.roleBId)) {
      await discordAPI(`/guilds/${guildId}/members/${params.refereeDiscordId}/roles/${params.roleBId}`, 'PUT').catch(() => null);
    }
  }

  // 🔒 PERMISSION OVERWRITES MATRIX (DISAMAKAN PERSIS DENGAN REGISTRASI TIM):
  const permission_overwrites: any[] = [
    { id: guildId, type: 0, deny: "1024" }, // Hide dari @everyone
    { id: DISCORD_CONFIG.BOT_ROLE_ID, type: 0, allow: "142352" },
  ];

  // Role Tim A & Tim B (Disamakan persis dengan permission registrasi tim)
  if (isValidSnowflake(params.roleAId)) {
    permission_overwrites.push({ id: params.roleAId!, type: 0, allow: "3072", deny: "139280" });
  }
  if (isValidSnowflake(params.roleBId)) {
    permission_overwrites.push({ id: params.roleBId!, type: 0, allow: "3072", deny: "139280" });
  }

  // Wasit & Streamer
  if (isRefereeIdValid) {
    permission_overwrites.push({ id: params.refereeDiscordId!, type: 1, allow: "3072" });
  }

  const isStreamerIdValid = isValidSnowflake(params.streamerDiscordId);
  if (isStreamerIdValid) {
    permission_overwrites.push({ id: params.streamerDiscordId!, type: 1, allow: "3072" });
  }

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

  if (!channelId) return { channelId: null };

  // 4. Send / Update Opening Embed di Channel Match
  const newOpeningMsgId = await sendOrUpdateOpeningEmbed({
    channelId,
    matchId: params.matchId,
    teamAName: params.teamAName,
    teamBName: params.teamBName,
    weekName: params.weekName,
    matchDateIso: params.matchDateIso,
    refereeName: params.refereeName,
    refereeDiscordId: isRefereeIdValid ? params.refereeDiscordId : undefined,
    streamerName: params.streamerName,
    streamerDiscordId: isStreamerIdValid ? params.streamerDiscordId : undefined,
    streamLink: params.streamLink,
    existingMsgId: params.openingMsgId,
  });

  // 5. Send / Update Streamer Embed di Channel Streamer
  const newStreamerMsgId = await sendOrUpdateStreamerEmbed({
    matchChannelId: channelId,
    matchId: params.matchId,
    teamAName: params.teamAName,
    teamBName: params.teamBName,
    matchDateIso: params.matchDateIso,
    refereeName: params.refereeName,
    refereeDiscordId: isRefereeIdValid ? params.refereeDiscordId : undefined,
    streamerName: params.streamerName,
    streamerDiscordId: isStreamerIdValid ? params.streamerDiscordId : undefined,
    streamLink: params.streamLink,
    existingMsgId: params.streamerMsgId,
  });

  return {
    channelId,
    openingMsgId: newOpeningMsgId || params.openingMsgId,
    streamerMsgId: newStreamerMsgId || params.streamerMsgId,
  };
}

// 🟢 DELETE MATCH DISCORD CHANNEL
export async function deleteMatchDiscordChannel(matchId: string): Promise<boolean> {
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
