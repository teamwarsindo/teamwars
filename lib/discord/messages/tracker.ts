import { discordAPI, hexToDecimal, getFooterText } from '../utils';

export async function sendTeamTracker({
  channelId,
  namaTim,
  warna,
  roleId,
  players
}: {
  channelId: string;
  namaTim: string;
  warna: string;
  roleId: string;
  players: any[];
}) {
  let rosterText = "";
  players.forEach((p: any) => {
    rosterText += `❌ **${p.ign}** (\`@${p.discord}\`) - *${p.role}*\n`;
  });

  const payload = {
    embeds: [{
      title: `🛡️ DATABASE TIM: ${namaTim.toUpperCase()}`,
      description: `**DAFTAR ROSTER:**\n${rosterText}`,
      color: hexToDecimal(warna),
      fields: [
        { name: "📌 Role Tim", value: roleId ? `<@&${roleId}>` : `*(Belum Ada)*`, inline: true },
        { name: "📊 Status", value: `**0 / ${players.length}** Terverifikasi`, inline: true }
      ],
      footer: { 
            text: getFooterText(createdAt) 
      }
    }]
  };

  const msgData = await discordAPI(`/channels/${channelId}/messages`, 'POST', payload);
  
  if (msgData?.id) {
    // Pin pesan
    await discordAPI(`/channels/${channelId}/pins/${msgData.id}`, 'PUT', {});
    return msgData.id;
  }
  
  return "";
}
