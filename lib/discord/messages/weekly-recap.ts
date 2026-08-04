import { discordAPI } from '../utils';

export async function sendOrUpdateWeeklyRecapEmbed(params: {
  channelId: string;
  weekName: string;
  dailyMatchCounts: Array<{
    dateFormatted: string; // Contoh: "Rabu, 5 Agu 2026"
    count: number;          // Jumlah match terdaftar (0 - 3)
  }>;
  existingRecapMsgId?: string;
}): Promise<string | null> {
  if (!params.channelId) return null;

  // 1. Hapus pesan rekap lama jika ada
  if (params.existingRecapMsgId) {
    await discordAPI(`/channels/${params.channelId}/messages/${params.existingRecapMsgId}`, 'DELETE').catch(() => null);
  }

  // 2. Format Status Warna & Keterangan Pertandingan
  const fields = params.dailyMatchCounts.map((day) => {
    let statusText = '';
    
    if (day.count >= 3) {
      statusText = `\`${day.count} / 3 Match\` 🔴 *(Penuh)*`;
    } else if (day.count === 2) {
      statusText = `\`${day.count} / 3 Match\` 🟡 *(Tersedia 1 Match)*`;
    } else {
      const remainingMatches = 3 - day.count;
      statusText = `\`${day.count} / 3 Match\` 🟢 *(Tersedia ${remainingMatches} Match)*`;
    }

    return {
      name: `📅 ${day.dateFormatted}`,
      value: statusText,
      inline: false,
    };
  });

  // 3. Payload Embed Rekap Ringkas
  const embedObject = {
    title: `📊 Rekap Jadwal Pertandingan - ${params.weekName}`,
    color: 0x9b59b6, // Warna Ungu / Purple
    description: 'Ketersediaan match per hari sebagai acuan reschedule.',
    fields,
    footer: { text: 'Team Wars Indonesia Season 7' },
  };

  // 4. Kirim pesan embed baru tanpa ping
  const res = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', {
    embeds: [embedObject],
  }).catch(() => null);

  return res?.id || null;
}