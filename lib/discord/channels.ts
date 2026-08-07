import { DISCORD_CONFIG } from './config';
import { discordAPI } from './utils';
import { sendOrUpdateOpeningEmbed } from './messages/opening';

function getTeamAbbreviation(teamName: string, kodeTim?: string): string {
  if (kodeTim && kodeTim.trim() !== '') {
    return kodeTim.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  const clean = teamName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words.map((w) => w[0]).join('').toLowerCase().slice(0, 4);
  }
  return clean.slice(0, 4).toLowerCase();
}

function isValidSnowflake(id?: string): boolean {
  return !!id && /^\d{17,20}$/.test(id);
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

// 🌐 BATCH CREATE CHANNELS
export async function createDiscordChannels(matches: any[]): Promise<Record<string, string>> {
  const guildId = DISCORD_CONFIG.GUILD_ID;
  const createdChannelMap: Record<string, string> = {};

  if (!guildId || !Array.isArray(matches)) return createdChannelMap;

  for (const match of matches) {
    try {
      const res = await createMatchDiscordChannel({
        matchId: match.id,
        groupName: match.groupName,
        teamAName: match.teamAName,
        teamBName: match.teamBName,
        weekName: match.weekName,
        matchDateIso: match.matchDate,
        refereeName: match.referee,
        refereeDiscordId: match.refereeDiscordId,
        streamerName: match.streamer,
        streamerDiscordId: match.caster || match.streamer,
        streamLink: match.streamLink,
        savedChannelId: match.discordChannelId,
        openingMsgId: match.openingMsgId,
      });

      if (res.channelId) {
        createdChannelMap[match.id] = res.channelId;
      }
    } catch (err) {
      console.error(`Gagal membuat channel untuk match ${match.id}:`, err);
    }
  }

  return createdChannelMap;
}

// 🟢 GENERATE / SYNC SINGLE MATCH DISCORD CHANNEL & EMBED
export async function createMatchDiscordChannel(params: {
  matchId: string;
  groupName?: string;
  teamAName: string;
  teamBName: string;
  kodeTimA?: string;
  kodeTimB?: string;
  emojiAId?: string;
  emojiBId?: string;
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

  if (!guildId) {
    console.error('DISCORD_GUILD_ID tidak ditemukan');
    return { channelId: null, openingMsgId: null };
  }

  const abbrA = getTeamAbbreviation(params.teamAName, params.kodeTimA);
  const abbrB = getTeamAbbreviation(params.teamBName, params.kodeTimB);
  const cleanMatchNum = params.matchId.replace('match-', '');
  const channelName = `⚔️-m${cleanMatchNum}-${abbrA}-${abbrB}`;

  let channelId: string | null = params.savedChannelId || null;

  // 1. CARI CHANNEL ATAU BUAT CHANNEL BARU
  if (!channelId) {
    try {
      const allGuildChannels = await discordAPI(`/guilds/${guildId}/channels`, 'GET');
      if (Array.isArray(allGuildChannels)) {
        const existingChannel = allGuildChannels.find(
          (ch: any) => ch.parent_id === parentCategoryId && ch.name.includes(`-m${cleanMatchNum}-`)
        );
        if (existingChannel) {
          channelId = existingChannel.id;
        }
      }
    } catch (err) {
      console.warn('Gagal mencari channel match eksisting:', err);
    }
  }

  // Permission Overwrites (Privat: Everyone Deny, Bot Allow, Role Tim A & Tim B Allow, Streamer Personal Allow)
  const permissionOverwrites: any[] = [
    {
      id: guildId, // @everyone
      type: 0,
      deny: '1024', // View Channel
    },
  ];

  // A. Bot Access
  if (isValidSnowflake(DISCORD_CONFIG.BOT_ROLE_ID)) {
    permissionOverwrites.push({
      id: DISCORD_CONFIG.BOT_ROLE_ID,
      type: 0,
      allow: '1049616', // View Channel + Send Messages + Embed Links + Read History
    });
  }

  // B. Role Tim A & Tim B
  if (isValidSnowflake(params.roleAId)) {
    permissionOverwrites.push({
      id: params.roleAId,
      type: 0,
      allow: '66560',
    });
  }

  if (isValidSnowflake(params.roleBId)) {
    permissionOverwrites.push({
      id: params.roleBId,
      type: 0,
      allow: '66560',
    });
  }

  // C. Streamer Personal (User ID)
  const isStreamerIdValid = isValidSnowflake(params.streamerDiscordId);
  if (isStreamerIdValid) {
    permissionOverwrites.push({
      id: params.streamerDiscordId,
      type: 1, // 1 = User Overwrite
      allow: '66560',
    });
  }

  if (!channelId) {
    // BUAT CHANNEL MATCH BARU
    const newChannelBody: any = {
      name: channelName,
      type: 0, // GUILD_TEXT
      permission_overwrites: permissionOverwrites,
    };
    if (parentCategoryId) {
      newChannelBody.parent_id = parentCategoryId;
    }

    const createdChannel = await discordAPI(`/guilds/${guildId}/channels`, 'POST', newChannelBody).catch(() => null);
    if (createdChannel?.id) {
      channelId = createdChannel.id;
    }
  } else {
    // UPDATE PERMISSION OVERWRITE UNTUK CHANNEL EKSISTING
    for (const overwrite of permissionOverwrites) {
      await discordAPI(
        `/channels/${channelId}/permissions/${overwrite.id}`,
        'PUT',
        {
          type: overwrite.type,
          allow: overwrite.allow || '0',
          deny: overwrite.deny || '0',
        }
      ).catch(() => null);
    }
  }

  if (!channelId) {
    return { channelId: null, openingMsgId: null };
  }

  // 2. ASSIGN ROLE TIM A & TIM B KE AKUN WASIT
  const isRefereeIdValid = isValidSnowflake(params.refereeDiscordId);
  if (isRefereeIdValid) {
    const refereeId = params.refereeDiscordId!;
    try {
      const member = await discordAPI(`/guilds/${guildId}/members/${refereeId}`, 'GET').catch(() => null);
      if (member && Array.isArray(member.roles)) {
        if (isValidSnowflake(params.roleAId) && !member.roles.includes(params.roleAId)) {
          await discordAPI(`/guilds/${guildId}/members/${refereeId}/roles/${params.roleAId}`, 'PUT').catch(() => null);
        }
        if (isValidSnowflake(params.roleBId) && !member.roles.includes(params.roleBId)) {
          await discordAPI(`/guilds/${guildId}/members/${refereeId}/roles/${params.roleBId}`, 'PUT').catch(() => null);
        }
      }
    } catch (e) {
      console.warn('Gagal assign role tim ke referee:', e);
    }
  }

  // 3. EMBED OPENING (PRIVAT KHUSUS DI CHANNEL MATCH)
  const newOpeningMsgId = await sendOrUpdateOpeningEmbed({
    channelId,
    matchId: params.matchId,
    groupName: params.groupName,
    teamAName: params.teamAName,
    teamBName: params.teamBName,
    kodeTimA: abbrA,
    kodeTimB: abbrB,
    emojiAId: params.emojiAId,
    emojiBId: params.emojiBId,
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

// 🔴 DELETE MATCH DISCORD CHANNEL & REVOKE WASIT ROLES
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

  // Hapus Channel Match
  if (targetChannelId) {
    await discordAPI(`/channels/${targetChannelId}`, 'DELETE').catch(() => null);
  }

  // Revoke Role Tim dari Wasit
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

// 📦 ARCHIVE MATCH DISCORD CHANNEL & REVOKE ROLES
export async function archiveMatchDiscordChannel(params: {
  matchId: string;
  savedChannelId?: string;
  refereeDiscordId?: string;
  streamerDiscordId?: string;
  roleAId?: string;
  roleBId?: string;
}): Promise<boolean> {
  const guildId = DISCORD_CONFIG.GUILD_ID;
  const parentCategoryId = DISCORD_CONFIG.CT_MATCH_ID;

  if (!guildId) return false;

  let targetChannelId = params.savedChannelId || null;

  // 1. CARI CHANNEL JIKA SAVED CHANNEL ID TIDAK TERSEDIA
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

  // 2. KUNCI CHANNEL DISCORD (READ-ONLY UNTUK EVERYONE)
  if (targetChannelId) {
    try {
      await discordAPI(`/channels/${targetChannelId}/permissions/${guildId}`, 'PUT', {
        type: 0,
        allow: '1024', // View Channel
        deny: '2048',  // Send Messages (Locked)
      });
    } catch (err) {
      console.error(`Gagal mengunci channel ${targetChannelId}:`, err);
    }
  }

  // 3. REVOKE ROLE TIM DARI WASIT SAAT MATCH DI-ARCHIVE
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
