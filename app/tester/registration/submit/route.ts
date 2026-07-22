import { NextResponse, NextRequest } from 'next/server';
import { Resend } from 'resend';
import { kv } from '@vercel/kv';
import { getPesertaTemplate } from '@/lib/email-templates'; 
import { createDiscordRole, createDiscordChannel, createDiscordVoiceChannel,
       autoSortTeamRoles, sendTeamTracker } from '@/lib/discord';
import { sendAllRegistrationMessages } from '../bot-registration';

// Cukup ubah di sini saja jika domain berubah
const DOMAIN = "teamwars.web.id";

// Konfigurasi Email
export const EMAIL_CONFIG = {
  from: {
    name: "Team Wars Indonesia",
    email: `registration@${DOMAIN}`, // Pakai backtick agar variabel terbaca
  },
  // Format untuk digunakan di fungsi pengiriman
  sender: `Team Wars Indonesia <registration@${DOMAIN}>`, 
  
  // Daftar tujuan email internal
  to: {
    finance: `finance@${DOMAIN}`,
    creative: `creative@${DOMAIN}`,
    admin: `admin@${DOMAIN}`,
  }
};

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
    const { email, namaTim, warna, logoTim, buktiTransfer, players } = data; 

    // Validasi dasar untuk mencegah server crash jika data kosong
    if (!namaTim || typeof namaTim !== 'string') {
      return NextResponse.json({ success: false, errors: [{ field: 'namaTim', message: "Nama tim wajib diisi!" }] }, { status: 400 });
    }

    // ==========================================
    // 1. MAIN SUBMISSION (NEW TEAM)
    // ==========================================
    const trimmedNamaTim = namaTim.trim();
    
    // Slug Generator yang aman dari spasi dan bersih dari strip di awal/akhir
    const teamSlug = trimmedNamaTim
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+/, "")
      .replace(/-+$/, "");

    const kvKey = `teams:${teamSlug}`;

    if (await kv.exists(kvKey)) {
      return NextResponse.json({ success: false, errors: [{ field: 'namaTim', message: "Nama tim sudah terdaftar!" }] }, { status: 409 });
    }

    const timestampNow = new Date().toISOString(); 
    const editToken = crypto.randomUUID(); 

    // Simpan ke brankas utama Redis
    await kv.hset(kvKey, {
      namaTim: trimmedNamaTim,
      warna: warna,
      email: email ? email.trim() : "",
      logoTim: logoTim, 
      buktiTransfer: buktiTransfer, 
      players: JSON.stringify(players), 
      createdAt: timestampNow,
      updatedAt: timestampNow,
      statusVerifikasi: "Pending",
      editToken: editToken
    });

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
    
    const templateData = { 
      namaTim: trimmedNamaTim, warna, ketua, wakil, totalRoster: players.length, 
      logoTim, buktiTransfer, players, editToken 
    };

    // ==========================================
    // 2. ORKESTRASI BACKGROUND TASKS
    // ==========================================
    const emailPromise = email 
      ? sendEmailSafe({ 
          from: EMAIL_CONFIG.sender, 
          to: email, 
          subject: `Status Pendaftaran: Tim ${trimmedNamaTim} [Teamwars S7]`, 
          html: getPesertaTemplate(templateData) 
        })
      : Promise.resolve();

    const discordTasks = async () => {
      try {
        const roleId = await createDiscordRole(trimmedNamaTim, warna);
        
        let channelId = "";
        let voiceChannelId = ""; 
        let trackerMsgId = ""; 

        if (roleId) {
          channelId = await createDiscordChannel(trimmedNamaTim, roleId);
          voiceChannelId = await createDiscordVoiceChannel(trimmedNamaTim, roleId); 
          
          if (channelId) {
            trackerMsgId = await sendTeamTracker({
              channelId,
              namaTim: trimmedNamaTim,
              warna,
              roleId,
              players
            });
          }
        }
        
        // Eksekusi pengiriman pesan Discord Bot API (Sudah otomatis paralel di dalam fungsinya)
             const msgIds = await sendAllRegistrationMessages({
                    namaTim: trimmedNamaTim, warna, ketua, wakil, players,
                    totalRoster: players.length, teamSlug,
                    logoTim, buktiTransfer, createdAt: timestampNow
             });
             
        // Simpan semua ID penting ke Redis
             await kv.hset(kvKey, {
                    discordRoleId: roleId || "",
                    discordChannelId: channelId,
                    discordVoiceChannelId: voiceChannelId,
                    trackerMsgId: trackerMsgId,
                    adminMsgId: msgIds.rosterMsgId || "",
                    financeMsgId: msgIds.financeMsgId || "",
                    creativeMsgId: msgIds.creativeMsgId || "",
                    publicMsgId: msgIds.logMsgId || ""
                    });

        try {
          await autoSortTeamRoles();
          console.log(`✨ Urutan Role di Discord berhasil dirapikan!`);
        } catch (e) {
          console.warn(`⚠️ Role berhasil dibuat, tapi gagal mengurutkan otomatis.`); 
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
