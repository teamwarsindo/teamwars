import { NextResponse, NextRequest } from 'next/server';
import { Resend } from 'resend';
import { kv } from '@vercel/kv';
import { EMAIL_CONFIG } from '@/lib/config';
import { getPesertaTemplate } from '@/lib/email-templates'; 
import { 
  createDiscordRole, 
  createDiscordChannel, 
  createDiscordVoiceChannel, 
  autoSortTeamRoles,
  sendTeamTracker
  } from '@/lib/discord';

import { sendRegistrationMessages } from '@/lib/discord/messages/registration-tes';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmailSafe(params: any) {
  try {
    await resend.emails.send(params);
  } catch (error) {
    console.error(`Gagal kirim email ke ${params.to}:`, error);
  }
}

// 💡 UBAH JADI GET AGAR BISA DI-RUN LANGSUNG VIA BROWSER
export async function GET(request: NextRequest) {
  try {
    const data = {
      email: "teamwars.indo@gmail.com",
      namaTim: "TEST-OCTAGRAM",
      warna: "#5865F2",
      logoTim: "https://dummyimage.com/400x400/2f3136/ffffff.png&text=Logo+Octagram",
      buktiTransfer: "https://dummyimage.com/600x800/2f3136/ffffff.png&text=Bukti+Transfer+Dummy",
      players: [
        { namaLengkap: "Tsaqif", ign: "OctaTsaqif", discord: "tsaqif.mtz", idDuelLinks: "111222333", role: "Ketua" },
        { namaLengkap: "Wakil Tester", ign: "OctaVice", discord: "wakil.tester123", idDuelLinks: "444555666", role: "Wakil Ketua" },
        { namaLengkap: "Member Tester", ign: "OctaMember", discord: "member.tester123", idDuelLinks: "777888999", role: "Anggota" }
      ]
    };

    const { email, namaTim, warna, logoTim, buktiTransfer, players } = data; 
    const teamSlug = namaTim.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const kvKey = `teams:${teamSlug}`;

    if (await kv.exists(kvKey)) {
      return NextResponse.json({ success: false, errors: [{ field: 'namaTim', message: "Nama tim sudah terdaftar! Hapus dulu di KV jika ingin tes ulang." }] }, { status: 409 });
    }

    const timestampNow = new Date().toISOString(); 
    const editToken = crypto.randomUUID(); 

    // Simpan ke brankas utama Redis
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

    if (players && players.length > 0) {
      const igns = players.map((p: any) => p.ign.toLowerCase());
      const discords = players.map((p: any) => p.discord.toLowerCase());
      const duelLinks = players.map((p: any) => p.idDuelLinks || p.duelId);
      
      if (igns.length) await kv.sadd("global:ign", ...igns);
      if (discords.length) await kv.sadd("global:discord", ...discords);
      if (duelLinks.length) await kv.sadd("global:duellinks", ...duelLinks);
    }

    const ketua = players.find((p: any) => p.role === "Ketua") || { namaLengkap: "-", discord: "-", idDuelLinks: "-", ign: "-" };
    const wakil = players.find((p: any) => p.role === "Wakil Ketua") || { namaLengkap: "-", discord: "-", idDuelLinks: "-", ign: "-" };
    
    const templateData = { 
      namaTim, warna, ketua, wakil, totalRoster: players.length, 
      logoTim, buktiTransfer, players, editToken, teamSlug, createdAt: timestampNow, updatedAt: timestampNow 
    };

    const discordTasks = async () => {
      try {
        console.log("🛠️ [DISCORD TASK] Memulai pembuatan Role...");
        const roleId = await createDiscordRole(namaTim, warna);
        console.log("✅ [DISCORD TASK] Role ID:", roleId);
        
        let channelId = "";
        let voiceChannelId = ""; 
        let trackerMsgId = ""; 

        if (roleId) {
          console.log("🛠️ [DISCORD TASK] Memulai pembuatan Text Channel...");
          channelId = await createDiscordChannel(namaTim, roleId);
          console.log("✅ [DISCORD TASK] Text Channel ID:", channelId);

          console.log("🛠️ [DISCORD TASK] Memulai pembuatan Voice Channel...");
          voiceChannelId = await createDiscordVoiceChannel(namaTim, roleId); 
          console.log("✅ [DISCORD TASK] Voice Channel ID:", voiceChannelId);
          
          if (channelId) {
            console.log("🛠️ [DISCORD TASK] Memulai pengiriman Tracker Message...");
            trackerMsgId = await sendTeamTracker({ channelId, namaTim, warna, roleId, players });
            console.log("✅ [DISCORD TASK] Tracker Msg ID:", trackerMsgId);
          }
        } else {
          console.log("❌ [DISCORD TASK] Proses channel dibatalkan karena Role ID null.");
        }
        
        // 👈 Fungsi webhook diganti dengan pengiriman pesan terpusat
        console.log("🛠️ [DISCORD TASK] Memulai pengiriman Notifikasi Registrasi...");
        await sendRegistrationMessages(templateData);
        console.log("✅ [DISCORD TASK] Notifikasi Registrasi Selesai.");

        await kv.hset(kvKey, { 
          discordRoleId: roleId || "",
          discordChannelId: channelId || "", 
          discordVoiceChannelId: voiceChannelId || "", 
          trackerMsgId: trackerMsgId || "", 
        });

        if (roleId) {
          try {
            console.log("🛠️ [DISCORD TASK] Memulai auto-sort Role...");
            await autoSortTeamRoles();
            console.log(`✅ [DISCORD TASK] Urutan Role di Discord berhasil dirapikan!`);
          } catch (e) {
            console.warn(`⚠️ Role berhasil dibuat, tapi gagal mengurutkan otomatis.`, e); 
          }
        }

      } catch (err) {
        console.error("❌ Gagal tugas Discord Utama:", err);
      }
    };

    await Promise.allSettled([discordTasks()]);
    return NextResponse.json({ success: true, message: "Simulasi Pendaftaran Berhasil Dieksekusi! Cek Terminal Server." });

  } catch (error: unknown) {
    console.error("API Submit Error:", error);
    return NextResponse.json({ success: false, error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
