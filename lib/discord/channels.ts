import { DISCORD_CONFIG } from './config';
import { discordAPI } from './utils';

export async function createDiscordChannel(teamName: string, roleId: string) {
  const guildId = process.env.DISCORD_GUILD_ID;
  const parentCategoryId = DISCORD_CONFIG.CT_TEAM_ID; 

  if (!guildId || !roleId) return null;

  const data = await discordAPI(`/guilds/${guildId}/channels`, 'POST', {
    name: teamName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    type: 0, 
    parent_id: parentCategoryId,
    permission_overwrites: [
      { id: guildId, type: 0, deny: "1024" }, // guildId = @everyone role id
      { id: roleId, type: 0, allow: "3072", deny: "139280" },
      { id: DISCORD_CONFIG.BOT_ROLE_ID, type: 0, allow: "142352" }
    ]
  });

  return data?.id || null;
}

export async function createDiscordVoiceChannel(teamName: string, roleId: string) {
  const guildId = process.env.DISCORD_GUILD_ID;
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
