import { NextResponse, NextRequest } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI, hexToDecimal, getFooterText } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, namaTim, warna, logoTim, buktiTransfer, players, key } = body;

    // 🔑 Deteksi Mode Admin
    const urlKey = request.nextUrl.searchParams.get('key');
    const isAdminKey = (key === '470212070957252618') || (urlKey === '470212070957252618');

    if (!token) {
      return NextResponse.json({ error: 'Token tidak valid' }, { status: 400 });
    }

    // 1. Validasi Token & Ambil Data Tim
    const teamSlug = await kv.get(`token:map:${token}`);
    if (!teamSlug) {
      return NextResponse.json({ error: 'Tim tidak ditemukan' }, { status: 404 });
    }

    const [oldTeamData, verifiedUsersMap] = await Promise.all([
      kv.hgetall(`teams:${teamSlug}`),
      kv.hgetall('global:verified_users'),
    ]);

    if (!oldTeamData) {
      return NextResponse.json({ error: 'Data tim tidak ditemukan' }, { status: 404 });
    }

    // 🛑 Validasi Tambahan: Jika Nama Tim Diubah saat Edit, Cek Bentrok Nama Tim Lain
    const newTeamSlug = namaTim.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    if (newTeamSlug !== teamSlug) {
      const isExist = await kv.sismember("global:teams", newTeamSlug);
      if (isExist) {
        return NextResponse.json({ error: `Nama tim "${namaTim}" sudah digunakan oleh tim lain!` }, { status: 400 });
      }
      // Update indeks global nama tim jika berganti nama
      await kv.srem("global:teams", teamSlug);
      await kv.sadd("global:teams", newTeamSlug);
      await kv.set(`token:map:${token}`, newTeamSlug);
    }

    const targetSlug = newTeamSlug; // Pakai slug baru jika berubah, atau slug lama jika tetap

    const verifiedMap = (verifiedUsersMap as Record<string, string>) || {};
    const oldPlayers = typeof oldTeamData.players === 'string'
      ? JSON.parse(oldTeamData.players)
      : (oldTeamData.players || []);

    // 2. Peringatan Status Verifikasi Discord (TIDAK MEMBLOKIR PENYIMPANAN)
    const warnings: string[] = [];

    for (let i = 0; i < players.length; i++) {
      const newPlayer = players[i];
      const oldPlayer = oldPlayers[i];

      const newDiscord = newPlayer.discord ? newPlayer.discord.toLowerCase().replace(/^@/, '').trim() : '';
      const oldDiscord = oldPlayer?.discord ? oldPlayer.discord.toLowerCase().replace(/^@/, '').trim() : '';

      if (newDiscord) {
        const isNewVerified = verifiedMap.hasOwnProperty(newDiscord);
        if (!isNewVerified) {
          warnings.push(`Pemain ${newPlayer.ign} (@${newPlayer.discord}) belum terverifikasi di Discord TWI.`);
        }
      }
    }

    if (warnings.length > 0) {
      console.warn('⚠️ Peringatan Edit Tim:', warnings.join(' | '));
    }

    // 3. Update Nickname Discord Server (Jika IGN berubah di Web & Terverifikasi)
    for (let i = 0; i < players.length; i++) {
      const newPlayer = players[i];
      const oldPlayer = oldPlayers[i];
      const playerDiscord = newPlayer.discord ? newPlayer.discord.toLowerCase().replace(/^@/, '').trim() : '';
      const discordId = verifiedMap[playerDiscord];

      if (discordId && oldPlayer && oldPlayer.ign !== newPlayer.ign) {
        try {
          await discordAPI(
            `/guilds/${DISCORD_CONFIG.GUILD_ID}/members/${discordId}`,
            'PATCH',
            { nick: newPlayer.ign }
          );
        } catch (nickErr) {
          console.error(`Gagal update nickname untuk @${newPlayer.discord}:`, nickErr);
        }
      }
    }

    // 4. Sinkronisasi Data Global / Cleanup
    const getCleanDiscord = (p: any) => p?.discord?.toLowerCase().replace(/^@/, '').trim();
    const getCleanIgn = (p: any) => p?.ign?.toLowerCase().trim();
    const getCleanDuelLinks = (p: any) => (p?.idDuelLinks || p?.duelId);

    const oldDiscords = new Set(oldPlayers.map(getCleanDiscord).filter(Boolean));
    const oldIgns = new Set(oldPlayers.map(getCleanIgn).filter(Boolean));
    const oldDuelLinks = new Set(oldPlayers.map(getCleanDuelLinks).filter(Boolean));

    const newDiscords = new Set(players.map(getCleanDiscord).filter(Boolean));
    const newIgns = new Set(players.map(getCleanIgn).filter(Boolean));
    const newDuelLinks = new Set(players.map(getCleanDuelLinks).filter(Boolean));

    // 4A. Hapus data lama yang diganti
    const discordsToRemove = [...oldDiscords].filter(d => !newDiscords.has(d));
    const ignsToRemove = [...oldIgns].filter(i => !newIgns.has(i));
    const duelLinksToRemove = [...oldDuelLinks].filter(dl => !newDuelLinks.has(dl));

    if (discordsToRemove.length) await kv.srem('global:discord', ...discordsToRemove);
    if (ignsToRemove.length) await kv.srem('global:ign', ...ignsToRemove);
    if (duelLinksToRemove.length) await kv.srem('global:duellinks', ...duelLinksToRemove);

    // 4B. Tambah data baru yang masuk
    const discordsToAdd = [...newDiscords].filter(d => !oldDiscords.has(d));
    const ignsToAdd = [...newIgns].filter(i => !oldIgns.has(i));
    const duelLinksToAdd = [...newDuelLinks].filter(dl => !oldDuelLinks.has(dl));

    if (discordsToAdd.length) await kv.sadd('global:discord', ...discordsToAdd);
    if (ignsToAdd.length) await kv.sadd('global:ign', ...ignsToAdd);
    if (duelLinksToAdd.length) await kv.sadd('global:duellinks', ...duelLinksToAdd);

    // 5. Update Data Utama di KV Redis
    const createdAt = oldTeamData.createdAt as string;
    const updatedAt = new Date().toISOString(); 
    
    const updatedTeamObj = {
      ...oldTeamData,
      namaTim,
      warna,
      logoTim: logoTim || oldTeamData.logoTim,
      buktiTransfer: buktiTransfer || oldTeamData.buktiTransfer,
      players: JSON.stringify(players),
      updatedAt: updatedAt,
    };

    // Jika ganti slug nama tim, hapus key lama
    if (newTeamSlug !== teamSlug) {
      await kv.del(`teams:${teamSlug}`);
    }

    await kv.hset(`teams:${targetSlug}`, updatedTeamObj);

    // 6. Update Embeds Discord (Roster, Tracker, Creative)
    const rosterMessageId = oldTeamData.adminMsgId as string;
    const trackerChannelId = oldTeamData.discordChannelId as string;
    const trackerMessageId = oldTeamData.trackerMsgId as string;
    const teamRoleId = oldTeamData.discordRoleId || oldTeamData.roleId;
    
    const creativeMsgId = oldTeamData.creativeMsgId as string; 
    const creativeChannelId = oldTeamData.creativeChannelId || DISCORD_CONFIG.CH_LOGO;

    // 6A. Update Embed Roster
    if (rosterMessageId) {
      const ketua = players.find((p: any) => p.role === "Ketua") || { ign: "-", idDuelLinks: "-" };
      const wakil = players.find((p: any) => p.role === "Wakil Ketua") || { ign: "-", idDuelLinks: "-" };
      
      let playerListString = "";
      players.forEach((p: any) => {
        playerListString += `${p.ign} (${p.idDuelLinks || p.duelId})\n`;
      });
      
      const rosterPayload = {
        embeds: [{
          title: namaTim,
          color: hexToDecimal(warna),
          thumbnail: { url: logoTim || oldTeamData.logoTim },
          fields: [
            { name: "Ketua", value: ketua.ign, inline: true },
            { name: "Wakil", value: wakil.ign, inline: true },
            { name: "Players", value: playerListString, inline: false }
          ],
          footer: { text: getFooterText(createdAt, updatedAt) }
        }]
      };

      discordAPI(`/channels/${DISCORD_CONFIG.CH_ROSTER}/messages/${rosterMessageId}`, 'PATCH', rosterPayload)
        .catch(err => console.error('Gagal update roster embed message:', err));
    }

    // 6B. Update Embed Tracker (Otomatis menampilkan Tanda ❌ jika belum terverifikasi)
    if (trackerChannelId && trackerMessageId) {
      let verifiedCount = 0;
      let rosterText = "";

      players.forEach((p: any) => {
        const pDiscord = p.discord ? p.discord.toLowerCase().replace(/^@/, '').trim() : '';
        const isVerified = verifiedMap.hasOwnProperty(pDiscord);

        if (isVerified) verifiedCount++;

        const icon = isVerified ? '✅' : '❌';
        rosterText += `${icon} ${p.ign} (@${p.discord}) - ${p.role}\n`;
      });
      
      const trackerPayload = {
        embeds: [{
          title: namaTim,
          description: `DAFTAR ROSTER:\n${rosterText}`,
          color: hexToDecimal(warna),
          fields: [
            { name: "📌 Role Tim", value: teamRoleId ? `<@&${teamRoleId}>` : '(Belum Ada)', inline: true },
            { name: "📊 Status", value: `${verifiedCount} / ${players.length} Terverifikasi`, inline: true }
          ],
          footer: { text: getFooterText(createdAt, updatedAt) }
        }]
      };

      discordAPI(`/channels/${trackerChannelId}/messages/${trackerMessageId}`, 'PATCH', trackerPayload)
        .catch(err => console.error('Gagal update tracker message:', err));
    }

    // 6C. Update Warna Role Tim
    if (teamRoleId && warna && warna !== oldTeamData.warna) {
      discordAPI(
        `/guilds/${DISCORD_CONFIG.GUILD_ID}/roles/${teamRoleId}`,
        'PATCH',
        { color: hexToDecimal(warna) }
      ).catch(err => console.error(`Gagal update warna role ${teamRoleId}:`, err));
    }

    // 6D. Update Pesan Creative
    if (creativeMsgId && warna && warna !== oldTeamData.warna) {
      const currentLogo = logoTim || oldTeamData.logoTim;
      let directDownloadLogo = currentLogo;
      
      if (currentLogo && currentLogo.includes('/upload/logo/')) {
        const splitUrl = currentLogo.split('/upload/logo/');
        if (splitUrl.length > 1) {
          directDownloadLogo = `https://teamwars.web.id/logo/${splitUrl[1]}/download`;
        }
      }

      const creativePayload = {
        embeds: [{
          title: `Aset Visual: ${namaTim}`,
          color: hexToDecimal(warna),
          description: `**[⬇️ KLIK DISINI UNTUK DOWNLOAD LOGO MENTAH](${directDownloadLogo})**`,
          image: { url: currentLogo },
          fields: [
            { name: "Kode Warna (Hex)", value: `\`${warna}\``, inline: true }
          ]
        }]
      };

      discordAPI(`/channels/${creativeChannelId}/messages/${creativeMsgId}`, 'PATCH', creativePayload)
        .catch(err => console.error('Gagal update pesan creative:', err));
    }

    // 7. Berikan Respons Berhasil (Plus catatan warning jika ada)
    return NextResponse.json({
      success: true,
      message: 'Data tim berhasil diperbarui!',
      warnings: warnings.length > 0 ? warnings : undefined,
    });

  } catch (error) {
    console.error('Error Edit Team API:', error);
    return NextResponse.json({ error: 'Gagal memperbarui data tim' }, { status: 500 });
  }
      }
        
