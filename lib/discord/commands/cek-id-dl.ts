import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { hexToDecimal, getFooterText } from '@/lib/discord/utils';

export async function handleCekId(body: any) {
  try {
    const options = body.data?.options || [];
    const gameTypeOption = options.find((opt: any) => opt.name === 'game');
    const idOption = options.find((opt: any) => opt.name === 'id');

    const gameType = gameTypeOption?.value; // 'dl' atau 'md'
    const rawInput = idOption?.value || '';

    // Ambil angka saja dari input user
    const cleanNumbers = rawInput.replace(/\D/g, '');

    // Validasi Panjang Angka (Duel Links harus 9 digit)
    if (cleanNumbers.length !== 9) {
      return NextResponse.json({
        type: 4,
        data: {
          content: `❌ Format ID Duel Links salah! ID harus terdiri dari **9 angka**. (Contoh: \`305-348-162\` atau \`305348162\`)`,
          flags: 64, // Ephemeral (Hanya terlihat oleh pengirim)
        },
      });
    }

    // 🔄 Format ulang murni ke format KV: "305-348-162"
    const formattedId = `${cleanNumbers.slice(0, 3)}-${cleanNumbers.slice(3, 6)}-${cleanNumbers.slice(6, 9)}`;

    if (gameType === 'md') {
      return NextResponse.json({
        type: 4,
        data: {
          content: `ℹ️ Fitur pencarian **Master Duel** sedang dalam pengembangan.`,
          flags: 64,
        },
      });
    }

    // ===================================================
    // 🔍 PENCARIAN DI DATABASE (REDIS KV)
    // ===================================================
    const verifiedUsersMap = (await kv.hgetall('global:verified_users')) as Record<string, string> || {};
    
    // Ambil semua key tim dari Redis
    const teamKeys = await kv.keys('teams:*');
    let foundData: any = null;

    for (const key of teamKeys) {
      const teamData: any = await kv.hgetall(key);
      if (!teamData) continue;

      const players = typeof teamData.players === 'string' 
        ? JSON.parse(teamData.players) 
        : (teamData.players || []);

      // Cari pemain berdasarkan ID Duel Links (formatted: xxx-xxx-xxx)
      const matchedPlayer = players.find((p: any) => {
        const pId = (p.idDuelLinks || p.duelId || '').trim();
        return pId === formattedId;
      });

      if (matchedPlayer) {
        foundData = {
          player: matchedPlayer,
          team: teamData,
        };
        break; // Hentikan pencarian jika sudah ketemu
      }
    }

    // ===================================================
    // 📤 RESPONSE EMBED DISCORD
    // ===================================================
    if (!foundData) {
      return NextResponse.json({
        type: 4,
        data: {
          embeds: [
            {
              title: '⚠️ ID Duel Links Tidak Ditemukan',
              description: `ID Game **${formattedId}** tidak terdaftar pada roster tim mana pun di database TWI.`,
              color: 15158332, // Red
              footer: { text: getFooterText() },
            },
          ],
        },
      });
    }

    const { player, team } = foundData;
    const cleanDiscord = player.discord ? player.discord.toLowerCase().replace(/^@/, '').trim() : '';
    const discordId = verifiedUsersMap[cleanDiscord];
    const isVerified = Boolean(discordId);

    const embedColor = hexToDecimal(team.warna);
    const discordMention = discordId ? `<@${discordId}>` : `@${player.discord || '-'}`;

    return NextResponse.json({
      type: 4,
      data: {
        embeds: [
          {
            title: '🎴 Data ID Duel Links Ditemukan!',
            color: embedColor,
            thumbnail: team.logoTim ? { url: team.logoTim } : undefined,
            fields: [
              { name: '📌 ID Game', value: `\`${formattedId}\``, inline: true },
              { name: '👥 Nama Tim', value: team.namaTim || '-', inline: true },
              { name: '👤 IGN Pemain', value: player.ign || '-', inline: true },
              { name: '🏷️ Role Tim', value: player.role || 'Member', inline: true },
              { name: '💬 Discord', value: `${discordMention}`, inline: true },
              { name: '📊 Status Discord', value: isVerified ? '✅ Terverifikasi' : '❌ Belum Terverifikasi', inline: true },
            ],
            footer: { 
              text: getFooterText(team.createdAt, team.updatedAt) 
            },
          },
        ],
      },
    });

  } catch (error) {
    console.error('Error handling /cek-id command:', error);
    return NextResponse.json({
      type: 4,
      data: {
        content: '💥 Terjadi kesalahan saat mencari ID di database.',
        flags: 64,
      },
    });
  }
  }
