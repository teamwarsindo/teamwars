import { DISCORD_CONFIG } from './config';

export async function createDiscordChannel(teamName: string, roleId: string) {
  const guildId = process.env.DISCORD_GUILD_ID;
  const token = process.env.DISCORD_BOT_TOKEN;
  const parentCategoryId = DISCORD_CONFIG.CT_TEAM_ID; 
  const everyoneRoleId = guildId; 

  if (!guildId || !token || !roleId) return null;

  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      method: 'POST',
      headers: { 'Authorization': `Bot ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: teamName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        type: 0, 
        parent_id: parentCategoryId,
        permission_overwrites: [
          { id: everyoneRoleId, type: 0, deny: "1024" },
          { id: roleId, type: 0, allow: "3072", deny: "139280" },
          { id: DISCORD_CONFIG.BOT_ROLE_ID, type: 0, allow: "142352" }
        ]
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.id; 

  } catch (err) {
    console.error("Gagal membuat channel Discord:", err);
    return null;
  }
}

export async function createDiscordVoiceChannel(teamName: string, roleId: string) {
  const guildId = process.env.DISCORD_GUILD_ID;
  const token = process.env.DISCORD_BOT_TOKEN;
  const parentCategoryId = DISCORD_CONFIG.CT_TEAM_ID; 
  const everyoneRoleId = guildId;

  if (!guildId || !token || !roleId) return null;

  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      method: 'POST',
      headers: { 'Authorization': `Bot ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${teamName}`, 
        type: 2, 
        parent_id: parentCategoryId,
        permission_overwrites: [
          { id: everyoneRoleId, type: 0, deny: "1049600" }, 
          { id: roleId, type: 0, allow: "1049600" },
          { id: DISCORD_CONFIG.BOT_ROLE_ID, type: 0, allow: "1049616" }
        ]
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.id; 
  } catch (err) {
    console.error("Gagal membuat voice channel Discord:", err);
    return null;
  }
}
