import { discordAPI, hexToDecimal, getFooterText } from '../utils';

export interface PlayerTrackerItem {
  ign?: string;
  discord?: string;
  discordId?: string;
  role?: string;
  isVerified?: boolean;
}

function getRoleIcon(role?: string): string {
  if (!role) return '';
  const r = role.toLowerCase();
  if (r.includes('ketua') && !r.includes('wakil')) return ' 👑';
  if (r.includes('wakil')) return ' 🎖️';
  return '';
}

export async function sendTeamTracker({
  channelId,
  namaTim,
  warna,
  roleId,
  players,
  createdAt,
  updatedAt,
  transferQuotaUsed = 0,
  trackerMsgId,
}: {
  channelId: string;
  namaTim: string;
  warna: string;
  roleId: string;
  players: PlayerTrackerItem[];
  createdAt: string;
  updatedAt?: string;
  transferQuotaUsed?: number;
  trackerMsgId?: string;
}) {
  let rosterText = "";
  let verifiedCount = 0;

  players.forEach((p) => {
    const rawIgn = (p.ign || '').trim();
    const discordUser = (p.discord || '').trim().replace(/^@/, '');
    const roleIconSuffix = getRoleIcon(p.role);

    if (p.isVerified) verifiedCount++;

    const iconVerified = p.isVerified ? "✅" : "❌";
    rosterText += `${iconVerified} **${rawIgn || '-'}** (@${discordUser || '-'})${roleIconSuffix}\n`;
  });

  rosterText += `\n*Keterangan: 👑 Ketua | 🎖️ Wakil*`;

  const maxTransferQuota = 2;
  const remainingQuota = Math.max(0, maxTransferQuota - transferQuotaUsed);
  const nowIso = updatedAt || new Date().toISOString();

  const payload = {
    embeds: [{
      title: namaTim,
      description: `**DAFTAR ROSTER:**\n${rosterText}`,
      color: hexToDecimal(warna || '#3b82f6'),
      fields: [
        { name: "📌 Role Tim", value: roleId ? `<@&${roleId}>` : `*(Belum Ada)*`, inline: true },
        { name: "📊 Status Verifikasi", value: `**${verifiedCount} / ${players.length}** Terverifikasi`, inline: true },
        { 
          name: "🔄 Kuota Transfer", 
          value: `**${transferQuotaUsed} / ${maxTransferQuota}** Terpakai *(Sisa: ${remainingQuota})*`, 
          inline: false 
        }
      ],
      footer: { 
        text: getFooterText(createdAt, nowIso) 
      }
    }]
  };

  // Jika trackerMsgId ada, panggil PATCH
  if (trackerMsgId) {
    const patchRes = await discordAPI(`/channels/${channelId}/messages/${trackerMsgId}`, 'PATCH', payload);
    if (patchRes) return trackerMsgId;
  }

  // Jika belum ada / PATCH gagal, panggil POST baru
  const msgData = await discordAPI(`/channels/${channelId}/messages`, 'POST', payload);
  if (msgData?.id) {
    await discordAPI(`/channels/${channelId}/pins/${msgData.id}`, 'PUT', {}).catch(() => null);
    return msgData.id;
  }
  
  return "";
}