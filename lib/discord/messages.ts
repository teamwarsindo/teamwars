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
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return "";

  try {
    let rosterText = "";
    players.forEach((p: any) => {
      rosterText += `❌ **${p.ign}** (\`@${p.discord}\`) - *${p.role}*\n`;
    });

    const decimalColor = warna ? parseInt(warna.replace('#', ''), 16) : 11146056;

    const payload = {
      embeds: [{
        title: `🛡️ DATABASE TIM: ${namaTim.toUpperCase()}`,
        description: `**DAFTAR ROSTER:**\n${rosterText}`,
        color: decimalColor,
        fields: [
          { name: "📌 Role Tim", value: roleId ? `<@&${roleId}>` : `*(Belum Ada)*`, inline: true },
          { name: "📊 Status", value: `**0 / ${players.length}** Terverifikasi`, inline: true }
        ],
        timestamp: new Date().toISOString()
      }]
    };

    const msgRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!msgRes.ok) return "";

    const msgData = await msgRes.json();
    const messageId = msgData.id;

    if (messageId) {
      await fetch(`https://discord.com/api/v10/channels/${channelId}/pins/${messageId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bot ${token}` }
      });
    }

    return messageId;
  } catch (error) {
    console.error("Error di sendTeamTracker:", error);
    return "";
  }
}
