import { DISCORD_CONFIG } from '@/lib/config';
import { formatRupiah } from '@/lib/discord/messages/bidding';

export function buildLogBidPayload(logs: Array<any>) {
  // Menampilkan seluruh log riwayat tanpa dibatasi hanya 2 atau 10
  const logList =
    logs
      .map((log) => {
        const displayName = log.displayName || log.username;
        return `\`[${log.timestamp}]\` **${displayName}** bid **${formatRupiah(log.amount)}** ➔ **Group ${log.group}** (*"${log.name}"*)`;
      })
      .join('\n\n') || '_Belum ada riwayat bidding._';

  const totalLogs = logs.length;
  const footerText = `Menampilkan ${totalLogs} riwayat bidding terupdate`;

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

  await fetch(`https://discord.com/api/v10/channels/${DISCORD_CONFIG.CH_BID}/messages/${msgId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}