import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { hexToDecimal, getFooterText } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';

// Helper pencarian data tim di Redis KV
async function findTeamData(query: string) {
  if (!query) return null;
  const cleanQuery = query.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  const teamKeys = await kv.keys('teams:*');
  for (const key of teamKeys) {
    const teamData: any = await kv.hgetall(key);
    if (!teamData) continue;

    const tag = (teamData.tagTim || teamData.tag || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const nama = (teamData.namaTim || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const slug = key.replace('teams:', '').toLowerCase();

    if (tag === cleanQuery || slug === cleanQuery || nama.includes(cleanQuery)) {
      const players = typeof teamData.players === 'string' 
        ? JSON.parse(teamData.players) 
        : (teamData.players || []);
      
      return { ...teamData, players };
    }
  }

  return null;
}

// Helper pembentuk Embed Roster mengikuti struktur dari roster.ts
function buildRosterEmbed(teamData: any) {
  const { namaTim, warna, players, logoTim, createdAt } = teamData;

  // Cari ketua dan wakil dari daftar players
  const ketua = players.find((p: any) => p.role?.toLowerCase() === 'ketua') || players[0] || { ign: '-' };
  const wakil = players.find((p: any) => p.role?.toLowerCase() === 'wakil') || { ign: '-' };

  // Format daftar pemain seperti pada roster.ts
  const playerListString = players.map((p: any) => 
    `${p.ign} (${p.idDuelLinks || p.duelId || '-'})`
  ).join('\n');

  return {
    title: namaTim,
    color: hexToDecimal(warna),
    thumbnail: logoTim ? { url: logoTim } : undefined,
    fields: [
      { name: "Ketua", value: ketua.ign || '-', inline: true },
      { name: "Wakil", value: wakil.ign || '-', inline: true },
      { name: "Players", value: playerListString || '_Tidak ada pemain_', inline: false }
    ],
    footer: { text: getFooterText(createdAt) }
  };
}

export async function handleCekRoster(body: any) {
  try {
    const member = body.member;
    const userRoles: string[] = member?.roles || [];

    // 🔒 1. PERMISSION CHECK: Admin & Referee Only
    const isAuthorized = userRoles.some(roleId => 
      roleId === DISCORD_CONFIG.ROLE_ADMIN || 
      roleId === DISCORD_CONFIG.ROLE_REFEREE
    );

    if (!isAuthorized) {
      return NextResponse.json({
        type: 4,
        data: {
          content: '❌ Kamu tidak memiliki izin (Permission Admin/Referee) untuk melihat roster ini!',
          flags: 64, // Ephemeral (Hanya terlihat oleh pengirim)
        },
      });
    }

    const options = body.data?.options || [];
    const team1Input = options.find((opt: any) => opt.name === 'team1')?.value;
    const team2Input = options.find((opt: any) => opt.name === 'team2')?.value;

    // Search Tim 1 & Tim 2
    const team1Data = await findTeamData(team1Input);
    const team2Data = team2Input ? await findTeamData(team2Input) : null;

    if (!team1Data) {
      return NextResponse.json({
        type: 4,
        data: {
          content: `❌ Tim dengan Tag/Nama \`${team1Input}\` tidak ditemukan di database!`,
          flags: 64,
        },
      });
    }

    // Rakit embed sesuai template roster.ts
    const embeds = [buildRosterEmbed(team1Data)];

    if (team2Input) {
      if (team2Data) {
        embeds.push(buildRosterEmbed(team2Data));
      } else {
        embeds.push({
          title: `⚠️ Tim 2 (${team2Input}) Tidak Ditemukan`,
          description: `Data untuk \`${team2Input}\` tidak dapat ditemukan di database.`,
          color: 15158332,
        });
      }
    }

    // 📤 Return Response Ephemeral
    return NextResponse.json({
      type: 4,
      data: {
        embeds,
        flags: 64, // Hanya referee yang lihat
      },
    });

  } catch (error) {
    console.error('Error handling /cek-roster command:', error);
    return NextResponse.json({
      type: 4,
      data: {
        content: '💥 Terjadi kesalahan server saat mengambil data roster.',
        flags: 64,
      },
    });
  }
}
