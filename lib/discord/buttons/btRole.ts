import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI, hexToDecimal } from '../utils';
import { DISCORD_CONFIG } from '../config';

export async function handleBtRole(body: any) {
  const { guild_id: guildId, member: { user: { id: userId, username: rawUsername }, roles: currentRoles } } = body;
  const username = rawUsername.toLowerCase().trim();
  
  let foundTeam: any = null, foundPlayer: any = null, foundTeamSlug: string | null = null;
  const allTeamSlugs = await kv.smembers('global:teams');
  
  // 🔥 FIX 1: Fetch SEMUA tim secara paralel untuk menghindari Timeout 3 detik Discord
  const allTeamDatas = await Promise.all(
    allTeamSlugs.map(async (slug) => {
      const data = await kv.hgetall(`teams:${slug}`);
      return { slug, data };
    })
  );
  
  for (const { slug, data: teamData } of allTeamDatas) {
    if (!teamData || !teamData.players) continue;
    
    const players = typeof teamData.players === 'string' ? JSON.parse(teamData.players) : teamData.players;
    
    // 🔥 FIX 2: Cek keamanan tambahan, berjaga-jaga jika ada user yang mengetik @ di form web
    const playerMatch = players.find((p: any) => 
      (p.discord?.trim().toLowerCase().replace(/^@/, '')) === username.replace(/^@/, '')
    );
    
    if (playerMatch) { 
      foundTeam = teamData; 
      foundPlayer = playerMatch; 
      foundTeamSlug = slug;
      foundTeam.parsedPlayers = players; // Simpan cache player agar tidak perlu parse ulang di bawah
      break; 
    }
  }

  if (!foundTeam) {
    return NextResponse.json({ type: 4, data: { content: `🔍 **Data Tidak Ditemukan**: Username **@${username}** tidak terdaftar di database tim manapun.`, flags: 64 } });
  }

  const rolesToAssign = [DISCORD_CONFIG.ROLE_DUELIST];
  if (foundPlayer.role === 'Ketua') rolesToAssign.push(DISCORD_CONFIG.ROLE_KETUA);
  if (foundPlayer.role === 'Wakil Ketua') rolesToAssign.push(DISCORD_CONFIG.ROLE_WAKIL);
  if (foundTeam.roleId) rolesToAssign.push(foundTeam.roleId);
  if (foundTeam.discordRoleId) rolesToAssign.push(foundTeam.discordRoleId);

  // Hanya proses penambahan role yang belum dimiliki user
  const rolesToActuallyAssign = rolesToAssign.filter(r => !currentRoles.includes(r));

  if (rolesToActuallyAssign.length === 0 && currentRoles.includes(DISCORD_CONFIG.ROLE_DUELIST)) {
    return NextResponse.json({ type: 4, data: { content: `⚠️ **STATUS: SUDAH TERVERIFIKASI**. Silakan cek private channel tim Anda.`, flags: 64 } });
  }

  // Siapkan semua API Request dalam satu jalur paralel
  const apiPromises = rolesToActuallyAssign.map(rId => discordAPI(`/guilds/${guildId}/members/${userId}/roles/${rId}`, 'PUT'));
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

  // Masukkan pembaruan map DB global bersamaan dengan request Discord
  apiPromises.push(kv.hset('global:verified_users', { [username]: userId }));

  await Promise.allSettled(apiPromises);

  // 🔥 FIX 3: Update Tracker tanpa perlu fetch KV teams lagi (menggunakan data yang sudah ada di memory)
  if (foundTeamSlug && foundTeam.trackerMsgId && foundTeam.discordChannelId) {
    try {
      const verifiedMap = (await kv.hgetall('global:verified_users')) || {};
      let verifiedCount = 0;
      let rosterText = "";
      
      foundTeam.parsedPlayers.forEach((p: any) => {
        const pDiscord = p.discord?.toLowerCase().trim().replace(/^@/, '') || "";
        const isVerified = !!verifiedMap[pDiscord];
        if (isVerified) verifiedCount++;
        const statusIcon = isVerified ? '✅' : '❌';
        rosterText += `${statusIcon} **${p.ign}** (\`@${p.discord}\`) - *${p.role}*\n`;
      });

      const now = new Date();
      const dateFormatter = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
      const timeFormatter = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' });

      await discordAPI(`/channels/${foundTeam.discordChannelId}/messages/${foundTeam.trackerMsgId}`, 'PATCH', {
        embeds: [{
          title: `🛡️ DATABASE TIM: ${foundTeam.namaTim.toUpperCase()}`,
          description: `**DAFTAR ROSTER:**\n${rosterText}`,
          color: hexToDecimal(foundTeam.warna),
          fields: [
            { name: "📌 Role Tim", value: foundTeam.discordRoleId ? `<@&${foundTeam.discordRoleId}>` : `*(Belum Ada)*`, inline: true },
            { name: "📊 Status", value: `**${verifiedCount} / ${foundTeam.parsedPlayers.length}** Terverifikasi`, inline: true }
          ],
          footer: { text: `Diperbarui pada ${dateFormatter.format(now)} pukul ${timeFormatter.format(now).replace(':', '.')} WIB` }
        }]
      });
    } catch (e) {
      console.error("Gagal memperbarui Tracker Message:", e);
    }
  }

  return NextResponse.json({ type: 4, data: { content: `✅ **AUTENTIKASI BERHASIL** Anda resmi masuk ke roster **${foundTeam.namaTim}**.`, flags: 64 } });
                                                }
        
