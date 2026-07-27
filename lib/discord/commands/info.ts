import { NextResponse } from 'next/server';

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
  
  // 4. SUSUN ROLE (Langsung Tembak Tanpa API)
  let roleString = 'Belum ada role';
  if (targetMember?.roles && targetMember.roles.length > 0) {
    // Langsung gabungkan ID Role dengan spasi baris (\n)
    roleString = targetMember.roles.map((id: string) => `<@&${id}>`).join('\n');
  }

  // 5. Susun Payload Embed JSON
  const responsePayload = {
    type: 4, 
    data: {
      embeds: [
        {
          color: 3447003, 
          author: {
            name: `Informasi Profil @${username}`, 
            icon_url: avatarUrl
          },
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
            text: 'Tips: Bingung ganti username? Buka Settings > My Account > Username'
          }
        }
      ]
    }
  };

  return NextResponse.json(responsePayload);
}
  
