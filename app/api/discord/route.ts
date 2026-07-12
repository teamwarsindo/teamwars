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
    // Saat lu masukin URL di portal Discord, Discord bakal nge-PING (Type 1)
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

      // PROTEKSI SPAM: Cek apakah user sudah punya role Duelist
      if (currentRoles.includes(ROLE_DUELIST)) {
        return NextResponse.json({
          type: 4, // Balas dengan pesan
          data: {
            content: '❌ **Akses Ditolak**: Anda telah terverifikasi dan mengklaim peran sebelumnya. Jika terdapat perubahan data, silakan hubungi Admin.',
            flags: 64 // Ephemeral (Hanya bisa dilihat yang ngeklik)
          }
        });
      }

      // CARI DATA TIM DI REDIS
      // Logika ini mencari semua slug tim, lalu mencocokkan username Discord.
      // (Sesuaikan jika lu punya index khusus di Redis yang lebih cepat
      let foundTeam: any = null;
      let foundPlayer: any = null;
      
      // 🎯 PERBAIKAN 1: Ganti 'global:summary_list' menjadi 'global:teams'
      const allTeamSlugs = await kv.smembers('global:teams');
      
      for (const slug of allTeamSlugs) {
        const teamData: any = await kv.hgetall(`teams:${slug}`);
        if (!teamData || !teamData.players) continue;
        
        const players = typeof teamData.players === 'string' ? JSON.parse(teamData.players) : teamData.players;
        
        // Pastikan nyarinya bersih dari spasi dan huruf besar
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

      // SIAPKAN DAFTAR ROLE BARU
      const rolesToAssign = [ROLE_DUELIST];
      if (foundPlayer.role === 'Ketua') rolesToAssign.push(ROLE_KETUA);
      if (foundPlayer.role === 'Wakil Ketua') rolesToAssign.push(ROLE_WAKIL);
      
      // 🎯 PERBAIKAN 2: Sesuaikan nama properti dengan data di Redis (roleId)
      if (foundTeam.roleId) rolesToAssign.push(foundTeam.roleId);
      if (foundTeam.discordRoleId) rolesToAssign.push(foundTeam.discordRoleId); // Buat jaga-jaga kalau nama field-nya beda

      // EKSEKUSI API DISCORD 
      const apiPromises = [];

      // A. Tambahkan Role
      for (const roleId of rolesToAssign) {
        apiPromises.push(discordAPI(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, 'PUT'));
      }

      // B. Ubah Nickname
      // Ambil inisial tim (contoh: "Tim Tester" -> "TT")
      const teamTag = foundTeam.namaTim.split(' ').map((w: string) => w[0]).join('').toUpperCase();
      const newNickname = `${teamTag} - ${foundPlayer.ign}`.substring(0, 32); // Max 32 karakter sesuai aturan Discord
      apiPromises.push(discordAPI(`/guilds/${guildId}/members/${userId}`, 'PATCH', { nick: newNickname }));

      // C. Kirim Log ke Channel Admin
      apiPromises.push(discordAPI(`/channels/${CHANNEL_LOG}/messages`, 'POST', {
        content: `📝 **Audit Log Verifikasi**\n👤 **User:** <@${userId}> (@${username})\n🎮 **IGN:** ${foundPlayer.ign}\n🛡️ **Jabatan:** ${foundPlayer.role}\n🏆 **Tim:** ${foundTeam.namaTim}\n⏰ **Waktu:** <t:${Math.floor(Date.now() / 1000)}:R>`
      }));

      // Tunggu semua eksekusi Discord API selesai
      await Promise.allSettled(apiPromises);

      // BERIKAN RESPON SUKSES
      return NextResponse.json({
        type: 4,
        data: {
          content: `✅ **Verifikasi Berhasil!**\n\nSelamat datang, **${foundPlayer.ign}**.\nPeran untuk Tim **${foundTeam.namaTim}**, Jabatan **${foundPlayer.role}**, dan **Season 7 Duelist** telah berhasil diterapkan.`,
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
    
