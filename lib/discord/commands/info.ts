import { NextResponse } from 'next/server';
import { discordAPI } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';

export async function handleInfo(body: any) {
  // 1. Deteksi Target
  const options = body.data?.options || [];
  const targetOption = options.find((opt: any) => opt.name === 'target');
  
  let targetUser;
  let targetMember;

  if (targetOption) {
    const targetId = targetOption.value;
    targetUser = body.data.resolved.users[targetId];
    targetMember = body.data.resolved.members[targetId];
  } else {
    targetUser = body.member.user;
    targetMember = body.member;
  }

  if (!targetUser) {
    return NextResponse.json({
      type: 4,
      data: { content: '❌ User tidak ditemukan di server ini.', flags: 64 }
    });
  }

  // 2. Format Avatar URL (Anti Error Build BigInt)
  let avatarUrl = '';
  if (targetUser.avatar) {
    const ext = targetUser.avatar.startsWith('a_') ? 'gif' : 'png';
    avatarUrl = `https://cdn.discordapp.com/avatars/${targetUser.id}/${targetUser.avatar}.${ext}?size=256`;
  } else {
    const defaultAvatarIndex = (BigInt(targetUser.id) >> BigInt(22)) % BigInt(6);
    avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
  }

  // 3. Format Nama Cerdas
  const username = targetUser.username;
  const displayName = targetMember?.nick || targetUser.global_name || targetUser.username;
  
  // 4. SUSUN ROLE & AMBIL WARNA TERTINGGI
  let roleString = 'Belum ada role';
  let embedColor = 3447003; // Default warna biru jika user tidak punya role berwarna

  if (targetMember?.roles && targetMember.roles.length > 0) {
    try {
      // Tarik data hierarki role dari server
      const guildRoles = await discordAPI(`/guilds/${DISCORD_CONFIG.GUILD_ID}/roles`, 'GET');
      
      if (guildRoles && Array.isArray(guildRoles)) {
        // Cocokkan ID Role yang dimiliki user dengan posisi Role di server
        const sortedRoles = targetMember.roles
          .map((roleId: string) => guildRoles.find((r: any) => r.id === roleId))
          .filter((r: any) => r !== undefined)
          // Urutkan dari posisi tertinggi ke terendah
          .sort((a: any, b: any) => b.position - a.position);

        // Cari role teratas yang Punya Warna (bukan 0/default transparan)
        const highestColorRole = sortedRoles.find((r: any) => r.color > 0);
        if (highestColorRole) {
          embedColor = highestColorRole.color; // Timpa warna embed dengan warna role
        }

        roleString = sortedRoles.map((r: any) => `<@&${r.id}>`).join('\n');
      } else {
        // Fallback jika API mengembalikan data kosong
        roleString = targetMember.roles.map((id: string) => `<@&${id}>`).join('\n');
      }
    } catch (error) {
      console.error('Gagal fetch roles untuk sorting:', error);
      // Fallback kalau API gagal
      roleString = targetMember.roles.map((id: string) => `<@&${id}>`).join('\n');
    }
  }

  // 5. Susun Payload Embed JSON
  const responsePayload = {
    type: 4, 
    data: {
      embeds: [
        {
          color: embedColor, // 👈 Menggunakan variabel warna yang sudah kita buat
          author: {
            name: `Informasi Profil`
          },
          description: `<@${targetUser.id}>`,
          thumbnail: {
            url: avatarUrl
          },
          fields: [
            {
              name: '📝 Username Discord',
              value: username,
              inline: false
            },
            {
              name: '🏷️ Display Name (IGN)',
              value: displayName, 
              inline: false
            },
            {
              name: '🆔 Discord ID',
              value: targetUser.id,
              inline: false
            },
            {
              name: '🛡️ Role Saat Ini',
              value: roleString,
              inline: false
            }
          ],
          footer: {
            text: 'Tips: Bingung ganti username?\nBuka Settings > My Account > Username'
          }
        }
      ]
    }
  };

  return NextResponse.json(responsePayload);
      }
