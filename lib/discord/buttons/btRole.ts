import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI, hexToDecimal } from '../utils';
import { DISCORD_CONFIG } from '../config';

export async function handleBtRole(body: any) {
  const { guild_id: guildId, member: { user: { id: userId, username: rawUsername }, roles: currentRoles } } = body;
  const username = rawUsername.toLowerCase();
  
  let foundTeam: any = null, foundPlayer: any = null, foundTeamSlug: string | null = null;
  const allTeamSlugs = await kv.smembers('global:teams');
  
  for (const slug of allTeamSlugs) {
    const teamData: any = await kv.hgetall(`teams:${slug}`);
    if (!teamData || !teamData.players) continue;
    const players = typeof teamData.players === 'string' ? JSON.parse(teamData.players) : teamData.players;
    const playerMatch = players.find((p: any) => p.discord.trim().toLowerCase() === username);
    if (playerMatch) { 
      foundTeam = teamData; 
      foundPlayer = playerMatch; 
      foundTeamSlug = slug; 
      break; 
    }
  }

  if (!foundTeam) {
    return NextResponse.json({ type: 4, data: { content: `🔍 **Data Tidak Ditemukan**: Username **@${username}** tidak terdaftar.`, flags: 64 } });
  }

  const rolesToAssign = [DISCORD_CONFIG.ROLE_DUELIST];
  if (foundPlayer.role === 'Ketua') rolesToAssign.push(DISCORD_CONFIG.ROLE_KETUA);
  if (foundPlayer.role === 'Wakil Ketua') rolesToAssign.push(DISCORD_CONFIG.ROLE_WAKIL);
  if (foundTeam.roleId) rolesToAssign.push(foundTeam.roleId);
  if (foundTeam.discordRoleId) rolesToAssign.push(foundTeam.discordRoleId);

  if (rolesToAssign.every(r => currentRoles.includes(r))) {
    return NextResponse.json({ type: 4, data: { content: `⚠️ **STATUS: SUDAH TERVERIFIKASI**. Silakan cek private channel tim Anda.`, flags: 64 } });
  }

  const apiPromises = rolesToAssign.map(rId => discordAPI(`/guilds/${guildId}/members/${userId}/roles/${rId}`, 'PUT'));
  apiPromises.push(discordAPI(`/guilds/${guildId}/members/${userId}`, 'PATCH', { nick: `${foundPlayer.ign}` }));
  
  apiPromises.push(discordAPI(`/channels/${DISCORD_CONFIG.CH_LOG}/messages`, 'POST', {
    embeds: [{
      title: "✅ Log Verifikasi Role Tim",
      color: hexToDecimal('#57F287'),
      fields: [
        { name: "👤 User", value: `<@${userId}>\n(\`@${username}\`)`, inline: true },
        { name: "🎮 IGN & Jabatan", value: `**${foundPlayer.ign}**\n*${foundPlayer.role}*`, inline: true },
        { name: "🏆 Tim", value: `**${foundTeam.namaTim}**`, inline: true }
      ],
      timestamp: new Date().toISOString()
    }]
  }));

  await Promise.allSettled(apiPromises);

  if (foundTeamSlug) {
    try {
      const freshTeamData: any = await kv.hgetall(`teams:${foundTeamSlug}`);
      if (!freshTeamData || !freshTeamData.players) throw new Error("Data tim tidak ditemukan saat save");
      
      let freshPlayers = typeof freshTeamData.players === 'string' 
        ? JSON.parse(freshTeamData.players) 
        : freshTeamData.players;

      const pIdx = freshPlayers.findIndex((p: any) => p.discord.trim().toLowerCase() === username);
      
      if (pIdx > -1) {
        freshPlayers[pIdx].discordId = userId;
        await kv.hset(`teams:${foundTeamSlug}`, { players: JSON.stringify(freshPlayers) });
        await kv.hset('global:discord_map', { [userId]: foundTeamSlug });

        if (foundTeam.trackerMsgId && foundTeam.discordChannelId) {
          let verifiedCount = 0;
          let rosterText = "";
          
          freshPlayers.forEach((p: any) => {
            const statusIcon = p.discordId ? '✅' : '❌';
            if (p.discordId) verifiedCount++;
            rosterText += `${statusIcon} **${p.ign}** (\`@${p.discord}\`) - *${p.role}*\n`;
          });

          const now = new Date();
          const dateFormatter = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
          const timeFormatter = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' });

          const trackerEmbed = {
            title: `🛡️ DATABASE TIM: ${foundTeam.namaTim.toUpperCase()}`,
            description: `**DAFTAR ROSTER:**\n${rosterText}`,
            color: hexToDecimal(foundTeam.warna),
            fields: [
              { name: "📌 Role Tim", value: foundTeam.discordRoleId ? `<@&${foundTeam.discordRoleId}>` : `*(Belum Ada)*`, inline: true },
              { name: "📊 Status", value: `**${verifiedCount} / ${freshPlayers.length}** Terverifikasi`, inline: true }
            ],
            footer: { text: `Diperbarui pada ${dateFormatter.format(now)} pukul ${timeFormatter.format(now).replace(':', '.')} WIB` }
          };

          await discordAPI(`/channels/${foundTeam.discordChannelId}/messages/${foundTeam.trackerMsgId}`, 'PATCH', {
            embeds: [trackerEmbed]
          });
        }
      }
    } catch (e) {
      console.error("Gagal memperbarui data KV atau Tracker Message:", e);
    }
  }

  return NextResponse.json({ type: 4, data: { content: `✅ **AUTENTIKASI BERHASIL** Anda resmi masuk ke roster **${foundTeam.namaTim}**.`, flags: 64 } });
                                               }
