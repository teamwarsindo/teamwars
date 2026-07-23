import { NextResponse, NextRequest } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI, hexToDecimal } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { getFooterText } from '@/lib/registration/utils';

export async function PUT(request: NextRequest) {
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
    // Jika username diedit tetapi username baru TIDAK TERVERIFIKASI di Discord
    // =========================================================================
    for (let i = 0; i < players.length; i++) {
      const newPlayer = players[i];
      const oldPlayer = oldPlayers[i];

      const newDiscord = newPlayer.discord ? newPlayer.discord.toLowerCase().trim() : '';
      const oldDiscord = oldPlayer?.discord ? oldPlayer.discord.toLowerCase().trim() : '';

      // Jika username discord diubah dari nilai sebelumnya
      if (oldDiscord && newDiscord !== oldDiscord) {
        const isOldVerified = verifiedMap.hasOwnProperty(oldDiscord);
        const isNewVerified = verifiedMap.hasOwnProperty(newDiscord);

        // Jika user lama sudah dapet role, tapi username baru dicoba diedit dan ternyata salah (tidak verified)
        if (isOldVerified && !isNewVerified) {
          return NextResponse.json(
            {
              error: `Username Discord "@${newPlayer.discord}" untuk pemain ${newPlayer.ign} belum terverifikasi di server Discord TWI. Pastikan username sesuai!`
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

      // Jika pemain terverifikasi (dapet role) dan IGN-nya berubah
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

    // Preservasi Waktu Regis / CreatedAt
    const createdAt = oldTeamData.createdAt || new Date().toISOString();

    // 3. Update Data di Vercel KV Redis
    const updatedTeamObj = {
      ...oldTeamData,
      namaTim,
      warna,
      logoTim: logoTim || oldTeamData.logoTim,
      buktiTransfer: buktiTransfer || oldTeamData.buktiTransfer,
      players: JSON.stringify(players),
      updatedAt: new Date().toISOString(),
    };

    await kv.hset(`teams:${teamSlug}`, updatedTeamObj);

    // =========================================================================
    // BUG FIX 1: DENGAN FOOTER DI EMBED ROSTER (CH_ROSTER)
    // =========================================================================
    const rosterMessageId = oldTeamData.rosterMessageId as string;
    if (rosterMessageId) {
      const ketua = players.find((p: any) => p.role?.toLowerCase() === 'ketua') || players[0];
      const wakil = players.find((p: any) => p.role?.toLowerCase() === 'wakil') || players[1];
      const playerListString = players
        .map((p: any) => `• ${p.ign} (@${p.discord}) - DL: ${p.idDuelLinks}`)
        .join('\n');

      const rosterEmbed = {
        title: `🛡️ ROSTER TIM: ${namaTim.toUpperCase()}`,
        color: hexToDecimal(warna),
        thumbnail: logoTim ? { url: logoTim } : undefined,
        fields: [
          { name: 'Ketua', value: ketua?.ign || '-', inline: true },
          { name: 'Wakil', value: wakil?.ign || '-', inline: true },
          { name: 'Players', value: playerListString, inline: false },
        ],
        footer: {
          text: getFooterText(createdAt), // FOOTER DIKEMBALIKAN PRESISI!
        },
      };

      try {
        await discordAPI(
          `/channels/${DISCORD_CONFIG.CH_ROSTER}/messages/${rosterMessageId}`,
          'PATCH',
          { embeds: [rosterEmbed] }
        );
      } catch (err) {
        console.error('Gagal update roster embed message:', err);
      }
    }

    // =========================================================================
    // BUG FIX 2: UPDATE TRACKER DI DISCORD (CH_TEAM_CAMP / TRACKER CHANNEL)
    // =========================================================================
    const trackerChannelId = (oldTeamData.teamChannelId || oldTeamData.channelId) as string;
    const trackerMessageId = oldTeamData.trackerMessageId as string;

    if (trackerChannelId && trackerMessageId) {
      let verifiedCount = 0;
      let trackerRosterText = '';

      players.forEach((p: any) => {
        const pDiscord = p.discord ? p.discord.toLowerCase().trim() : '';
        const isVerified = verifiedMap.hasOwnProperty(pDiscord);

        if (isVerified) verifiedCount++;

        const icon = isVerified ? '✅' : '❌';
        trackerRosterText += `${icon} ${p.ign} (@${p.discord}) - ${p.role}\n`;
      });

      const trackerEmbed = {
        title: `🛡️ DATABASE TIM: ${namaTim.toUpperCase()}`,
        description: `DAFTAR ROSTER:\n${trackerRosterText}`,
        color: hexToDecimal(warna),
        fields: [
          {
            name: '📌 Role Tim',
            value: oldTeamData.roleId ? `<@&${oldTeamData.roleId}>` : '(Belum Ada)',
            inline: true,
          },
          {
            name: '📊 Status Verifikasi',
            value: `${verifiedCount} / ${players.length} Terverifikasi`,
            inline: true,
          },
        ],
        timestamp: new Date().toISOString(),
      };

      try {
        await discordAPI(
          `/channels/${trackerChannelId}/messages/${trackerMessageId}`,
          'PATCH',
          { embeds: [trackerEmbed] }
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
