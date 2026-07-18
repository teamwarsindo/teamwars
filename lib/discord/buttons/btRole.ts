import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI } from '../utils';
import { DISCORD_CONFIG } from '../config';

export async function handleBtRole(body: any) {
  const { guild_id: guildId, member: { user: { id: userId, username: rawUsername }, roles: currentRoles } } = body;
  const username = rawUsername.toLowerCase();
  
  let foundTeam: any = null, foundPlayer: any = null, foundTeamSlug: string | null = null, currentPlayersArray: any[] = [];
  const allTeamSlugs = await kv.smembers('global:teams');
  
  for (const slug of allTeamSlugs) {
    const teamData: any = await kv.hgetall(`teams:${slug}`);
    if (!teamData || !teamData.players) continue;
    const players = typeof teamData.players === 'string' ? JSON.parse(teamData.players) : teamData.players;
    const playerMatch = players.find((p: any) => p.discord.trim().toLowerCase() === username);
    if (playerMatch) { foundTeam = teamData; foundPlayer = playerMatch; foundTeamSlug = slug; currentPlayersArray = players; break; }
  }

  if (!foundTeam) return NextResponse.json({ type: 4, data: { content: `🔍 **Data Tidak Ditemukan**: Username **@${username}** tidak terdaftar.`, flags: 64 } });

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
  
  // LOG HIJAU (Verifikasi Role)
  apiPromises.push(discordAPI(`/channels/${DISCORD_CONFIG.CH_LOG}/messages`, 'POST', {
    embeds: [{
      title: "✅ Log Verifikasi Role Tim",
      color: 5763719, // Hijau #57F287
      fields: [
        { name: "👤 User", value: `<@${userId}>\n(\`@${username}\`)`, inline: true },
        { name: "🎮 IGN & Jabatan", value: `**${foundPlayer.ign}**\n*${foundPlayer.role}*`, inline: true },
        { name: "🏆 Tim", value: `**${foundTeam.namaTim}**`, inline: true }
      ],
      timestamp: new Date().toISOString()
    }]
  }));

  await Promise.allSettled(apiPromises);

  // PROSES PENYIMPANAN KE DATABASE (Vercel KV) DAN UPDATE TRACKER
  if (foundTeamSlug) {
    try {
      // 1. TARIK DATA PALING FRESH SEBELUM SAVE (Mencegah Overwrite / Race Condition)
      const freshTeamData: any = await kv.hgetall(`teams:${foundTeamSlug}`);
      if (!freshTeamData || !freshTeamData.players) throw new Error("Data tim tidak ditemukan saat save");
      
      let freshPlayers = typeof freshTeamData.players === 'string' 
        ? JSON.parse(freshTeamData.players) 
        : freshTeamData.players;

      const pIdx = freshPlayers.findIndex((p: any) => p.discord.trim().toLowerCase() === username);
      
      if (pIdx > -1) {
        // 2. INSERT ID USER YANG KLIK (Data teman yang lain dipastikan aman dan tidak kerest)
        freshPlayers[pIdx].discordId = userId;
        
        // 3. SAVE DATA TERBARU
        await kv.hset(`teams:${foundTeamSlug}`, { players: JSON.stringify(freshPlayers) });
        await kv.hset('global:discord_map', { [userId]: foundTeamSlug });

        // 4. AUTO-UPDATE TRACKER MESSAGE MENGGUNAKAN DATA FRESH
        if (foundTeam.trackerMsgId && foundTeam.discordChannelId) {
          let verifiedCount = 0;
          let rosterText = "";
          
          freshPlayers.forEach((p: any) => {
            const statusIcon = p.discordId ? '✅' : '❌';
            if (p.discordId) verifiedCount++;
            rosterText += `${statusIcon} **${p.ign}** (\`@${p.discord}\`) - *${p.role}*\n`;
          });

          const decimalColor = foundTeam.warna ? parseInt(foundTeam.warna.replace('#', ''), 16) : 11146056;

          const now = new Date();
          const dateFormatter = new Intl.DateTimeFormat('id-ID', { 
            day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' 
          });
          const timeFormatter = new Intl.DateTimeFormat('id-ID', { 
            hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' 
          });

          const dateStr = dateFormatter.format(now);
          const timeStr = timeFormatter.format(now).replace(':', '.'); 
          const footerText = `Diperbarui pada ${dateStr} pukul ${timeStr} WIB`;
        
          const trackerEmbed = {
            title: `🛡️ DATABASE TIM: ${foundTeam.namaTim.toUpperCase()}`,
            description: `**DAFTAR ROSTER:**\n${rosterText}`,
            color: decimalColor,
            fields: [
              { name: "📌 Role Tim", value: foundTeam.discordRoleId ? `<@&${foundTeam.discordRoleId}>` : `*(Belum Ada)*`, inline: true },
              { name: "📊 Status", value: `**${verifiedCount} / ${freshPlayers.length}** Terverifikasi`, inline: true }
            ],
            footer: { text: footerText }
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
  
