import { NextResponse } from 'next/server';
import { DISCORD_CONFIG } from '@/lib/config';
import { kv } from '@vercel/kv';

const EPHEMERAL_FLAG = 64; // Flag 64 agar respon HANYA BISA DILIHAT oleh user yang nge-klik

export async function handleBtEditTeam(body: any) {
  try {
    const member = body.member;
    const userRoles: string[] = member?.roles || [];
    const channelId = body.channel_id;

    // 1. Otorisasi Role: Hanya Ketua, Wakil, atau Admin yang boleh melihat link
    const ALLOWED_ROLES = [
      DISCORD_CONFIG.ROLE_KETUA,
      DISCORD_CONFIG.ROLE_WAKIL,
      DISCORD_CONFIG.ROLE_ADMIN,
    ];

    const hasPermission = userRoles.some((roleId) => ALLOWED_ROLES.includes(roleId));

    // ⛔ JIKA BUKAN KETUA / WAKIL / ADMIN
    if (!hasPermission) {
      return NextResponse.json({
        type: 4,
        data: {
          content: "🚫 **Akses Ditolak!**\nHanya **Ketua Tim**, **Wakil Ketua**, atau **Admin Discord** yang memiliki akses untuk membuka tautan edit roster.",
          flags: EPHEMERAL_FLAG,
        },
      });
    }

    // ✅ JIKA USER ADALAH KETUA / WAKIL / ADMIN
    const teamKeys = await kv.keys('teams:*');
    let editToken = '';
    let teamName = '';

    if (teamKeys && teamKeys.length > 0) {
      // 2a. Cari tim yang channel_id-nya cocok dengan channel tempat tombol diklik
      for (const key of teamKeys) {
        const teamData: any = await kv.hgetall(key);
        if (teamData && teamData.discordChannelId === channelId) {
          editToken = teamData.editToken || '';
          teamName = teamData.namaTim || '';
          break;
        }
      }

      // 2b. Jika tidak ketemu (misal diklik saat TESTING di channel CH_LOG), gunakan data tim pertama dari Redis
      if (!editToken) {
        const sampleTeamData: any = await kv.hgetall(teamKeys[0]);
        if (sampleTeamData) {
          editToken = sampleTeamData.editToken || '';
          teamName = sampleTeamData.namaTim || 'Tim Sample';
        }
      }
    }

    // Susun URL Lengkap dengan Token
    const editUrl = editToken 
      ? `https://teamwars.web.id/edit-team/${editToken}` 
      : 'https://teamwars.web.id/edit-team';

    return NextResponse.json({
      type: 4,
      data: {
        content: `✅ **Akses Diberikan!**\nBerikut adalah tautan khusus untuk mengedit data roster tim **${teamName}**:\n\n🔗 \`${editUrl}\`\n\n*Catatan: Tautan ini bersifat rahasia, jangan bagikan kepada pihak selain manajemen tim.*`,
        flags: EPHEMERAL_FLAG, // Ephemeral: Hanya user yang menekan tombol yang bisa melihat pesan ini
        components: [
          {
            type: 1, // Action Row
            components: [
              {
                type: 2, // Button Component
                style: 5, // Link URL Button
                label: "Buka Form Edit Roster",
                url: editUrl,
                emoji: { name: "✏️" }
              }
            ]
          }
        ]
      },
    });

  } catch (error) {
    console.error('Error handling btEditTeam:', error);
    return NextResponse.json({
      type: 4,
      data: {
        content: "❌ Terjadi kesalahan saat memproses permintaan edit tim.",
        flags: EPHEMERAL_FLAG,
      },
    });
  }
            }
