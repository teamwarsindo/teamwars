import { DISCORD_CONFIG } from '@/lib/config';
import { formatRupiah } from '@/lib/discord/messages/bidding';

export function buildLogBidPayload(logs: Array<any>) {
  const safeLogs = Array.isArray(logs) ? logs : [];
  const totalLogs = safeLogs.length;

  // Hanya ambil 2 log teratas/terbaru
  const top2Logs = safeLogs.slice(0, 2);

  const logList =
    top2Logs
      .map((log) => {
        const displayName = log.displayName || log.username || 'User';
        const groupName = log.group || '-';
        const divName = log.name || '';
        const timeStr = log.timestamp || '';

        return `\`[${timeStr}]\` **${displayName}** bid **${formatRupiah(Number(log.amount || 0))}** ➔ **Group ${groupName}** (*"${divName}"*)`;
      })
      .join('\n\n') || '_Belum ada riwayat bidding._';

  const footerText = totalLogs > 2
    ? `Menampilkan 2 dari total ${totalLogs} riwayat. Klik tombol di bawah untuk melihat seluruh log.`
    : `Menampilkan ${totalLogs} riwayat bidding terupdate`;

  return {
    embeds: [
      {
        title: '📜 LIVE LOG RIWAYAT BIDDING',
        description: logList,
        color: 0x2b2d31,
        footer: { text: footerText },
      },
    ],
    components: [
      {
        type: 1, // ActionRow
        components: [
          {
            type: 2,
            style: 2, // Secondary (Grey)
            label: `Lihat Semua Log (${totalLogs})`,
            custom_id: 'btn_view_full_log',
            emoji: { name: '📜' },
          },
        ],
      },
    ],
  };
}

export async function patchLogBidMessage(msgId: string, logs: Array<any>, token: string) {
  const payload = buildLogBidPayload(logs);

  const res = await fetch(`https://discord.com/api/v10/channels/${DISCORD_CONFIG.CH_BID}/messages/${msgId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return res.ok;
}
