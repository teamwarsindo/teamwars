// Helper pembantu untuk format Proper Case (Contoh: "TEAM WARS" -> "Team Wars")
function toProperCase(str: string) {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );
}

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

  // FIX 1: Ubah return kosong menjadi return null
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
          { id: roleId, type: 0, allow: "1024" }         
        ]
      })
    });

    // FIX 2: Tangkap response dari Discord dan kembalikan (return) ID-nya
    if (!response.ok) return null;
    const data = await response.json();
    return data.id; 

  } catch (err) {
    console.error("Gagal membuat channel Discord:", err);
    // FIX 3: Kembalikan null jika terjadi error
    return null;
  }
}

export async function createDiscordVoiceChannel(teamName: string, roleId: string) {
  const guildId = process.env.DISCORD_GUILD_ID;
  const token = process.env.DISCORD_BOT_TOKEN;
  // Pastikan buat ID kategori untuk Voice Channel kalau mau dipisah, 
  // atau pakai kategori yang sama dengan text channel
  const parentCategoryId = process.env.DISCORD_CATEGORY_VOICE_ID || process.env.DISCORD_CATEGORY_HQ_ID;
  const everyoneRoleId = guildId;

  if (!guildId || !token || !roleId) return null;

  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      method: 'POST',
      headers: { 'Authorization': `Bot ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${teamName}-voice`, // Menambahkan suffix agar tidak bentrok nama
        type: 2, // 👈 TIPE 2 ADALAH VOICE CHANNEL
        parent_id: parentCategoryId,
        permission_overwrites: [
          { id: everyoneRoleId, type: 0, deny: "1048576" }, // Deny View/Connect
          { id: roleId, type: 0, allow: "1048576" }         // Allow View/Connect
        ]
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.id; // Kembalikan ID agar bisa disimpan di Redis
  } catch (err) {
    console.error("Gagal membuat voice channel Discord:", err);
    return null;
  }
}
