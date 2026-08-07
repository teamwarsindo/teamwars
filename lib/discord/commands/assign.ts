import { DISCORD_CONFIG } from '@/lib/discord/config';

export const ASSIGN_COMMAND = {
  name: 'assign',
  description: 'Tugaskan Referee atau Streamer ke Pertandingan (Chief/Admin)',
  options: [
    {
      name: 'type',
      description: 'Pilih peran penugasan',
      type: 3, // STRING
      required: true,
      choices: [
        { name: '⚖️ Referee', value: 'REFEREE' },
        { name: '🎥 Streamer', value: 'STREAMER' },
      ],
    },
    {
      name: 'user',
      description: 'Pilih nama staf (terfilter sesuai role)',
      type: 3, // STRING
      required: true,
      autocomplete: true,
    },
    {
      name: 'match',
      description: 'Pilih pertandingan pada Week Aktif',
      type: 3, // STRING
      required: true,
      autocomplete: true,
    },
  ],
};

export async function registerAssignCommand() {
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
      body: JSON.stringify(ASSIGN_COMMAND),
    });

    if (res.ok) {
      console.log('✅ Command /assign berhasil didaftarkan ke Discord Guild!');
      return true;
    } else {
      const err = await res.json();
      console.error('❌ Gagal mendaftarkan command /assign:', err);
      return false;
    }
  } catch (error) {
    console.error('❌ Error registrasi command /assign:', error);
    return false;
  }
}
