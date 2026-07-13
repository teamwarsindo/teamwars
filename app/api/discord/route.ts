import { NextRequest, NextResponse } from 'next/server';
import nacl from 'tweetnacl';
import { kv } from '@vercel/kv';

// ==========================================
// KONFIGURASI ID DISCORD
// ==========================================
const ROLE_KETUA = '610109155465756692';
const ROLE_WAKIL = '1173455029814952006';
const ROLE_DUELIST = '1525761725901570158';
const ROLE_VERIFIED = '1166693043756343397'; // 🎯 ROLE BARU
const CHANNEL_LOG = '1525775643168735344';

// Helper: Tembak REST API Discord
async function discordAPI(endpoint: string, method: string, body?: any) {
  return fetch(`https://discord.com/api/v10${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-signature-ed25519');
    const timestamp = req.headers.get('x-signature-timestamp');
    const rawBody = await req.text();

    if (!signature || !timestamp || !process.env.DISCORD_PUBLIC_KEY) {
      return new NextResponse('Akses Ditolak', { status: 401 });
    }

    const isVerified = nacl.sign.detached.verify(
      Buffer.from(timestamp + rawBody),
      Buffer.from(signature, 'hex'),
      Buffer.from(process.env.DISCORD_PUBLIC_KEY, 'hex')
    );

    if (!isVerified) {
      return new NextResponse('Signature tidak valid', { status: 401 });
    }

    const body = JSON.parse(rawBody);

    if (body.type === 1) {
      return NextResponse.json({ type: 1 });
    }

    // ==========================================
    // 3. LOGIKA KLIK TOMBOL (Type 3)
    // ==========================================
    if (body.type === 3) {
      const customId = body.data.custom_id;
      const guildId = body.guild_id;
      const userId = body.member.user.id;
      const username = body.member.user.username.toLowerCase();
      const currentRoles = body.member.roles || [];

      // ----------------------------------------------------
      // A. JIKA KLIK TOMBOL "VERIFIED" (Akses Publik Umum)
      // ----------------------------------------------------
      if (customId === 'btn_claim_verified') {
        // Cek kalau udah punya role-nya biar nggak spam API
        if (currentRoles.includes(ROLE_VERIFIED)) {
          return NextResponse.json({
            type: 4, 
            data: {
              content: `⚠️ Anda sudah memiliki akses **Verified**. Silakan cek channel publik kami!`,
              flags: 64
            }
          });
        }

        // Langsung tembak API Discord buat ngasih role (Tanpa cek Redis)
        await discordAPI(`/guilds/${guildId}/members/${userId}/roles/${ROLE_VERIFIED}`, 'PUT');

        return NextResponse.json({
          type: 4, 
          data: {
            content: `✅ **Akses Publik Dibuka!**\nAnda telah mendapatkan role <@&${ROLE_VERIFIED}>. Selamat bergabung di server Team Wars Indonesia!\n\n*(Jika Anda adalah peserta turnamen, jangan lupa klik tombol **Role Tim** juga)*.`,
            flags: 64
          }
        });
      }

      // ----------------------------------------------------
      // B. JIKA KLIK TOMBOL "ROLE TIM" (Akses Khusus Peserta)
      // ----------------------------------------------------
      if (customId === 'btn_claim_role') {
        let foundTeam: any = null;
        let foundPlayer: any = null;
        
        const allTeamSlugs = await kv.smembers('global:teams');
        
        for (const slug of allTeamSlugs) {
          const teamData: any = await kv.hgetall(`teams:${slug}`);
          if (!teamData || !teamData.players) continue;
          
          const players = typeof teamData.players === 'string' ? JSON.parse(teamData.players) : teamData.players;
          const playerMatch = players.find((p: any) => p.discord.trim().toLowerCase() === username);
          
          if (playerMatch) {
            foundTeam = teamData;
            foundPlayer = playerMatch;
            break; 
          }
        }

        if (!foundTeam) {
          return NextResponse.json({
            type: 4,
            data: {
              content: `🔍 **Data Tidak Ditemukan**: Username Discord **@${username}** tidak terdaftar. Mohon pastikan Kapten Tim mendaftarkan username yang tepat.`,
              flags: 64
            }
          });
        }

        const rolesToAssign: string[] = [ROLE_DUELIST];
        if (foundPlayer.role === 'Ketua') rolesToAssign.push(ROLE_KETUA);
        if (foundPlayer.role === 'Wakil Ketua') rolesToAssign.push(ROLE_WAKIL);
        if (foundTeam.roleId) rolesToAssign.push(foundTeam.roleId);
        if (foundTeam.discordRoleId) rolesToAssign.push(foundTeam.discordRoleId);

        const hasAllRequiredRoles = rolesToAssign.every(roleId => currentRoles.includes(roleId));
        const channelLink = foundTeam.channelId ? `<#${foundTeam.channelId}>` : `channel private tim Anda`;

        if (hasAllRequiredRoles) {
          return NextResponse.json({
            type: 4, 
            data: {
              content: `⚠️ **STATUS: SUDAH TERVERIFIKASI**\nSistem mendeteksi bahwa akun Anda telah melengkapi seluruh *role* verifikasi.\n\nTidak perlu melakukan klaim ulang. Silakan langsung menuju ke ${channelLink}.`,
              flags: 64
            }
          });
        }

        const apiPromises = [];

        for (const roleId of rolesToAssign) {
          apiPromises.push(discordAPI(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, 'PUT'));
        }

        apiPromises.push(discordAPI(`/guilds/${guildId}/members/${userId}`, 'PATCH', { nick: `${foundPlayer.ign}` }));

        apiPromises.push(discordAPI(`/channels/${CHANNEL_LOG}/messages`, 'POST', {
          embeds: [
            {
              title: "✅ Log Verifikasi Role Tim",
              color: 3066993, 
              fields: [
                { name: "👤 User Discord", value: `<@${userId}>\n(\`@${username}\`)`, inline: true },
                { name: "🎮 IGN", value: `**${foundPlayer.ign}**`, inline: true },
                { name: "🏆 Tim", value: `**${foundTeam.namaTim}**`, inline: true },
                { name: "🛡️ Jabatan", value: `**${foundPlayer.role}**`, inline: true }
              ],
              footer: {  text: "Sistem Verifikasi Otomatis TWI" },
              timestamp: new Date().toISOString()
            }
          ]
        }));

        await Promise.allSettled(apiPromises);

        const roleTimStr = foundTeam.roleId ? `<@&${foundTeam.roleId}>` : `Role Tim`;
        const isPengurus = foundPlayer.role === 'Ketua' || foundPlayer.role === 'Wakil Ketua';
        
        let pesanSukses = "";

        if (isPengurus) {
          const roleJabatanStr = foundPlayer.role === 'Ketua' ? `<@&${ROLE_KETUA}>` : `<@&${ROLE_WAKIL}>`;
          pesanSukses = `✅ **AUTENTIKASI BERHASIL**\nProses verifikasi selesai. Anda telah resmi terdaftar sebagai **${foundPlayer.role}** untuk tim **${foundTeam.namaTim}**.\n\n**Role yang diperoleh:**\n🛡️ ${roleTimStr}\n👑 ${roleJabatanStr}\n⚔️ <@&${ROLE_DUELIST}>\n\nAkses Anda telah dibuka. Silakan berkoordinasi dan persiapkan strategi tim Anda di sini: ${channelLink}`;
        } else {
          pesanSukses = `✅ **AUTENTIKASI BERHASIL**\nProses verifikasi selesai. Anda telah secara resmi masuk ke dalam roster **${foundTeam.namaTim}**.\n\n**Role yang diperoleh:**\n🛡️ ${roleTimStr}\n⚔️ <@&${ROLE_DUELIST}>\n\nAkses Anda telah dibuka. Silakan bergabung dengan rekan setim Anda di sini: ${channelLink}`;
        }

        return NextResponse.json({
          type: 4,
          data: {
            content: pesanSukses,
            flags: 64
          }
        });    
      }
    }

    return new NextResponse('Bad Request', { status: 400 });
  } catch (error) {
    console.error('Error Discord Interaction:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
