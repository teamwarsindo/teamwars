import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from './config';

export async function createDiscordRole(teamName: string, colorHex: string) {
  const guildId = process.env.DISCORD_GUILD_ID;
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!guildId || !token) return null;

  const decimalColor = parseInt(colorHex.replace('#', ''), 16) || 3447003;
  
  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      method: 'POST',
      headers: { 'Authorization': `Bot ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: teamName, 
        color: decimalColor,
        hoist: true,
        mentionable: true
      })
    });
    
    if (!response.ok) return null;
    const data = await response.json();
    return data.id;
  } catch (err) {
    console.error("Gagal membuat role Discord:", err);
    return null;
  }
}

export async function autoSortTeamRoles() {
  const guildId = process.env.DISCORD_GUILD_ID;
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!guildId || !token) return false;

  try {
    const allTeamSlugs = await kv.smembers('global:teams');
    let teams = [];
    
    for (const slug of allTeamSlugs) {
      const t: any = await kv.hgetall(`teams:${slug}`);
      if (t && t.discordRoleId) teams.push(t); 
    }

    teams.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const teamRoleIds = teams.map(t => t.discordRoleId);
    const targetRoleIds = [DISCORD_CONFIG.ROLE_KETUA, DISCORD_CONFIG.ROLE_WAKIL, ...teamRoleIds];

    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: { 'Authorization': `Bot ${token}` }
    });
    let serverRoles = await res.json();
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
      const updateRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bot ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!updateRes.ok) console.error("Gagal menyusun role:", await updateRes.text());
    }

    return true;
  } catch (error) {
    console.error("Error Auto-Sort Roles:", error);
    return false;
  }
}
  
