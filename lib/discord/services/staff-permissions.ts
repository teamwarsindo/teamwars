import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI, isValidSnowflake } from '@/lib/discord/utils';

export async function grantStaffPermissions(params: {
  type: 'REFEREE' | 'STREAMER';
  staffId: string;
  matchChannelId?: string;
  roleAId?: string;
  roleBId?: string;
}) {
  const guildId = DISCORD_CONFIG.GUILD_ID;
  const rolePengawas = (DISCORD_CONFIG as any).ROLE_PENGAWAS;
  const { type, staffId, matchChannelId, roleAId, roleBId } = params;

  if (!guildId || !isValidSnowflake(staffId)) return;

  const tasks: Promise<any>[] = [];

  if (type === 'REFEREE') {
    if (isValidSnowflake(roleAId)) {
      tasks.push(discordAPI(`/guilds/${guildId}/members/${staffId}/roles/${roleAId}`, 'PUT'));
    }
    if (isValidSnowflake(roleBId)) {
      tasks.push(discordAPI(`/guilds/${guildId}/members/${staffId}/roles/${roleBId}`, 'PUT'));
    }
    if (matchChannelId && isValidSnowflake(rolePengawas)) {
      tasks.push(
        discordAPI(`/channels/${matchChannelId}/permissions/${rolePengawas}`, 'PUT', {
          type: 0,
          allow: '66560',
          deny: '0',
        })
      );
    }
  } else if (matchChannelId) {
    tasks.push(
      discordAPI(`/channels/${matchChannelId}/permissions/${targetStaffPermission(staffId)}`, 'PUT', {
        type: 1,
        allow: '66560',
        deny: '0',
      })
    );
  }

  await Promise.all(tasks).catch(() => null);
}

function targetStaffPermission(staffId: string) {
  return staffId;
}

export async function revokeStaffPermissions(params: {
  type: 'REFEREE' | 'STREAMER';
  staffId: string;
  matchChannelId?: string;
  roleAId?: string;
  roleBId?: string;
}) {
  const guildId = DISCORD_CONFIG.GUILD_ID;
  const rolePengawas = (DISCORD_CONFIG as any).ROLE_PENGAWAS;
  const { type, staffId, matchChannelId, roleAId, roleBId } = params;

  if (!guildId || !isValidSnowflake(staffId)) return;

  const tasks: Promise<any>[] = [];

  if (type === 'REFEREE') {
    if (isValidSnowflake(roleAId)) {
      tasks.push(discordAPI(`/guilds/${guildId}/members/${staffId}/roles/${roleAId}`, 'DELETE'));
    }
    if (isValidSnowflake(roleBId)) {
      tasks.push(discordAPI(`/guilds/${guildId}/members/${staffId}/roles/${roleBId}`, 'DELETE'));
    }
    if (matchChannelId && isValidSnowflake(rolePengawas)) {
      tasks.push(discordAPI(`/channels/${matchChannelId}/permissions/${rolePengawas}`, 'DELETE'));
    }
  } else if (matchChannelId) {
    tasks.push(discordAPI(`/channels/${matchChannelId}/permissions/${staffId}`, 'DELETE'));
  }

  await Promise.all(tasks).catch(() => null);
}