import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from './config';
import { discordAPI, hexToDecimal } from './utils';

export async function createDiscordRole(teamName: string, colorHex: string) {
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) return null;

  const data = await discordAPI(`/guilds/${guildId}/roles`, 'POST', {
    name: teamName, 
    color: hexToDecimal(colorHex, 3447003),
    hoist: true,
    mentionable: true
  });
    
  return data?.id || null;
}

export async function autoSortTeamRoles() {
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) return false;

  try {
    const allTeamSlugs = await kv.smembers('global:teams');
    const teams = [];
    
    for (const slug of allTeamSlugs) {
      const t: any = await kv.hgetall(`teams:${slug}`);
      if (t && t.discordRoleId) teams.push(t); 
    }

    teams.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const teamRoleIds = teams.map(t => t.discordRoleId);
    const targetRoleIds = [DISCORD_CONFIG.ROLE_KETUA, DISCORD_CONFIG.ROLE_WAKIL, ...teamRoleIds];

    const serverRoles = await discordAPI(`/guilds/${guildId}/roles`, 'GET');
    if (!serverRoles) return false;

    serverRoles.sort((a: any, b: any) => a.position - b.position);

    const ketuaRole = serverRoles.find((r: any) => r.id === DISCORD_CONFIG.ROLE_KETUA);
    const wakilRole = serverRoles.find((r: any) => r.id === DISCORD_CONFIG.ROLE_WAKIL);
    
    const highestTargetPos = Math.max(...serverRoles.filter((r: any) => targetRoleIds.includes(r.id)).map((r: any) => r.position));
    const otherRoles = serverRoles.filter((r: any) => !targetRoleIds.includes(r.id));

    let insertIndex = otherRoles.findIndex((r: any) => r.position > highestTargetPos);
    if (insertIndex === -1) insertIndex = otherRoles.length;

    const block = [];
    for (let i = teamRoleIds.length - 1; i >= 0; i--) {
      const r = serverRoles.find((sr: any) => sr.id === teamRoleIds[i]);
      if (r) block.push(r);
    }
    if (wakilRole) block.push(wakilRole);
    if (ketuaRole) block.push(ketuaRole);

    const newRolesArray = [
      ...otherRoles.slice(0, insertIndex),
      ...block,
      ...otherRoles.slice(insertIndex)
    ];

    const payload: any[] = [];
    newRolesArray.forEach((role, index) => {
      if (role.position !== index && role.id !== guildId) { 
        payload.push({ id: role.id, position: index });
      }
    });

    if (payload.length > 0) {
      await discordAPI(`/guilds/${guildId}/roles`, 'PATCH', payload);
    }

    return true;
  } catch (error) {
    console.error("Error Auto-Sort Roles:", error);
    return false;
  }
}
