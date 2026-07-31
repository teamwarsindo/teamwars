import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI, hexToDecimal, getFooterText } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { createClosingReminderEmbed } from '@/lib/discord/messages/closingReminderEmbed';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function maskEmail(email: string) {
  if (!email) return '••••@••••.com';
  const [name, domain] = email.split('@');
  if (!domain) return '••••@••••.com';
  const maskedName = name.length > 2 ? name.slice(0, 2) + '••••' : name[0] + '••••';
  return `${maskedName}@${domain}`;
}

export async function POST(req: Request) {
  try {
    const { teamSlug } = await req.json();

    if (!teamSlug) {
      return NextResponse.json({ error: 'Slug tim wajib diisi.' }, { status: 400 });
    }

    const kvKey = `teams:${teamSlug}`;
    const [team, verifiedUsersData] = await Promise.all([
      kv.hgetall(kvKey),
      kv.hgetall('global:verified_users')
    ]);

    if (!team) {
      return NextResponse.json({ error: `Data tim '${teamSlug}' tidak ditemukan di Redis.` }, { status: 404 });
    }

    const verifiedMap = (verifiedUsersData as Record<string, string>) || {};
    const namaTim = (team.namaTim as string) || 'UNKNOWN';
    const warna = (team.warna as string) || '#00FFFF';
    const createdAt = (team.createdAt as string) || new Date().toISOString();
    const email = (team.email as string) || '';
    const logoTim = (team.logoTim as string) || (team.logo as string) || '';
    const buktiTransfer = (team.buktiTransfer as string) || '';
    const teamRoleId = (team.discordRoleId || team.roleId) as string;
    
    const players = typeof team.players === 'string' ? JSON.parse(team.players) : (team.players || []);

    // Channel & Embed IDs dari KV
    const textChannelId = team.discordChannelId as string;
    const voiceChannelId = team.discordVoiceChannelId as string;
    const categoryId = DISCORD_CONFIG.CT_TEAM_ID; // Fallback ke Kategori Tim di config

    const adminMsgId = team.adminMsgId as string;
    const rosterMsgId = team.rosterMsgId as string;
    const creativeMsgId = team.creativeMsgId as string;
    const financeMsgId = team.financeMsgId as string;
    const trackerMsgId = team.trackerMsgId as string;
    const editReminderMsgId = team.editReminderMsgId as string;

    const GUILD_ID = DISCORD_CONFIG.GUILD_ID;
    const hexDecimal = hexToDecimal(warna, 65535);

    // =========================================================================
    // 1. SINKRONISASI ROLE & CHANNEL DISCORD
    // =========================================================================

    // A. Update Role Tim (Nama & Warna)
    if (teamRoleId && GUILD_ID) {
      await discordAPI(`/guilds/${GUILD_ID}/roles/${teamRoleId}`, 'PATCH', {
        name: namaTim,
        color: hexDecimal,
      }).catch(err => console.error(`[Sync Role Failed] RoleId ${teamRoleId}:`, err));
      await sleep(300);
    }

    // B. Update Text Channel (Nama sesuai slug standar & Topic)
    if (textChannelId) {
      const cleanSlugName = teamSlug.toLowerCase().replace(/[^a-z0-9]/g, '-');
      await discordAPI(`/channels/${textChannelId}`, 'PATCH', {
        name: cleanSlugName,
        parent_id: categoryId,
        topic: `Official Text Channel for ${namaTim}`,
      }).catch(err => console.error(`[Sync Text Channel Failed] ChanId ${textChannelId}:`, err));
      await sleep(300);
    }

    // C. Update Voice Channel
    if (voiceChannelId) {
      await discordAPI(`/channels/${voiceChannelId}`, 'PATCH', {
        name: namaTim,
        parent_id: categoryId,
      }).catch(err => console.error(`[Sync Voice Channel Failed] VoiceId ${voiceChannelId}:`, err));
      await sleep(300);
    }

    // =========================================================================
    // 2. SINKRONISASI ROSTER PEMAIN, NICKNAME & ROLE MEMBER
    // =========================================================================
    let verifiedCount = 0;
    let trackerRosterText = "";
    let teamDataChanged = false;

    let ketuaObj = { ign: "-" };
    let wakilObj = { ign: "-" };
    const playerListArray: string[] = [];

    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      let currentDiscord = p.discord ? p.discord.replace(/^@/, '').trim() : '';
      const originalIgn = p.ign ? p.ign.trim() : '';
      const duelId = p.idDuelLinks || p.duelId || '';
      const roleJabatan = p.role || 'Anggota';
      let isUserVerified = false;

      // Filter Ketua / Wakil untuk Embed Roster
      if (roleJabatan === 'Ketua') ketuaObj = p;
      if (roleJabatan === 'Wakil Ketua' || roleJabatan === 'Wakil') wakilObj = p;
      playerListArray.push(`${originalIgn} (${duelId})`);

      if (originalIgn) await kv.sadd('global:ign', originalIgn);
      if (duelId) await kv.sadd('global:duellinks', duelId.toString().trim());

      if (currentDiscord) {
        const searchKeyDiscord = currentDiscord.toLowerCase();
        const knownUserId = verifiedMap[currentDiscord] || verifiedMap[searchKeyDiscord];
        let targetUserId = knownUserId;
        let memberData = null;

        try {
          if (knownUserId) {
            await sleep(400);
            memberData = await discordAPI(`/guilds/${GUILD_ID}/members/${knownUserId}`, 'GET');
            
            if (memberData && memberData.user) {
              const realDiscordUsername = memberData.user.username;
              if (realDiscordUsername.toLowerCase() !== searchKeyDiscord) {
                await kv.srem('global:discord', currentDiscord);
                await kv.hdel('global:verified_users', currentDiscord);
                await kv.hdel('global:verified_users', searchKeyDiscord);

                currentDiscord = realDiscordUsername;
                p.discord = realDiscordUsername;
                teamDataChanged = true;

                verifiedMap[realDiscordUsername] = knownUserId;
                verifiedMap[realDiscordUsername.toLowerCase()] = knownUserId;
                await kv.hset('global:verified_users', { [realDiscordUsername]: knownUserId });
              }
            }
          } else {
            await sleep(400);
            const searchRes = await discordAPI(`/guilds/${GUILD_ID}/members/search?query=${encodeURIComponent(currentDiscord)}&limit=5`, 'GET');
            memberData = searchRes?.find((m: any) => m.user.username.toLowerCase() === searchKeyDiscord);
            
            if (memberData) {
              targetUserId = memberData.user.id;
              await kv.hset('global:verified_users', { [currentDiscord]: targetUserId });
              await kv.sadd('global:discord_ids', targetUserId);
              verifiedMap[currentDiscord] = targetUserId;
              verifiedMap[searchKeyDiscord] = targetUserId;
            }
          }

          if (memberData && targetUserId) {
            await kv.sadd('global:discord', currentDiscord);
            const currentRoles = memberData.roles || [];
            const newRoles = new Set(currentRoles);

            const rolesToAdd = [];
            if (teamRoleId) rolesToAdd.push(teamRoleId);
            if (DISCORD_CONFIG.ROLE_DUELIST) rolesToAdd.push(DISCORD_CONFIG.ROLE_DUELIST);
            if (DISCORD_CONFIG.ROLE_VERIFIED) rolesToAdd.push(DISCORD_CONFIG.ROLE_VERIFIED);
            if (roleJabatan === 'Ketua' && DISCORD_CONFIG.ROLE_KETUA) rolesToAdd.push(DISCORD_CONFIG.ROLE_KETUA);
            else if ((roleJabatan === 'Wakil Ketua' || roleJabatan === 'Wakil') && DISCORD_CONFIG.ROLE_WAKIL) rolesToAdd.push(DISCORD_CONFIG.ROLE_WAKIL);

            rolesToAdd.forEach(r => newRoles.add(r));

            try {
              await discordAPI(`/guilds/${GUILD_ID}/members/${targetUserId}`, 'PATCH', { 
                nick: originalIgn,
                roles: Array.from(newRoles)
              });
              isUserVerified = true;
              verifiedCount++;
              await sleep(400); 
            } catch (bulkErr) {
              try {
                await discordAPI(`/guilds/${GUILD_ID}/members/${targetUserId}`, 'PATCH', { nick: originalIgn }).catch(() => null);
                for (const rId of rolesToAdd) {
                  await discordAPI(`/guilds/${GUILD_ID}/members/${targetUserId}/roles/${rId}`, 'PUT').catch(() => null);
                  await sleep(200);
                }
                isUserVerified = true;
                verifiedCount++;
              } catch(fallbackErr) {
                console.error(`Fallback Gagal untuk @${currentDiscord}:`, fallbackErr);
              }
            }
          }
        } catch (err) {
          console.error(`Gagal sinkronisasi user @${currentDiscord}:`, err);
        }
      }

      trackerRosterText += `${isUserVerified ? '✅' : '❌'} **${originalIgn}** (\`@${currentDiscord}\`) - *${roleJabatan}*\n`;
    }

    if (teamDataChanged) {
      await kv.hset(kvKey, { players: JSON.stringify(players) });
    }

    // =========================================================================
    // 3. SINKRONISASI ENAM (6) EMBED DISCORD SEKALIGUS
    // =========================================================================

    // A. Embed Tracker (Di Channel Khusus Tim)
    if (textChannelId && trackerMsgId) {
      const trackerPayload = {
        embeds: [{
          title: namaTim,
          description: `**DAFTAR ROSTER:**\n${trackerRosterText}`,
          color: hexDecimal,
          fields: [
            { name: "📌 Role Tim", value: teamRoleId ? `<@&${teamRoleId}>` : '*(Belum Ada)*', inline: true },
            { name: "📊 Status", value: `**${verifiedCount} / ${players.length}** Terverifikasi`, inline: true }
          ],
          footer: { text: getFooterText(createdAt) }
        }]
      };
      await discordAPI(`/channels/${textChannelId}/messages/${trackerMsgId}`, 'PATCH', trackerPayload).catch(() => {});
      await sleep(300);
    }

    // B. Embed Roster (Channel Roster Utama / Config)
    if (rosterMsgId) {
      const rosterChannel = DISCORD_CONFIG.CH_ROSTER;
      const rosterPayload = {
        embeds: [{
          title: namaTim,
          color: hexDecimal,
          thumbnail: { url: logoTim },
          fields: [
            { name: "Ketua", value: ketuaObj.ign || '-', inline: true },
            { name: "Wakil", value: wakilObj.ign || '-', inline: true },
            { name: "Players", value: playerListArray.join('\n') || '-', inline: false }
          ],
          footer: { text: getFooterText(createdAt) }
        }]
      };
      await discordAPI(`/channels/${rosterChannel}/messages/${rosterMsgId}`, 'PATCH', rosterPayload).catch(() => {});
      await sleep(300);
    }

    // C. Embed Creative (Channel Logo / Config)
    if (creativeMsgId) {
      const creativeChannel = DISCORD_CONFIG.CH_LOGO;
      
      let directDownloadLogo = logoTim;
      if (logoTim.includes('/upload/logo/')) {
        const splitUrl = logoTim.split('/upload/logo/');
        if (splitUrl.length > 1) {
          let filePath = splitUrl[1]; 
          if (filePath.includes('?')) filePath = filePath.split('?')[0];
          directDownloadLogo = `https://teamwars.web.id/logo/${filePath}/download`;
        }
      }

      const creativePayload = {
        content: `<@&${DISCORD_CONFIG.ROLE_CREATIVE}> 🎨 Aset Tim Baru: **${namaTim}**!`, 
        embeds: [{
          title: `Aset Visual: ${namaTim}`,
          color: hexDecimal,
          description: `**[⬇️ KLIK DISINI UNTUK DOWNLOAD LOGO MENTAH](${directDownloadLogo})**`,
          image: { url: logoTim },
          fields: [
            { name: "Kode Warna (Hex)", value: `\`${warna}\``, inline: true }
          ]
        }]
      };
      await discordAPI(`/channels/${creativeChannel}/messages/${creativeMsgId}`, 'PATCH', creativePayload).catch(() => {});
      await sleep(300);
    }

    // D. Embed Finance (Channel Bukti / Config)
    if (financeMsgId) {
      const financeChannel = DISCORD_CONFIG.CH_BUKTI;
      const financePayload = {
        content: `<@&${DISCORD_CONFIG.ROLE_FINANCE}> 💰 Setoran Masuk dari **${namaTim}**!`, 
        embeds: [{
          title: `Detail Registrasi: ${namaTim}`,
          color: hexDecimal,
          description: `**[✅ KLIK DISINI UNTUK KONFIRMASI PEMBAYARAN](https://teamwars.web.id/api/approve?team=${teamSlug})**\n*(Link akan membuka browser & mengirim email sukses ke peserta)*`,
          image: { url: buktiTransfer },
          fields: [
            { name: "Status", value: "🟢 Sinkron/Approved", inline: true }
          ],
        }]
      };
      await discordAPI(`/channels/${financeChannel}/messages/${financeMsgId}`, 'PATCH', financePayload).catch(() => {});
      await sleep(300);
    }

    // E. Embed Admin Review (Jika Ada)
    if (adminMsgId) {
      const adminChannel = DISCORD_CONFIG.CH_LOG;
      const adminPayload = {
        embeds: [{
          title: `🛡️ AUDIT ADMIN: ${namaTim}`,
          color: hexDecimal,
          thumbnail: { url: logoTim },
          fields: [
            { name: "Team Slug", value: `\`${teamSlug}\``, inline: true },
            { name: "Registered Email", value: maskEmail(email), inline: true },
            { name: "Role Mention", value: teamRoleId ? `<@&${teamRoleId}>` : '-', inline: true },
            { name: "Total Roster", value: `${players.length} Pemain`, inline: true }
          ],
          footer: { text: `Audit Engine Auto-Sync • ${getFooterText(createdAt)}` }
        }]
      };
      await discordAPI(`/channels/${adminChannel}/messages/${adminMsgId}`, 'PATCH', adminPayload).catch(() => {});
      await sleep(300);
    }

    // F. Embed Closing Edit Reminder (Jika Ada)
    if (textChannelId && editReminderMsgId) {
      const reminderPayload = createClosingReminderEmbed({
        roleMentionId: teamRoleId,
        namaTim: namaTim,
        email: email,
        sisaWaktuText: "Pendaftaran Dikunci / Ter-sinkronkan",
        hexWarna: warna
      });
      await discordAPI(`/channels/${textChannelId}/messages/${editReminderMsgId}`, 'PATCH', reminderPayload).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: `Sinkronisasi Total (Role, Text/Voice Channel, Roster, & 6 Embed Discord) untuk Tim "${namaTim}" Berhasil!`
    });

  } catch (error: any) {
    console.error('Error Sync Engine:', error);
    return NextResponse.json({ error: 'Gagal melakukan sinkronisasi tim.' }, { status: 500 });
  }
}
