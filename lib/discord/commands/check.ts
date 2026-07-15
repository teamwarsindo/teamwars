import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function handleCheck(body: any) {
  const channelId = body.channel_id;
  let foundTeam: any = null;
  
  const allTeamSlugs = await kv.smembers('global:teams');
  for (const slug of allTeamSlugs) {
    const teamData: any = await kv.hgetall(`teams:${slug}`);
    if (teamData && (teamData.discordChannelId === channelId || teamData.channelId === channelId)) {
      foundTeam = teamData; break;
    }
  }

  if (!foundTeam) {
    return NextResponse.json({ type: 4, data: { content: `❌ Akses Ditolak: Perintah \`/check\` hanya untuk Private Channel tim.`, flags: 64 } });
  }

  const players = typeof foundTeam.players === 'string' ? JSON.parse(foundTeam.players) : foundTeam.players;
  let rosterText = ""; let verifiedCount = 0;

  players.forEach((p: any) => {
    const isVerified = !!p.discordId; 
    if (isVerified) verifiedCount++;
    rosterText += `${isVerified ? "✅" : "❌"} **${p.ign}** (\`@${p.discord}\`) - *${p.role}*\n`;
  });

  return NextResponse.json({
    type: 4, 
    data: {
      embeds: [{
        title: `🛡️ DATABASE TIM: ${foundTeam.namaTim.toUpperCase()}`,
        description: `**DAFTAR ROSTER:**\n${rosterText}`,
        color: foundTeam.warna ? parseInt(foundTeam.warna.replace('#', ''), 16) : 11146056,
        fields: [
          { name: "📌 Role Tim", value: foundTeam.discordRoleId || foundTeam.roleId ? `<@&${foundTeam.discordRoleId || foundTeam.roleId}>` : `*(Belum Ada)*`, inline: true },
          { name: "📊 Status", value: `**${verifiedCount} / ${players.length}** Terverifikasi`, inline: true }
        ],
        timestamp: new Date().toISOString()
      }]
    }
  });
}
