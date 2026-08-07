import { DISCORD_CONFIG } from '@/lib/discord/config';

export const STAFF_COMMAND = {
  name: 'staff',
  description: 'Kelola penugasan Wasit & Streamer (Chief/Admin)',
  options: [
    {
      name: 'action',
      description: 'Pilih aksi penugasan',
      type: 3, // STRING
      required: true,
      choices: [
        { name: '➕ Assign (Penugasan Awal)', value: 'assign' },
        { name: '🔄 Reassign (Ganti Staff)', value: 'reassign' },
        { name: '✅ Complete (Match Selesai)', value: 'complete' },
        { name: '🔄 Update (Sync Master Staf KV)', value: 'update' },
      ],
    },
    {
      name: 'type',
      description: 'Pilih tipe staf',
      type: 3, // STRING
      required: false,
      choices: [
        { name: '⚖️ Referee', value: 'REFEREE' },
        { name: '🎥 Streamer', value: 'STREAMER' },
        { name: '👥 Both (Khusus Complete / Update)', value: 'BOTH' },
      ],
    },
    {
      name: 'user',
      description: 'Pilih staf (Terfilter otomatis)',
      type: 3, // STRING
      required: false,
      autocomplete: true,
    },
    {
      name: 'match',
      description: 'Pilih pertandingan',
      type: 3, // STRING
      required: false,
      autocomplete: true,
    },
  ],
};

export async function registerStaffCommand() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = DISCORD_CONFIG.GUILD_ID;

  if (!token || !clientId || !guildId) {
    console.error('❌ DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, atau GUILD_ID tidak ditemukan!');
    return false;
  }

  const url = `https://discord.com/api/v10/applications/${clientId}/guilds/${guildId}/commands`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(STAFF_COMMAND),
    });

    if (res.ok) {
      console.log('✅ Command /staff berhasil didaftarkan ke Discord Guild!');
      return true;
    } else {
      const err = await res.json();
      console.error('❌ Gagal mendaftarkan command /staff:', err);
      return false;
    }
  } catch (error) {
    console.error('❌ Error registrasi command /staff:', error);
    return false;
  }
}