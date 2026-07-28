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
        type: 4, // Respond with message
        data: {
          content: "🚫 **Akses Ditolak!**\nHanya **Ketua Tim**, **Wakil Ketua**, atau **Admin Discord** yang memiliki akses untuk membuka tautan edit roster.",
          flags: EPHEMERAL_FLAG, // Rahasia (hanya orang ini yang lihat)
        },
      });
    }

    // ✅ JIKA USER ADALAH KETUA / WAKIL / ADMIN
    // Cari data tim dari Vercel KV Redis berdasarkan Channel ID tempat button diklik
    const teamKeys = await kv.keys('teams:*');
    let editToken = '';
    let teamName = '';

    for (const key of teamKeys) {
      const teamData: any = await kv.hgetall(key);
      if (teamData && teamData.discordChannelId === channelId) {
        editToken = teamData.editToken;
        teamName = teamData.namaTim;
        break;
      }
    }

    const editUrl = editToken
      ? `https://teamwars.web.id/edit-team/${editToken}`
      : 'https://teamwars.web.id/edit-team';

    return NextResponse.json({
      type: 4,
      data: {
        content: `✅ **Akses Diberikan!**\nBerikut adalah tautan khusus untuk mengedit data roster tim **${teamName || ''}**:\n\n*Catatan: Tautan ini bersifat rahasia, jangan bagikan kepada pihak selain manajemen tim.*`,
        flags: EPHEMERAL_FLAG, // Rahasia (hanya orang ini yang lihat)
        components: [
          {
            type: 1, // Action Row
            components: [
              {
                type: 2, // Button URL Component
                style: 5, // Link Style
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
