import { NextRequest, NextResponse } from 'next/server';
import nacl from 'tweetnacl';
import { kv } from '@vercel/kv';

// ==========================================
// KONFIGURASI ID DISCORD
// ==========================================
const ROLE_KETUA = '610109155465756692';
const ROLE_WAKIL = '1173455029814952006';
const ROLE_DUELIST = '1525761725901570158';
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
    // ==========================================
    // 1. GEMBOK KEAMANAN DISCORD (SIGNATURE VERIFICATION)
    // ==========================================
    const signature = req.headers.get('x-signature-ed25519');
    const timestamp = req.headers.get('x-signature-timestamp');
    const rawBody = await req.text();

    if (!signature || !timestamp || !process.env.DISCORD_PUBLIC_KEY) {
      console.error("ALARM 1: Signature/Timestamp kosong, atau PUBLIC_KEY di Vercel belum ada!");
      return new NextResponse('Akses Ditolak', { status: 401 });
    }

    const isVerified = nacl.sign.detached.verify(
      Buffer.from(timestamp + rawBody),
      Buffer.from(signature, 'hex'),
      Buffer.from(process.env.DISCORD_PUBLIC_KEY, 'hex')
    );

    if (!isVerified) {
      console.error("ALARM 2: Kriptografi gagal! DISCORD_PUBLIC_KEY salah atau typo.");
      return new NextResponse('Signature tidak valid', { status: 401 });
    }

    const body = JSON.parse(rawBody);

    // ==========================================
    // 2. RESPON PING DARI DISCORD
    // ==========================================
    if (body.type === 1) {
      return NextResponse.json({ type: 1 });
    }

    // ==========================================
    // 3. LOGIKA KLIK TOMBOL VERIFIKASI (Type 3)
    // ==========================================
    if (body.type === 3 && body.data.custom_id === 'btn_claim_role') {
      const guildId = body.guild_id;
      const userId = body.member.user.id;
      const username = body.member.user.username.toLowerCase();
      const currentRoles = body.member.roles;

      // CARI DATA TIM DI REDIS TERLEBIH DAHULU
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

      // JIKA DATA TIDAK DITEMUKAN DI REDIS
      if (!foundTeam) {
        return NextResponse.json({
          type: 4,
          data: {
            content: `🔍 **Data Tidak Ditemukan**: Username Discord **@${username}** tidak terdaftar. Mohon pastikan Kapten Tim mendaftarkan username yang tepat.`,
            flags: 64
          }
        });
      }

      // AMBIL LINK CHANNEL DARI DATABASE (Teks biasa jika belum diset)
      const channelLink = foundTeam.channelId ? `<#${foundTeam.channelId}>` : `channel private tim Anda`;

      // 🎯 PROTEKSI SPAM DIPINDAH KE SINI (Jadi channelLink udah terbaca)
      if (currentRoles.includes(ROLE_DUELIST)) {
        return NextResponse.json({
          type: 4, 
          data: {
            content: `⚠️ **STATUS: SUDAH TERVERIFIKASI**\nSistem mendeteksi bahwa akun Anda telah menyelesaikan proses verifikasi sebelumnya.\n\nTidak perlu melakukan klaim ulang. Silakan langsung menuju ke ${channelLink}.`,
            flags: 64 // Ephemeral
          }
        });
      }

      // SIAPKAN DAFTAR ROLE BARU
      const rolesToAssign = [ROLE_DUELIST];
      if (foundPlayer.role === 'Ketua') rolesToAssign.push(ROLE_KETUA);
      if (foundPlayer.role === 'Wakil Ketua') rolesToAssign.push(ROLE_WAKIL);
      
      if (foundTeam.roleId) rolesToAssign.push(foundTeam.roleId);
      if (foundTeam.discordRoleId) rolesToAssign.push(foundTeam.discordRoleId);

      // EKSEKUSI API DISCORD 
      const apiPromises = [];

      // A. Tambahkan Role
      for (const roleId of rolesToAssign) {
        apiPromises.push(discordAPI(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, 'PUT'));
      }

      // B. Ubah Nickname
      apiPromises.push(discordAPI(`/guilds/${guildId}/members/${userId}`, 'PATCH', { nick: `${foundPlayer.ign}` }));

      // C. Kirim Log ke Channel Admin
      apiPromises.push(discordAPI(`/channels/${CHANNEL_LOG}/messages`, 'POST', {
        embeds: [
          {
            title: "✅ Log Verifikasi Role",
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

      // Tunggu semua eksekusi Discord API selesai
      await Promise.allSettled(apiPromises);

      // BERIKAN RESPON SUKSES
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

    return new NextResponse('Bad Request', { status: 400 });
  } catch (error) {
    console.error('Error Discord Interaction:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
