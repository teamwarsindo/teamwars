import { NextResponse } from 'next/server';
import { DISCORD_CONFIG } from '@/lib/config';
import { kv } from '@vercel/kv';

const EPHEMERAL_FLAG = 64; // Ephemeral: Pesan rahasia hanya bisa dilihat oleh user yang klik

export async function handleBtEditTeam(body: any) {
  try {
    const member = body.member;
    const userRoles: string[] = member?.roles || [];
    const channelId = body.channel_id;

    const isAdmin = userRoles.includes(DISCORD_CONFIG.ROLE_ADMIN);
    const isKetuaOrWakil = userRoles.some((roleId) =>
      [DISCORD_CONFIG.ROLE_KETUA, DISCORD_CONFIG.ROLE_WAKIL].includes(roleId)
    );

    // ⛔ 1. JIKA BUKAN ADMIN, KETUA, ATAU WAKIL
    if (!isAdmin && !isKetuaOrWakil) {
      return NextResponse.json({
        type: 4,
        data: {
          content: "🚫 **Akses Ditolak!**\nHanya **Ketua Tim**, **Wakil Ketua**, atau **Admin Discord** yang memiliki akses ke form ini.",
          flags: EPHEMERAL_FLAG,
        },
      });
    }

    // Cari data tim berdasarkan channel_id dari Redis
    const teamKeys = await kv.keys('teams:*');
    let editToken = '';
    let teamName = '';

    if (teamKeys && teamKeys.length > 0) {
      for (const key of teamKeys) {
        const teamData: any = await kv.hgetall(key);
        if (teamData && teamData.discordChannelId === channelId) {
          editToken = teamData.editToken || '';
          teamName = teamData.namaTim || '';
          break;
        }
      }
    }

    // 👑 2. JIKA USER ADALAH ADMIN DISCORD (Pakai Query ?key=ROLE_ADMIN)
    if (isAdmin) {
      const adminEditUrl = editToken 
        ? `https://teamwars.web.id/edit-team/${editToken}?key=${DISCORD_CONFIG.ROLE_ADMIN}` 
        : `https://teamwars.web.id/edit-team?key=${DISCORD_CONFIG.ROLE_ADMIN}`;

      return NextResponse.json({
        type: 4,
        data: {
          content: `👑 **Akses Admin Dideteksi!**\nSilakan klik tombol di bawah untuk mengedit roster tim **${teamName || 'Tim'}** via **Mode Admin**:`,
          flags: EPHEMERAL_FLAG,
          components: [
            {
              type: 1, // Action Row
              components: [
                {
                  type: 2, // Button URL Style
                  style: 5, 
                  label: "Edit Roster (Versi Admin)",
                  url: adminEditUrl,
                  emoji: { name: "🛠️" }
                }
              ]
            }
          ]
        },
      });
    }

    // 👥 3. JIKA USER ADALAH KETUA ATAU WAKIL KETUA (Link Biasa)
    const editUrl = editToken 
      ? `https://teamwars.web.id/edit-team/${editToken}` 
      : 'https://teamwars.web.id/edit-team';

    return NextResponse.json({
      type: 4,
      data: {
        content: `✅ **Akses Diberikan!**\nSilakan klik tombol di bawah untuk membuka form manajemen roster tim **${teamName}**:\n\n*Catatan: Jangan bagikan akses ini kepada pihak selain manajemen tim.*`,
        flags: EPHEMERAL_FLAG,
        components: [
          {
            type: 1,
            components: [
              {
                type: 2, // Button URL Style
                style: 5, 
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
        
