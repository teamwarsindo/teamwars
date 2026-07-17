import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { 
  createDiscordRole, 
  createDiscordChannel, 
  createDiscordVoiceChannel, 
  autoSortTeamRoles,
  sendTeamTracker 
} from '@/lib/discord'; // 👈 Menggunakan index.ts yang baru kita pecah

// ⚡ FUNGSI MOCK WEBHOOK: Mengirim 4 Pesan (Admin, Finance, Creative, Public) ke 1 Channel Testing
async function sendTestWebhooksToChannel(payload: any) {
  const token = process.env.DISCORD_BOT_TOKEN;
  const testChannelId = '1170909631049121872'; // Channel Temp Admin
  const ROLE_ADMIN = '1144271761488216134'; 
  
  if (!token) return null;

  try {
    let rosterText = "";
    payload.players.forEach((p: any) => {
      rosterText += `- **${p.ign}** (\`@${p.discord}\`) [${p.role}]\n`;
    });
    
    const decimalColor = payload.warna ? parseInt(payload.warna.replace('#', ''), 16) : 11146056;

    // 💡 Fungsi Helper: Kirim Pesan ke Channel Test
    const sendToTestChannel = async (content: string, embedData: any) => {
      const res = await fetch(`https://discord.com/api/v10/channels/${testChannelId}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bot ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, embeds: [embedData] })
      });
      if (res.ok) {
        const data = await res.json();
        return data.id; // Kembalikan ID pesan
      }
      return "";
    };

    // 1️⃣ SIMULASI WEBHOOK ADMIN (Tag Role Admin & Data Lengkap)
    const pAdmin = sendToTestChannel(
      `🚨 **[TEST ADMIN]** Pendaftaran Baru!\n<@&${ROLE_ADMIN}> Mohon review tim **${payload.namaTim}**`,
      { 
        title: `📝 DATA REGISTRASI: ${payload.namaTim.toUpperCase()}`, 
        color: decimalColor, 
        fields: [
          { name: "👑 Ketua", value: `**${payload.ketua.ign}** (\`@${payload.ketua.discord}\`)`, inline: true },
          { name: "👥 Roster", value: rosterText, inline: false }
        ],
        thumbnail: { url: payload.logoTim }, 
        image: { url: payload.buktiTransfer } 
      }
    );

    // 2️⃣ SIMULASI WEBHOOK FINANCE (Cek Bukti Transfer)
    const pFinance = sendToTestChannel(
      `💰 **[TEST FINANCE]** Menunggu Validasi Pembayaran: **${payload.namaTim}**`,
      { title: `🧾 BUKTI TRANSFER`, color: decimalColor, image: { url: payload.buktiTransfer } }
    );

    // 3️⃣ SIMULASI WEBHOOK CREATIVE (Cek Logo)
    const pCreative = sendToTestChannel(
      `🎨 **[TEST CREATIVE]** Aset Logo Tim: **${payload.namaTim}**`,
      { title: `🖼️ LOGO TIM`, color: decimalColor, image: { url: payload.logoTim } }
    );

    // 4️⃣ SIMULASI WEBHOOK PUBLIC (Pengumuman Roster)
    const pPublic = sendToTestChannel(
      `📢 **[TEST PUBLIC]** Sambut kedatangan tim baru!`,
      { 
        title: `🛡️ ${payload.namaTim.toUpperCase()} JOINED THE BATTLE!`, 
        color: decimalColor, 
        fields: [{ name: "👥 Daftar Roster", value: rosterText, inline: false }],
        thumbnail: { url: payload.logoTim }
      }
    );

    // 🚀 Eksekusi keempat pesan secara bersamaan (Parallel)
    const [adminId, financeId, creativeId, publicId] = await Promise.all([pAdmin, pFinance, pCreative, pPublic]);

    // Kembalikan objek yang strukturnya 100% sama dengan sendAllWebhooks asli
    return { 
      Admin: adminId || "", 
      Finance: financeId || "", 
      Creative: creativeId || "", 
      Public: publicId || "" 
    };

  } catch (error) {
    console.error("Gagal kirim test webhooks:", error);
    return null;
  }
}

export async function GET() { // Menggunakan GET agar gampang di-test di browser
  try {
    // ==========================================
    // 0. INJEKSI DATA DUMMY (Bypass Upload UI)
    // ==========================================
    const data = {
      email: "test@octagram.com",
      namaTim: "TEST-OCTAGRAM", // 👈 KUNCI MATI TESTING
      warna: "#FF0000",
      logoTim: "https://dummyimage.com/400x400/000/fff&text=Logo+Test",
      buktiTransfer: "https://dummyimage.com/400x600/000/fff&text=Bukti+TF",
      players: [
        // 👇 Username Anda dimasukkan di sini
        { 
          ign: "Tsaqif", 
          discord: "tsaqif.mtz", 
          role: "Ketua", 
          idDuelLinks: "123456789" 
        },
        { 
          ign: "TestWakil", 
          discord: "testwakil123", 
          role: "Wakil Ketua", 
          idDuelLinks: "987654321" 
        },
        { 
          ign: "TestAnggota", 
          discord: "testanggota123", 
          role: "Anggota", 
          idDuelLinks: "111222333" 
        }
      ]
    };


    // ==========================================
    // 1. MAIN SUBMISSION (LOGIKA IDENTIK DENGAN PRODUCTION)
    // ==========================================
    const { email, namaTim, warna, logoTim, buktiTransfer, players } = data; 
    const teamSlug = namaTim.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const kvKey = `teams:${teamSlug}`;

    if (await kv.exists(kvKey)) {
      return NextResponse.json({ success: false, errors: [{ field: 'namaTim', message: "Nama tim sudah terdaftar! (Hapus dulu via endpoint cleanup)" }] }, { status: 409 });
    }

    const timestampNow = new Date().toISOString(); 
    const editToken = crypto.randomUUID(); 

    await kv.hset(kvKey, {
      namaTim: namaTim.trim(),
      warna: warna,
      email: email.trim(),
      logoTim: logoTim, 
      buktiTransfer: buktiTransfer, 
      players: JSON.stringify(players), 
      createdAt: timestampNow,
      updatedAt: timestampNow,
      statusVerifikasi: "Pending",
      editToken: editToken 
    });

    await kv.set(`token:map:${editToken}`, teamSlug);
    await kv.sadd("global:teams", teamSlug);

    const ketua = players.find((p: any) => p.role === "Ketua") || { namaLengkap: "-", discord: "-", idDuelLinks: "-" };
    const wakil = players.find((p: any) => p.role === "Wakil Ketua") || { namaLengkap: "-", discord: "-", idDuelLinks: "-" };

    // ==========================================
    // 2. ORKESTRASI BACKGROUND TASKS
    // ==========================================
    const discordTasks = async () => {
      try {
        const roleId = await createDiscordRole(namaTim, warna);
        
        let channelId = "";
        let voiceChannelId = ""; 
        let trackerMsgId = ""; 

        if (roleId) {
          channelId = await createDiscordChannel(namaTim, roleId);
          voiceChannelId = await createDiscordVoiceChannel(namaTim, roleId); 
          
          if (channelId) {
            trackerMsgId = await sendTeamTracker({
              channelId, namaTim, warna, roleId, players
            });
          }
        }
        
        // ⚡ MENGGUNAKAN MOCK WEBHOOK
        const webhookMsgIds = await sendTestWebhooksToChannel({ 
          namaTim, warna, ketua, wakil, players, 
          totalRoster: players.length, teamSlug, kvKey,
          logoTim, buktiTransfer, createdAt: timestampNow 
        });

        if (webhookMsgIds) {
          await kv.hset(kvKey, { 
            discordRoleId: roleId || "",
            discordChannelId: channelId, 
            discordVoiceChannelId: voiceChannelId, 
            trackerMsgId: trackerMsgId, 
            adminMsgId: webhookMsgIds["Admin"] || "",
            financeMsgId: webhookMsgIds["Finance"] || "",
            creativeMsgId: webhookMsgIds["Creative"] || "",
            publicMsgId: webhookMsgIds["Public"] || ""
          });

          try {
            await autoSortTeamRoles();
            console.log(`✨ [TEST] Urutan Role berhasil dirapikan!`);
          } catch (e) {
            console.warn(`⚠️ [TEST] Gagal mengurutkan otomatis.`); 
          }
        }
      } catch (err) {
        console.error("Gagal tugas Discord:", err);
      }
    };

    // Eksekusi task (tanpa kirim email asli)
    await discordTasks();
    return NextResponse.json({ success: true, message: "Simulasi Pendaftaran Berhasil Dieksekusi!" });

  } catch (error: unknown) {
    console.error("API Submit Error:", error);
    return NextResponse.json({ success: false, error: "Terjadi kesalahan server" }, { status: 500 });
  }
    }
