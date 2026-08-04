import { DISCORD_CONFIG } from './config';
import { discordAPI } from './utils';
import { sendOrUpdateOpeningEmbed } from './messages/opening';

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

// Helper: Cek apakah member Discord sudah memiliki Role tertentu
async function memberHasRole(guildId: string, userId: string, roleId: string): Promise<boolean> {
  try {
    const member = await discordAPI(`/guilds/${guildId}/members/${userId}`, 'GET');
    if (!member || !Array.isArray(member.roles)) return false;
    return member.roles.includes(roleId);
  } catch {
    return false;
  }
}

// Helper: Cek apakah target (Role/User) sudah ada di Overwrite Permission Channel Match
async function channelHasOverwrite(channelId: string, targetId: string): Promise<boolean> {
  try {
    const channel = await discordAPI(`/channels/${channelId}`, 'GET');
    if (!channel || !Array.isArray(channel.permission_overwrites)) return false;
    return channel.permission_overwrites.some((ow: any) => ow.id === targetId);
  } catch {
    return false;
  }
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

// 🟢 GENERATE / SYNC SINGLE MATCH DISCORD CHANNEL & EMBED
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
  savedChannelId?: string;
  openingMsgId?: string;
}): Promise<{ channelId: string | null; openingMsgId?: string | null }> {
  const guildId = DISCORD_CONFIG.GUILD_ID;
  const parentCategoryId = DISCORD_CONFIG.CT_MATCH_ID;

  if (!guildId) return { channelId: null };

  const abbrA = params.kodeTimA || getFallbackAbbreviation(params.teamAName);
  const abbrB = params.kodeTimB || getFallbackAbbreviation(params.teamBName);

  const cleanMatchNum = params.matchId.replace('match-', '');
  const targetChannelName = `⚔️-m${cleanMatchNum}-${abbrA}-${abbrB}`;

  let channelId: string | null = params.savedChannelId || null;

  // 1. PENGECEKAN CHANNEL MATCH
  if (!channelId) {
    try {
      const allGuildChannels = await discordAPI(`/guilds/${guildId}/channels`, 'GET');
      if (Array.isArray(allGuildChannels)) {
        const existingChannel = allGuildChannels.find(
          (ch: any) => ch.parent_id === parentCategoryId && ch.name === targetChannelName
        );
        if (existingChannel) channelId = existingChannel.id;
      }
    } catch {
      channelId = null;
    }
  }

  const isRefereeIdValid = isValidSnowflake(params.refereeDiscordId);
  const isStreamerIdValid = isValidSnowflake(params.streamerDiscordId);

  // 2. JIKA CHANNEL BELUM ADA ➔ BUAT CHANNEL + PASANG PERMISSION
  if (!channelId) {
    const permission_overwrites: any[] = [
      { id: guildId, type: 0, deny: "1024" }, // Hide dari @everyone
      { id: DISCORD_CONFIG.BOT_ROLE_ID, type: 0, allow: "142352" },
    ];

    if (isValidSnowflake(params.roleAId)) {
      permission_overwrites.push({ id: params.roleAId!, type: 0, allow: "3072", deny: "139280" });
    }
    if (isValidSnowflake(params.roleBId)) {
      permission_overwrites.push({ id: params.roleBId!, type: 0, allow: "3072", deny: "139280" });
    }

    if (isRefereeIdValid) {
      permission_overwrites.push({ id: params.refereeDiscordId!, type: 1, allow: "3072" });
    }

    if (isStreamerIdValid) {
      permission_overwrites.push({ id: params.streamerDiscordId!, type: 1, allow: "3072" });
    }

    try {
      const createdData = await discordAPI(`/guilds/${guildId}/channels`, 'POST', {
        name: targetChannelName,
        type: 0,
        parent_id: parentCategoryId,
        permission_overwrites,
      });

      channelId = createdData?.id || null;
    } catch {
      channelId = null;
    }
  } else {
    // JIKA CHANNEL SUDAH ADA ➔ Cek ketersediaan permission overwrite (Tambahkan hanya jika belum ada)
    if (isValidSnowflake(params.roleAId)) {
      const hasA = await channelHasOverwrite(channelId, params.roleAId!);
      if (!hasA) {
        await discordAPI(`/channels/${channelId}/permissions/${params.roleAId}`, 'PUT', {
          allow: "3072",
          deny: "139280",
          type: 0,
        }).catch(() => null);
      }
    }

    if (isValidSnowflake(params.roleBId)) {
      const hasB = await channelHasOverwrite(channelId, params.roleBId!);
      if (!hasB) {
        await discordAPI(`/channels/${channelId}/permissions/${params.roleBId}`, 'PUT', {
          allow: "3072",
          deny: "139280",
          type: 0,
        }).catch(() => null);
      }
    }

    if (isStreamerIdValid) {
      const hasStm = await channelHasOverwrite(channelId, params.streamerDiscordId!);
      if (!hasStm) {
        await discordAPI(`/channels/${channelId}/permissions/${params.streamerDiscordId}`, 'PUT', {
          allow: "3072",
          type: 1,
        }).catch(() => null);
      }
    }
  }

  if (!channelId) return { channelId: null };

  // 3. PASANG ROLE TIM A & B KE WASIT (SKIP JIKA WASIT SUDAH PUNYA ROLE)
  if (isRefereeIdValid && params.refereeDiscordId) {
    if (isValidSnowflake(params.roleAId)) {
      const hasRoleA = await memberHasRole(guildId, params.refereeDiscordId, params.roleAId!);
      if (!hasRoleA) {
        await discordAPI(`/guilds/${guildId}/members/${params.refereeDiscordId}/roles/${params.roleAId}`, 'PUT').catch(() => null);
      }
    }

    if (isValidSnowflake(params.roleBId)) {
      const hasRoleB = await memberHasRole(guildId, params.refereeDiscordId, params.roleBId!);
      if (!hasRoleB) {
        await discordAPI(`/guilds/${guildId}/members/${params.refereeDiscordId}/roles/${params.roleBId}`, 'PUT').catch(() => null);
      }
    }
  }

  // 4. EMBED CHANNEL MATCH
  const newOpeningMsgId = await sendOrUpdateOpeningEmbed({
    channelId,
    matchId: params.matchId,
    teamAName: params.teamAName,
    teamBName: params.teamBName,
    roleAId: params.roleAId,
    roleBId: params.roleBId,
    weekName: params.weekName,
    matchDateIso: params.matchDateIso,
    refereeName: params.refereeName,
    refereeDiscordId: isRefereeIdValid ? params.refereeDiscordId : undefined,
    streamerName: params.streamerName,
    streamerDiscordId: isStreamerIdValid ? params.streamerDiscordId : undefined,
    streamLink: params.streamLink,
    existingMsgId: params.openingMsgId,
  });

  return {
    channelId,
    openingMsgId: newOpeningMsgId || params.openingMsgId,
  };
}

// 🟢 DELETE MATCH DISCORD CHANNEL & REVOKE WASIT ROLES
export async function deleteMatchDiscordChannel(params: {
  matchId: string;
  savedChannelId?: string;
  refereeDiscordId?: string;
  roleAId?: string;
  roleBId?: string;
}): Promise<boolean> {
  const guildId = DISCORD_CONFIG.GUILD_ID;
  const parentCategoryId = DISCORD_CONFIG.CT_MATCH_ID;

  if (!guildId) return false;

  // 1. HAPUS CHANNEL MATCH (Dibungkus try-catch senyap agar tidak crash jika channel sudah terhapus)
  let targetChannelId = params.savedChannelId || null;

  if (!targetChannelId) {
    try {
      const cleanMatchNum = params.matchId.replace('match-', '');
      const allGuildChannels = await discordAPI(`/guilds/${guildId}/channels`, 'GET');

      if (Array.isArray(allGuildChannels)) {
        const existingChannel = allGuildChannels.find(
          (ch: any) => ch.parent_id === parentCategoryId && ch.name.includes(`-m${cleanMatchNum}-`)
        );
        if (existingChannel) targetChannelId = existingChannel.id;
      }
    } catch {
      targetChannelId = null;
    }
  }

  if (targetChannelId) {
    await discordAPI(`/channels/${targetChannelId}`, 'DELETE').catch(() => null);
  }

  // 2. CABUT ROLE TIM DARI AKUN WASIT (Dibungkus try-catch senyap jika user/role sudah tidak ada)
  if (isValidSnowflake(params.refereeDiscordId)) {
    if (isValidSnowflake(params.roleAId)) {
      await discordAPI(`/guilds/${guildId}/members/${params.refereeDiscordId}/roles/${params.roleAId}`, 'DELETE').catch(() => null);
    }
    if (isValidSnowflake(params.roleBId)) {
      await discordAPI(`/guilds/${guildId}/members/${params.refereeDiscordId}/roles/${params.roleBId}`, 'DELETE').catch(() => null);
    }
  }

  return true;
        }
        
