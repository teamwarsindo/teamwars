import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { hexToDecimal, getWIBTime } from '@/lib/discord/utils';

export async function handleCekId(body: any) {
  try {
    const options = body.data?.options || [];
    const gameTypeOption = options.find((opt: any) => opt.name === 'game');
    const idOption = options.find((opt: any) => opt.name === 'id');

    const gameType = gameTypeOption?.value;
    const rawInput = idOption?.value || '';

    // Ambil angka saja dari input user
    const cleanNumbers = rawInput.replace(/\D/g, '');

    if (cleanNumbers.length !== 9) {
      return NextResponse.json({
        type: 4,
        data: {
          content: `❌ Format ID Duel Links salah! ID harus terdiri dari **9 angka**. (Contoh: \`305-348-162\` atau \`305348162\`)`,
          flags: 64,
        },
      });
    }

    // 🔄 Format ulang ke format standar: "305-348-162"
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
    // ⛔ 1. CEK STATUS BLACKLIST DI REDIS
    // ===================================================
    const isBlacklisted = await kv.sismember('global:blacklisted_ids', formattedId);

    // ===================================================
    // 🔍 2. PENCARIAN DI DATABASE TIM (REDIS KV)
    // ===================================================
    const verifiedUsersMap = (await kv.hgetall('global:verified_users')) as Record<string, string> || {};
    const teamKeys = await kv.keys('teams:*');
    let foundData: any = null;

    for (const key of teamKeys) {
      const teamData: any = await kv.hgetall(key);
      if (!teamData) continue;

      const players = typeof teamData.players === 'string' 
        ? JSON.parse(teamData.players) 
        : (teamData.players || []);

      const matchedPlayer = players.find((p: any) => {
        const pId = (p.idDuelLinks || p.duelId || '').trim();
        return pId === formattedId;
      });

      if (matchedPlayer) {
        foundData = {
          player: matchedPlayer,
          team: teamData,
        };
        break;
      }
    }

    if (!foundData) {
      return NextResponse.json({
        type: 4,
        data: {
          embeds: [
            {
              title: isBlacklisted ? '⛔ ID Terdeteksi BLACKLIST!' : '⚠️ ID Duel Links Tidak Ditemukan',
              description: isBlacklisted 
                ? `⚠️ ID Game **${formattedId}** berada dalam **DAFTAR BLACKLIST TWI** dan tidak terdaftar di tim mana pun!`
                : `ID Game **${formattedId}** tidak terdaftar pada roster tim mana pun di database TWI.`,
              color: isBlacklisted ? 10038562 : 15158332, // Dark Red jika Blacklist
              footer: { text: `Dicari pada: ${getWIBTime()}` },
            },
          ],
        },
      });
    }

    const { player, team } = foundData;
    
    // Fix Formatting Discord Mention / Username
    const rawDiscord = (player.discord || '').trim();
    const cleanDiscord = rawDiscord.toLowerCase().replace(/^@/, '');
    const discordId = verifiedUsersMap[cleanDiscord];

    let discordDisplay = rawDiscord ? `@${cleanDiscord}` : '-';
    if (discordId) {
      discordDisplay = `<@${discordId}>`;
    }

    const isVerified = Boolean(discordId);
    
    // Warna Embed: Jika Blacklist -> Merah Gelap Peringatan (10038562), jika tidak -> Warna Tim
    const embedColor = isBlacklisted ? 10038562 : hexToDecimal(team.warna);

    return NextResponse.json({
      type: 4,
      data: {
        embeds: [
          {
            title: isBlacklisted 
              ? '⛔ ID Duel Links Ditemukan (STATUS: BLACKLIST!)' 
              : '🎴 Data ID Duel Links Ditemukan!',
            color: embedColor,
            thumbnail: team.logoTim ? { url: team.logoTim } : undefined,
            fields: [
              { name: '📌 ID Game', value: `\`${formattedId}\``, inline: true },
              { name: '👥 Nama Tim', value: team.namaTim || '-', inline: true },
              { name: '👤 IGN Pemain', value: player.ign || '-', inline: true },
              { name: '🏷️ Role Tim', value: player.role || 'Member', inline: true },
              { name: '💬 Discord', value: discordDisplay, inline: true },
              { 
                name: '📊 Status Akun', 
                value: isBlacklisted 
                  ? '⛔ **BLACKLISTED (DILARANG MAIN)**' 
                  : (isVerified ? '✅ Terverifikasi' : '❌ Belum Terverifikasi'), 
                inline: true 
              },
            ],
            footer: { 
              text: isBlacklisted 
                ? `PERINGATAN: ID ini dilarang berpartisipasi! • ${getWIBTime()}` 
                : `Team Wars Indonesia • Dicari pada ${getWIBTime()}` 
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
