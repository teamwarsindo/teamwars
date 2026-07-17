import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { 
  createDiscordRole, 
  createDiscordChannel, 
  createDiscordVoiceChannel, 
  autoSortTeamRoles,
  sendTeamTracker 
} from '@/lib/discord'; // 👈 Menggunakan index.ts yang baru kita pecah

// ⚡ FUNGSI MOCK WEBHOOK: Mengalihkan pengiriman ke Channel Testing (1170909631049121872)
async function sendTestWebhooksToChannel(payload: any) {
  const token = process.env.DISCORD_BOT_TOKEN;
  const testChannelId = '1170909631049121872'; // 👈 Sesuai instruksi
  
  if (!token) return null;

  try {
    const msgRes = await fetch(`https://discord.com/api/v10/channels/${testChannelId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bot ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `🚨 **[TESTING SIMULASI]** Webhook ditangkap di channel test! Tim: **${payload.namaTim}**`,
        embeds: [{
          title: `Data Webhook Tim ${payload.namaTim}`,
          description: `Logo: ${payload.logoTim}\nBukti TF: ${payload.buktiTransfer}`,
          color: 11146056
        }]
      })
    });
    
    if (msgRes.ok) {
      const data = await msgRes.json();
      // Mengembalikan mock ID agar struktur return sama dengan sendAllWebhooks asli
      return { Admin: data.id, Finance: data.id, Creative: data.id, Public: data.id };
    }
    return null;
  } catch (error) {
    console.error("Gagal kirim test webhook:", error);
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
        { ign: "TestKetua", discord: "testketua123", role: "Ketua", idDuelLinks: "12345" },
        { ign: "TestWakil", discord: "testwakil123", role: "Wakil Ketua", idDuelLinks: "67890" },
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
