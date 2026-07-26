import { NextResponse } from 'next/server';

export async function handleInfo(body: any) {
  // 1. Deteksi Target (Diri sendiri atau orang lain)
  const options = body.data.options || [];
  const targetOption = options.find((opt: any) => opt.name === 'target');
  
  let targetUser;
  let targetMember;

  if (targetOption) {
    // Jika mencari orang lain, ambil dari data "resolved"
    const targetId = targetOption.value;
    targetUser = body.data.resolved.users[targetId];
    targetMember = body.data.resolved.members[targetId];
  } else {
    // Jika tidak ada target, gunakan data pemanggil command
    targetUser = body.member.user;
    targetMember = body.member;
  }

  // Jika user ternyata bukan member server ini (misal bot), handle dengan aman
  if (!targetUser) {
    return NextResponse.json({
      type: 4,
      data: { content: '❌ User tidak ditemukan.', flags: 64 }
    });
  }

  // 2. Format Avatar URL
  let avatarUrl = '';
  if (targetUser.avatar) {
    const ext = targetUser.avatar.startsWith('a_') ? 'gif' : 'png';
    avatarUrl = `https://cdn.discordapp.com/avatars/${targetUser.id}/${targetUser.avatar}.${ext}?size=256`;
  } else {
    // Fallback ke Default Avatar Discord jika user tidak pasang foto profil
    const defaultAvatarIndex = (BigInt(targetUser.id) >> 22n) % 6n;
    avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
  }

  // 3. Format Data & Roles
  const globalName = targetUser.global_name || targetUser.username;
  const username = targetUser.username;
  const nickname = targetMember?.nick || '*Sama dengan Global Name*';
  
  // Gabungkan role (hindari mapping jika member tidak punya role)
  let roleString = 'Belum ada role';
  if (targetMember?.roles && targetMember.roles.length > 0) {
    roleString = targetMember.roles.map((id: string) => `<@&${id}>`).join(' ');
  }

  // 4. Susun Payload Embed JSON
  const responsePayload = {
    type: 4, // Tipe 4 = Membalas interaction dengan pesan
    data: {
      embeds: [
        {
          color: 3447003, // Warna biru HEX #3498DB
          author: {
            name: `Informasi Profil: ${globalName}`,
            icon_url: avatarUrl
          },
          thumbnail: {
            url: avatarUrl
          },
          fields: [
            {
              name: '📝 Username (Untuk Form Web)',
              value: `\`@${username}\`\n*(Gunakan persis seperti ini di form registrasi)*`,
              inline: false
            },
            {
              name: '🏷️ Nickname Server (IGN)',
              value: nickname,
              inline: true
            },
            {
              name: '🆔 Discord ID',
              value: `\`${targetUser.id}\``,
              inline: true
            },
            {
              name: '🛡️ Role Saat Ini',
              value: roleString,
              inline: false
            }
          ],
          footer: {
            text: 'Tips: Bingung ganti nama? Buka Settings > My Account > Username'
          }
        }
      ]
    }
  };

  return NextResponse.json(responsePayload);
              }
