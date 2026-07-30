import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { hexToDecimal } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';

// Helper pencarian data tim di Redis KV berdasarkan Role ID / Nama Role
async function findTeamByRoleId(roleId: string, roleName?: string) {
  if (!roleId) return null;

  const teamKeys = await kv.keys('teams:*');
  
  // 🔍 LAPIS 1: Cek berdasarkan ID Role di Redis KV
  for (const key of teamKeys) {
    const teamData: any = await kv.hgetall(key);
    if (!teamData) continue;

    // 🎯 Sertakan discordRoleId (Sesuai dengan field simpanan API Submit Pendaftaran)
    const savedRoleId = 
      teamData.discordRoleId || 
      teamData.roleId || 
      teamData.roleTeamId || 
      teamData.roleTeam || 
      teamData.idRole || 
      teamData.role_id || 
      teamData.teamRoleId || 
      '';

    if (savedRoleId === roleId) {
      const players = typeof teamData.players === 'string' 
        ? JSON.parse(teamData.players) 
        : (teamData.players || []);
      
      return { ...teamData, players };
    }
  }

  // 🔍 LAPIS 2 (FALLBACK): Jika ID tidak tersimpan, cocokkan Nama Role dengan Tag / Nama Tim / Slug
  if (roleName) {
    const cleanRoleName = roleName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    for (const key of teamKeys) {
      const teamData: any = await kv.hgetall(key);
      if (!teamData) continue;

      const tag = (teamData.tagTim || teamData.tag || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const nama = (teamData.namaTim || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const slug = key.replace('teams:', '').toLowerCase().replace(/[^a-z0-9]/g, '');

      // Pengecekan kemiripan teks
      if (
        cleanRoleName === tag || 
        cleanRoleName === slug || 
        nama.replace(/[^a-z0-9]/g, '').includes(cleanRoleName) || 
        cleanRoleName.includes(nama.replace(/[^a-z0-9]/g, ''))
      ) {
        const players = typeof teamData.players === 'string' 
          ? JSON.parse(teamData.players) 
          : (teamData.players || []);
        
        return { ...teamData, players };
      }
    }
  }

  return null;
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
          flags: 64, // Ephemeral (Privat)
        },
      });
    }

    const options = body.data?.options || [];
    const resolvedRoles = body.data?.resolved?.roles || {};

    // Ambil ID Role dari input Type 8 (ROLE)
    const team1RoleId = options.find((opt: any) => opt.name === 'team1')?.value;
    const team2RoleId = options.find((opt: any) => opt.name === 'team2')?.value;

    // Ambil Nama Role dari resolved data Discord (jika ada)
    const team1RoleName = team1RoleId ? resolvedRoles[team1RoleId]?.name : undefined;
    const team2RoleName = team2RoleId ? resolvedRoles[team2RoleId]?.name : undefined;

    const team1Data = await findTeamByRoleId(team1RoleId, team1RoleName);
    const team2Data = team2RoleId ? await findTeamByRoleId(team2RoleId, team2RoleName) : null;

    if (!team1Data) {
      return NextResponse.json({
        type: 4,
        data: {
          content: `❌ Tim dengan Role <@&${team1RoleId}> tidak ditemukan di database TWI!`,
          flags: 64,
        },
      });
    }

    // Ambil data verifikasi user & blacklist dari Redis
    const verifiedUsersMap = (await kv.hgetall('global:verified_users')) as Record<string, string> || {};
    const blacklistSet = (await kv.smembers('global:blacklisted_ids')) || [];

    // Helper Rakit Embed
    const buildTeamEmbed = (team: any) => {
      const playerLines = team.players.map((p: any, idx: number) => {
        const rawDiscord = (p.discord || '').trim();
        const cleanDiscord = rawDiscord.toLowerCase().replace(/^@/, '');
        const discordId = verifiedUsersMap[cleanDiscord];
        const discordMention = discordId ? `<@${discordId}>` : `@${cleanDiscord || '-'}`;

        const rawId = (p.idDuelLinks || p.duelId || '').trim();
        const cleanNumbers = rawId.replace(/\D/g, '');
        const formattedId = cleanNumbers.length === 9 
          ? `${cleanNumbers.slice(0, 3)}-${cleanNumbers.slice(3, 6)}-${cleanNumbers.slice(6, 9)}`
          : rawId;

        const isBlacklisted = blacklistSet.includes(formattedId);
        const statusIcon = isBlacklisted ? '⛔ *BLACKLIST*' : (discordId ? '✅' : '❌');

        return `**${idx + 1}. ${p.ign || '-'}** (${p.role || 'Member'})\n└ ID: \`${formattedId}\` | DC: ${discordMention} | ${statusIcon}`;
      }).join('\n\n');

      return {
        title: `🛡️ Roster: ${team.namaTim} [${team.tagTim || team.tag || 'NO-TAG'}]`,
        color: hexToDecimal(team.warna),
        thumbnail: team.logoTim ? { url: team.logoTim } : undefined,
        description: playerLines || '_Belum ada data pemain._',
        footer: { text: `Total Roster: ${team.players.length} Pemain • TWI S7` },
      };
    };

    const embeds: any[] = [buildTeamEmbed(team1Data)];

    if (team2RoleId) {
      if (team2Data) {
        embeds.push(buildTeamEmbed(team2Data));
      } else {
        embeds.push({
          title: `⚠️ Tim 2 Tidak Ditemukan`,
          description: `Data untuk Role <@&${team2RoleId}> tidak dapat ditemukan di database.`,
          color: 15158332,
          footer: { text: 'Team Wars Indonesia' },
        });
      }
    }

    // 📤 Send Response Ephemeral (Hanya Referee yang bisa lihat)
    return NextResponse.json({
      type: 4,
      data: {
        embeds,
        flags: 64, 
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
