import { NextResponse, NextRequest } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI, hexToDecimal, getFooterText } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, namaTim, warna, logoTim, buktiTransfer, players } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token tidak valid' }, { status: 400 });
    }

    // 1. Cari slug tim berdasarkan token
    const teamSlug = await kv.get(`token:map:${token}`);
    if (!teamSlug) {
      return NextResponse.json({ error: 'Tim tidak ditemukan' }, { status: 404 });
    }

    // 2. Fetch data tim lama & map verified users dari Redis
    const [oldTeamData, verifiedUsersMap] = await Promise.all([
      kv.hgetall(`teams:${teamSlug}`),
      kv.hgetall('global:verified_users'),
    ]);

    if (!oldTeamData) {
      return NextResponse.json({ error: 'Data tim tidak ditemukan' }, { status: 404 });
    }

    const verifiedMap = (verifiedUsersMap as Record<string, string>) || {};
    const oldPlayers = typeof oldTeamData.players === 'string'
      ? JSON.parse(oldTeamData.players)
      : (oldTeamData.players || []);

    // =========================================================================
    // BUG FIX 4: VALIDASI SENSITIF USERNAME DISCORD
    // =========================================================================
    for (let i = 0; i < players.length; i++) {
      const newPlayer = players[i];
      const oldPlayer = oldPlayers[i];

      const newDiscord = newPlayer.discord ? newPlayer.discord.toLowerCase().trim() : '';
      const oldDiscord = oldPlayer?.discord ? oldPlayer.discord.toLowerCase().trim() : '';

      // Jika user mengedit username Discord yang sebelumnya sudah terverifikasi
      if (oldDiscord && newDiscord !== oldDiscord) {
        const isOldVerified = verifiedMap.hasOwnProperty(oldDiscord);
        const isNewVerified = verifiedMap.hasOwnProperty(newDiscord);

        // Cek kalau akun lamanya "Verified" tapi diedit jadi akun yang "Salah / Belum Verified"
        if (isOldVerified && !isNewVerified) {
          return NextResponse.json(
            {
              error: `Username Discord "@${newPlayer.discord}" untuk pemain ${newPlayer.ign} belum terverifikasi di server Discord TWI. Pastikan username sudah sesuai!`
            },
            { status: 400 }
          );
        }
      }
    }

    // =========================================================================
    // BUG FIX 3: UPDATE DISPLAY NAME DISCORD (NICKNAME) JIKA IGN BERUBAH
    // =========================================================================
    for (let i = 0; i < players.length; i++) {
      const newPlayer = players[i];
      const oldPlayer = oldPlayers[i];
      const playerDiscord = newPlayer.discord ? newPlayer.discord.toLowerCase().trim() : '';

      const discordId = verifiedMap[playerDiscord];

      // Jika pemain punya Role (terverifikasi) dan IGN-nya diganti di web
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

    // Ambil createdAt lama buat dioper ke getFooterText()
    const createdAt = oldTeamData.createdAt as string;
    const updatedAt = new Date().toISOString(); // <-- Tambahkan baris ini
    
    // 3. Update Data di Vercel KV Redis
    const updatedTeamObj = {
      ...oldTeamData,
      namaTim,
      warna,
      logoTim: logoTim || oldTeamData.logoTim,
      buktiTransfer: buktiTransfer || oldTeamData.buktiTransfer,
      players: JSON.stringify(players),
      updatedAt: updatedAt,
    };

    await kv.hset(`teams:${teamSlug}`, updatedTeamObj);

    // =========================================================================
    // BUG FIX 1: UPDATE EMBED ROSTER (SUSUNAN PERSIS DENGAN YANG LAMA)
    // =========================================================================
    const rosterMessageId = oldTeamData.adminMsgId as string;
    if (rosterMessageId) {
      const ketua = players.find((p: any) => p.role?.toLowerCase() === 'ketua') || players[0];
      const wakil = players.find((p: any) => p.role?.toLowerCase() === 'wakil') || players[1];
      
      let playerListString = "";
      players.forEach((p: any) => {
        playerListString += `• ${p.ign} (@${p.discord}) - DL: ${p.idDuelLinks}\n`;
      });

      const rosterPayload = {
        embeds: [{
          title: `🛡️ ROSTER TIM: ${namaTim.toUpperCase()}`,
          color: hexToDecimal(warna),
          thumbnail: { url: logoTim || oldTeamData.logoTim },
          fields: [
            { name: "Ketua", value: ketua.ign, inline: true },
            { name: "Wakil", value: wakil.ign, inline: true },
            { name: "Players", value: playerListString, inline: false }
          ],
          footer: { 
            text: getFooterText(createdAt, updatedAt) 
          }
        }]
      };

      try {
        await discordAPI(
          `/channels/${DISCORD_CONFIG.CH_ROSTER}/messages/${rosterMessageId}`,
          'PATCH',
          rosterPayload
        );
      } catch (err) {
        console.error('Gagal update roster embed message:', err);
      }
    }

    // =========================================================================
    // BUG FIX 2: UPDATE EMBED TRACKER (SUSUNAN PERSIS DENGAN YANG LAMA)
    // =========================================================================
    const trackerChannelId = oldTeamData.discordChannelId as string;
    const trackerMessageId = oldTeamData.trackerMsgId as string;

    if (trackerChannelId && trackerMessageId) {
      let verifiedCount = 0;
      let rosterText = "";

      players.forEach((p: any) => {
        const pDiscord = p.discord ? p.discord.toLowerCase().trim() : '';
        const isVerified = verifiedMap.hasOwnProperty(pDiscord);

        if (isVerified) verifiedCount++;

        const icon = isVerified ? '✅' : '❌';
        rosterText += `${icon} ${p.ign} (@${p.discord}) - ${p.role}\n`;
      });

      const trackerPayload = {
        embeds: [{
          title: `🛡️ DATABASE TIM: ${namaTim.toUpperCase()}`,
          description: `DAFTAR ROSTER:\n${rosterText}`,
          color: hexToDecimal(warna),
          fields: [
            { 
              name: "📌 Role Tim", 
              value: oldTeamData.roleId ? `<@&${oldTeamData.roleId}>` : '(Belum Ada)', 
              inline: true 
            },
            { 
              name: "📊 Status", 
              value: `${verifiedCount} / ${players.length} Terverifikasi`, 
              inline: true 
            }
          ],
          footer: { 
            text: getFooterText(createdAt, updatedAt) 
          }
        }]
      };

      try {
        await discordAPI(
          `/channels/${trackerChannelId}/messages/${trackerMessageId}`,
          'PATCH',
          trackerPayload
        );
      } catch (err) {
        console.error('Gagal update tracker message:', err);
      }
    }

    return NextResponse.json({ success: true, message: 'Data tim berhasil diperbarui!' });
  } catch (error) {
    console.error('Error Edit Team API:', error);
    return NextResponse.json({ error: 'Gagal memperbarui data tim' }, { status: 500 });
  }
        }
