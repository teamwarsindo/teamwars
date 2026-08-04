import { discordAPI } from '../utils';

export async function sendOrUpdateWeeklyRecapEmbed(params: {
  channelId: string;
  weekName: string;
  dailyMatchCounts: Array<{
    dateFormatted: string;
    count: number;
  }>;
  existingRecapMsgId?: string;
}): Promise<string | null> {
  if (!params.channelId) return null;

  // 1. Jika data match kosong, jangan kirim request yang merusak embed
  if (!params.dailyMatchCounts || params.dailyMatchCounts.length === 0) {
    console.warn('⚠️ dailyMatchCounts kosong, batal mengirim Weekly Recap.');
    return null;
  }

  // 2. Hapus pesan rekap lama jika ada
  if (params.existingRecapMsgId) {
    await discordAPI(`/channels/${params.channelId}/messages/${params.existingRecapMsgId}`, 'DELETE').catch(() => null);
  }

  // 3. Format Status Warna & Keterangan Pertandingan (DENGAN HARD LIMIT KARAKTER)
  const fields = params.dailyMatchCounts.map((day, idx) => {
    let statusText = '';
    
    if (day.count >= 3) {
      statusText = `\`${day.count} / 3 Match\` 🔴 *(Penuh)*`;
    } else if (day.count === 2) {
      statusText = `\`${day.count} / 3 Match\` 🟡 *(Tersedia 1 Match)*`;
    } else {
      const remainingMatches = 3 - day.count;
      statusText = `\`${day.count} / 3 Match\` 🟢 *(Tersedia ${remainingMatches} Match)*`;
    }

    // Pastikan string yang di-slice adalah String murni dan TIDAK KOSONG
    const rawDateStr = typeof day.dateFormatted === 'string' && day.dateFormatted.trim() !== '' 
      ? day.dateFormatted.trim() 
      : `Hari ${idx + 1}`;

    // Potong string tanggal maksimal 15 karakter
    const safeDate = rawDateStr.slice(0, 15);
    
    // Gabung dengan Emoji (Hasil akhir dijamin 100% di bawah 20 karakter)
    const fieldName = `📅 ${safeDate}`;

    // LOG UNTUK DEBUGGING (Bisa dicek di console server jika masih error)
    console.log(`[WeeklyRecap Field ${idx}] Name: "${fieldName}" (Len: ${fieldName.length}), Value: "${statusText}"`);

    return {
      name: String(fieldName),
      value: String(statusText),
      inline: false,
    };
  });

  // 4. Payload Embed
  const embedObject = {
    title: `📊 Rekap Jadwal Pertandingan - ${params.weekName}`,
    color: 0x9b59b6, // Warna Ungu / Purple
    description: 'Ketersediaan match per hari sebagai acuan reschedule.',
    fields: fields,
    footer: { text: 'Team Wars Indonesia Season 7' },
  };

  // 5. Kirim pesan embed baru tanpa ping
  const res = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', {
    embeds: [embedObject],
  }).catch((err) => {
    console.error('❌ Error Detail sendOrUpdateWeeklyRecapEmbed:', JSON.stringify(err));
    return null;
  });

  return res?.id || null;
}