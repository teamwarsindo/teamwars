import { NextResponse } from 'next/server';
import { DISCORD_CONFIG } from '@/lib/config';
import { kv } from '@vercel/kv';

const EPHEMERAL_FLAG = 64; // Flag 64 agar respon HANYA BISA DILIHAT oleh user yang nge-klik

export async function handleBtEditTeam(body: any) {
  try {
    const member = body.member;
    const userRoles: string[] = member?.roles || [];
    const channelId = body.channel_id;

    // 1. Otorisasi Role: Hanya Ketua, Wakil, atau Admin yang boleh melihat/mengakses
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
          content: "🚫 **Akses Ditolak!**\nHanya **Ketua Tim**, **Wakil Ketua**, atau **Admin Discord** yang memiliki akses untuk membuka form edit roster.",
          flags: EPHEMERAL_FLAG,
        },
      });
    }

    // ✅ JIKA USER ADALAH KETUA / WAKIL / ADMIN
    const teamKeys = await kv.keys('teams:*');
    let editToken = '';
    let teamName = '';

    if (teamKeys && teamKeys.length > 0) {
      // Cari tim berdasarkan channel_id
      for (const key of teamKeys) {
        const teamData: any = await kv.hgetall(key);
        if (teamData && teamData.discordChannelId === channelId) {
          editToken = teamData.editToken || '';
          teamName = teamData.namaTim || '';
          break;
        }
      }

      // Fallback jika dites di channel log (Testing)
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
        // Teks rapi tanpa memajang link mentah sama sekali
        content: `✅ **Akses Diberikan!**\nSilakan klik tombol di bawah untuk membuka form manajemen roster tim **${teamName}**:\n\n*Catatan: Jangan bagikan tautan atau akses ini kepada pihak selain manajemen tim.*`,
        flags: EPHEMERAL_FLAG, // Ephemeral: Rahasia hanya orang itu yang lihat
        components: [
          {
            type: 1, // Action Row
            components: [
              {
                type: 2, // Button URL Component
                style: 5, // Link Style (Hijau/Biru URL Button)
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
