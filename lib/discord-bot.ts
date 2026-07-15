import { kv } from '@vercel/kv';

const ROLE_KETUA = '610109155465756692';
const ROLE_WAKIL = '1173455029814952006';
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
  
export async function autoSortTeamRoles() {
  const guildId = process.env.DISCORD_GUILD_ID;
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!guildId || !token) return false;

  try {
    // 1. Ambil semua data tim dari KV Database
    const allTeamSlugs = await kv.smembers('global:teams');
    let teams = [];
    
    for (const slug of allTeamSlugs) {
      const t: any = await kv.hgetall(`teams:${slug}`);
      // Hanya ambil tim yang sudah punya Role Discord
      if (t && t.discordRoleId) teams.push(t); 
    }

    // 2. Urutkan tim: Paling awal daftar (Oldest) di atas
    teams.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const teamRoleIds = teams.map(t => t.discordRoleId);
    const targetRoleIds = [ROLE_KETUA, ROLE_WAKIL, ...teamRoleIds];

    // 3. Tarik semua role dari Discord
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: { 'Authorization': `Bot ${token}` }
    });
    let serverRoles = await res.json();

    // Urutkan berdasarkan posisi saat ini (dari bawah ke atas)
    serverRoles.sort((a: any, b: any) => a.position - b.position);

    // 4. Pisahkan Role Target dengan Role Lainnya
    const ketuaRole = serverRoles.find((r: any) => r.id === ROLE_KETUA);
    const wakilRole = serverRoles.find((r: any) => r.id === ROLE_WAKIL);
    
    // Cari posisi tertinggi dari role target saat ini (Biasanya posisinya Ketua)
    const highestTargetPos = Math.max(...serverRoles.filter((r: any) => targetRoleIds.includes(r.id)).map((r: any) => r.position));

    const otherRoles = serverRoles.filter((r: any) => !targetRoleIds.includes(r.id));

    // Cari letak penyisipan (Tepat di mana role Ketua berada sebelumnya)
    let insertIndex = otherRoles.findIndex((r: any) => r.position > highestTargetPos);
    if (insertIndex === -1) insertIndex = otherRoles.length;

    // 5. Susun Blok Baru (Dari urutan Bawah ke Atas)
    const block = [];
    // Tim Terbaru ditaruh paling bawah, Tim Tertua ditaruh di atasnya
    for (let i = teamRoleIds.length - 1; i >= 0; i--) {
      const r = serverRoles.find((sr: any) => sr.id === teamRoleIds[i]);
      if (r) block.push(r);
    }
    // Wakil dan Ketua di pucuk pimpinan blok ini
    if (wakilRole) block.push(wakilRole);
    if (ketuaRole) block.push(ketuaRole);

    // 6. Gabungkan kembali dengan role server lainnya
    const newRolesArray = [
      ...otherRoles.slice(0, insertIndex),
      ...block,
      ...otherRoles.slice(insertIndex)
    ];

    // 7. Siapkan Payload untuk Discord
    const payload: any[] = [];
    newRolesArray.forEach((role, index) => {
      // Posisi 0 selalu milik @everyone, jadi kita biarkan
      if (role.position !== index && role.id !== guildId) { 
        payload.push({ id: role.id, position: index });
      }
    });

    // 8. Tembak Discord API untuk Update Posisi Massal
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
