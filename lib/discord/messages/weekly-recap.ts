import { discordAPI } from '../utils';

export async function sendOrUpdateWeeklyRecapEmbed(params: {
  channelId: string;
  weekName: string;
  dailyMatchCounts: Array<{
    dateFormatted: string; // Contoh: "Kamis, 6 Agu"
    count: number;          // Jumlah match terdaftar (0 - 3)
  }>;
  existingRecapMsgId?: string;
}): Promise<string | null> {
  if (!params.channelId) return null;

  if (!params.dailyMatchCounts || params.dailyMatchCounts.length === 0) {
    return null;
  }

  // 1. Hapus pesan rekap lama jika ada
  if (params.existingRecapMsgId) {
    await discordAPI(`/channels/${params.channelId}/messages/${params.existingRecapMsgId}`, 'DELETE').catch(() => null);
  }

  // 2. Format Status Warna & Keterangan Pertandingan Ringkas (Aman dari limit Discord API)
  const fields = params.dailyMatchCounts.map((day, idx) => {
    let statusText = '';
    
    if (day.count >= 3) {
      statusText = `🔴 ${day.count}/3 Match (Penuh)`;
    } else if (day.count === 2) {
      statusText = `🟡 ${day.count}/3 Match (Sisa 1)`;
    } else {
      const remaining = 3 - day.count;
      statusText = `🟢 ${day.count}/3 Match (Sisa ${remaining})`;
    }

    const rawDateStr = typeof day.dateFormatted === 'string' && day.dateFormatted.trim() !== '' 
      ? day.dateFormatted.trim() 
      : `Hari ${idx + 1}`;

    // Pastikan panjang string tidak melebihi batas 25 karakter Discord API
    const safeName = `📅 ${rawDateStr}`.slice(0, 20);
    const safeValue = statusText.slice(0, 25);

    return {
      name: safeName,
      value: safeValue,
      inline: false,
    };
  });

  // 3. Payload Embed Rekap
  const embedObject = {
    title: `📊 Rekap Jadwal Pertandingan - ${params.weekName}`,
    color: 0x9b59b6, // Warna Ungu / Purple
    description: 'Ketersediaan match per hari sebagai acuan reschedule.',
    fields: fields,
    footer: { text: 'Team Wars Indonesia Season 7' },
  };

  // 4. Kirim pesan embed baru tanpa ping
  const res = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', {
    embeds: [embedObject],
  }).catch((err) => {
    console.error('❌ Error Weekly Recap Discord API:', err);
    return null;
  });

  return res?.id || null;
    }
