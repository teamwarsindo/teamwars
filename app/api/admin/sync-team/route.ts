import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI, hexToDecimal, getFooterText } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';

export async function POST(req: Request) {
  try {
    const { teamSlug } = await req.json();

    const [team, verifiedUsersMap] = await Promise.all([
      kv.hgetall(`teams:${teamSlug}`),
      kv.hgetall('global:verified_users')
    ]);

    if (!team) return NextResponse.json({ error: 'Tim tidak ditemukan.' }, { status: 404 });

    const verifiedMap = (verifiedUsersMap as Record<string, string>) || {};
    const players = typeof team.players === 'string' ? JSON.parse(team.players) : (team.players || []);
    
    const namaTim = team.namaTim as string;
    const warna = team.warna as string;
    const logoTim = team.logoTim as string;
    const createdAt = team.createdAt as string;
    const updatedAt = team.updatedAt as string;

    // 1. SYNC EMBED ROSTER
    if (team.adminMsgId) {
      const ketua = players.find((p: any) => p.role?.toLowerCase() === 'ketua') || players[0];
      const wakil = players.find((p: any) => p.role?.toLowerCase() === 'wakil') || players[1];
      
      let playerListString = "";
      players.forEach((p: any) => { playerListString += `${p.ign} (${p.idDuelLinks})\n`; });
      
      const rosterPayload = {
        embeds: [{
          title: namaTim,
          color: hexToDecimal(warna),
          thumbnail: { url: logoTim },
          fields: [
            { name: "Ketua", value: ketua?.ign || '-', inline: true },
            { name: "Wakil", value: wakil?.ign || '-', inline: true },
            { name: "Players", value: playerListString || '-', inline: false }
          ],
          footer: { text: getFooterText(createdAt, updatedAt) }
        }]
      };
      await discordAPI(`/channels/${DISCORD_CONFIG.CH_ROSTER}/messages/${team.adminMsgId}`, 'PATCH', rosterPayload).catch(console.error);
    }

    // 2. SYNC EMBED TRACKER
    if (team.discordChannelId && team.trackerMsgId) {
      let verifiedCount = 0;
      let rosterText = "";

      players.forEach((p: any) => {
        const isVerified = verifiedMap.hasOwnProperty(p.discord?.toLowerCase().replace(/^@/, '').trim());
        if (isVerified) verifiedCount++;
        rosterText += `${isVerified ? '✅' : '❌'} ${p.ign} (@${p.discord}) - ${p.role}\n`;
      });

      const roleId = team.discordRoleId || team.roleId;
      const trackerPayload = {
        embeds: [{
          title: namaTim,
          description: `DAFTAR ROSTER:\n${rosterText}`,
          color: hexToDecimal(warna),
          fields: [
            { name: "📌 Role Tim", value: roleId ? `<@&${roleId}>` : '(Belum Ada)', inline: true },
            { name: "📊 Status", value: `${verifiedCount} / ${players.length} Terverifikasi`, inline: true }
          ],
          footer: { text: getFooterText(createdAt, updatedAt) }
        }]
      };
      await discordAPI(`/channels/${team.discordChannelId}/messages/${team.trackerMsgId}`, 'PATCH', trackerPayload).catch(console.error);
    }

    return NextResponse.json({ success: true, message: 'Sinkronisasi Discord berhasil!' });
  } catch (error: any) {
    console.error('Sync Error:', error);
    return NextResponse.json({ error: 'Gagal melakukan sinkronisasi.' }, { status: 500 });
  }
                                                                                   }
                   
