// Helper pembantu untuk format Proper Case (Contoh: "TEAM WARS" -> "Team Wars")
function toProperCase(str: string) {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );
}

// 🎯 ID ROLE BOT LU (Jadikan konstanta di atas biar gampang kalau mau diganti)
const BOT_ROLE_ID = "1521016621597065309";

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
        name: teamName, // Sesuai input peserta
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

export async function createDiscordChannel(teamName: string, roleId: string) {
  const guildId = process.env.DISCORD_GUILD_ID;
  const token = process.env.DISCORD_BOT_TOKEN;
  const parentCategoryId = process.env.DISCORD_CATEGORY_HQ_ID || "MASUKIN_ID_KATEGORI_DISINI"; 
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
          { id: roleId, type: 0, allow: "1024" },
          // ⚡ INJEKSI BOT: 3088 = View (1024) + Send Msg (2048) + Manage Channel (16)
          { id: BOT_ROLE_ID, type: 0, allow: "3088" }
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
  const parentCategoryId = process.env.DISCORD_CATEGORY_HQ_ID || "MASUKIN_ID_KATEGORI_DISINI"; 
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
          // ⚡ INJEKSI BOT: 1049616 = View (1024) + Connect (1048576) + Manage Channel (16)
          { id: BOT_ROLE_ID, type: 0, allow: "1049616" }
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
  
