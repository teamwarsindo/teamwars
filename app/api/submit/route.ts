import { NextResponse, NextRequest } from 'next/server';
import { Resend } from 'resend';
import { kv } from '@vercel/kv';
import { EMAIL_CONFIG } from '@/lib/config';
import { getPesertaTemplate } from '@/lib/email-templates'; 
import { createDiscordRole, createDiscordChannel, createDiscordVoiceChannel, autoSortTeamRoles } from '@/lib/discord-bot';
import { sendAllWebhooks } from '@/lib/discord-webhooks';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmailSafe(params: any) {
  try {
    await resend.emails.send(params);
  } catch (error) {
    console.error(`Gagal kirim email ke ${params.to}:`, error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // ==========================================
    // 1. MAIN SUBMISSION (NEW TEAM)
    // ==========================================
    const { email, namaTim, warna, logoTim, buktiTransfer, players } = data; 
    const teamSlug = namaTim.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const kvKey = `teams:${teamSlug}`;

    if (await kv.exists(kvKey)) {
      return NextResponse.json({ success: false, errors: [{ field: 'namaTim', message: "Nama tim sudah terdaftar!" }] }, { status: 409 });
    }

    const timestampNow = new Date().toISOString(); 
    const editToken = crypto.randomUUID(); // 👈 Generate Token Rahasia

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
      editToken: editToken // 👈 Token diamankan di dalam brankas tim
    });

    // ⚡ INJEKSI ANTI-BENGKAK: Mapping Token & Summary List
    await kv.set(`token:map:${editToken}`, teamSlug);

    // Injeksi Index Sekunder
    await kv.sadd("global:teams", teamSlug);
    if (players && players.length > 0) {
      const igns = players.map((p: any) => p.ign.toLowerCase());
      const discords = players.map((p: any) => p.discord.toLowerCase());
      const duelLinks = players.map((p: any) => p.idDuelLinks || p.duelId);
      
      if (igns.length) await kv.sadd("global:ign", ...igns);
      if (discords.length) await kv.sadd("global:discord", ...discords);
      if (duelLinks.length) await kv.sadd("global:duellinks", ...duelLinks);
    }

    const ketua = players.find((p: any) => p.role === "Ketua") || { namaLengkap: "-", discord: "-", idDuelLinks: "-" };
    const wakil = players.find((p: any) => p.role === "Wakil Ketua") || { namaLengkap: "-", discord: "-", idDuelLinks: "-" };
    
    // 👈 Lempar editToken ke template agar disisipkan sebagai Link Edit
    const templateData = { 
      namaTim, warna, ketua, wakil, totalRoster: players.length, 
      logoTim, buktiTransfer, players, editToken 
    };

    // ==========================================
    // 2. ORKESTRASI BACKGROUND TASKS
    // ==========================================
    const emailPromise = email 
      ? sendEmailSafe({ 
          from: EMAIL_CONFIG.sender, 
          to: email, 
          subject: `Status Pendaftaran: Tim ${namaTim} [Teamwars S7]`, 
          html: getPesertaTemplate(templateData) 
        })
      : Promise.resolve();

    const discordTasks = async () => {
      try {
        const roleId = await createDiscordRole(namaTim, warna);
        
        // ⚡ DEKLARASIKAN VARIABEL DI LUAR BLOK 'IF'
        let channelId = "";
        let voiceChannelId = ""; // Variabel baru untuk Voice Channel

        if (roleId) {
          // Isi nilainya di dalam sini
          channelId = await createDiscordChannel(namaTim, roleId);
          voiceChannelId = await createDiscordVoiceChannel(namaTim, roleId); 
        }
        
        // TEMBAK WEBHOOK & TANGKAP MESSAGE ID-NYA
        const webhookMsgIds = await sendAllWebhooks({ 
          namaTim, warna, ketua, wakil, players, 
          totalRoster: players.length, teamSlug, kvKey,
          logoTim, buktiTransfer,
          createdAt: timestampNow 
        });

        // 🚨 SIMPAN SEMUA ID PENTING KE REDIS
        if (webhookMsgIds) {
          await kv.hset(kvKey, { 
            discordRoleId: roleId || "",
            discordChannelId: channelId, // 👈 Sekarang sudah tidak error
            discordVoiceChannelId: voiceChannelId, // 👈 Voice channel ikut tersimpan
            adminMsgId: webhookMsgIds["Admin"] || "",
            financeMsgId: webhookMsgIds["Finance"] || "",
            creativeMsgId: webhookMsgIds["Creative"] || "",
            publicMsgId: webhookMsgIds["Public"] || ""
          });

          try {
            await autoSortTeamRoles();
            console.push(`✨ Urutan Role di Discord berhasil dirapikan!`);
          } catch (e) {
            console.push(`⚠️ Role berhasil dibuat, tapi gagal mengurutkan otomatis.`);
          }
        }
      } catch (err) {
        console.error("Gagal tugas Discord:", err);
      }
    };

    await Promise.allSettled([emailPromise, discordTasks()]);
    return NextResponse.json({ success: true, message: "Pendaftaran berhasil!" });

  } catch (error: unknown) {
    console.error("API Submit Error:", error);
    return NextResponse.json({ success: false, error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
