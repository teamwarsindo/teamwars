import { NextResponse, NextRequest } from 'next/server';
import { Resend } from 'resend';
import { kv } from '@vercel/kv';
import { EMAIL_CONFIG } from '@/lib/config';
import { getPesertaTemplate } from '@/lib/email-templates'; 
import { createDiscordRole, createDiscordChannel } from '@/lib/discord-bot';
import { sendAllWebhooks } from '@/lib/discord-webhooks';

const resend = new Resend(process.env.RESEND_API_KEY);

// Fungsi Helper Email tetap dipertahankan
async function sendEmailSafe(params: any) {
  try {
    await resend.emails.send(params);
  } catch (error) {
    console.error(`Gagal kirim email ke ${params.to}:`, error);
  }
}

export async function POST(request: NextRequest, context: any) {
  try {
    const data = await request.json();

    // ==========================================
    // 1. PRE-FLIGHT CHECK (Validasi Duplikat Instan)
    // ==========================================
    if (data.isPreFlight) {
      const { namaTim, players } = data;
      if (!namaTim) return NextResponse.json({ success: false, message: "Nama tim kosong." }, { status: 400 });

      const teamSlug = namaTim.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
      
      // Pengecekan Tim
      if (await kv.exists(`teams:${teamSlug}`)) {
        return NextResponse.json({ success: false, message: "Nama tim sudah terdaftar!" }, { status: 409 });
      }

      // Pengecekan Player (IGN, Discord, Duel Links)
      if (players && players.length > 0) {
        for (const p of players) {
          if (await kv.sismember("global:ign", p.ign.toLowerCase())) return NextResponse.json({ success: false, message: `IGN ${p.ign} sudah terdaftar!` }, { status: 409 });
          if (await kv.sismember("global:discord", p.discord.toLowerCase())) return NextResponse.json({ success: false, message: `Discord ${p.discord} sudah terdaftar!` }, { status: 409 });
          if (await kv.sismember("global:duellinks", p.idDuelLinks)) return NextResponse.json({ success: false, message: `ID Duel Links ${p.idDuelLinks} sudah terdaftar!` }, { status: 409 });
        }
      }
      
      return NextResponse.json({ success: true, message: "Aman, silakan lanjut upload!" });
    }

    // ==========================================
    // 2. MAIN SUBMISSION (Simpan ke DB)
    // ==========================================
    const { email, namaTim, warna, logoTim, buktiTransfer, players } = data; 
    const teamSlug = namaTim.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const kvKey = `teams:${teamSlug}`;

    // Lapisan Keamanan Tambahan
    if (await kv.exists(kvKey)) {
      return NextResponse.json({ success: false, message: "Nama tim sudah terdaftar!" }, { status: 409 });
    }

    // Simpan Data Utama Tim
    await kv.hset(kvKey, {
      namaTim: namaTim.trim(),
      warna: warna,
      email: email.trim(),
      logoTim: logoTim, 
      buktiTransfer: buktiTransfer, 
      players: JSON.stringify(players), // WAJIB stringify biar KV gak baca [object Object]
      createdAt: new Date().toISOString(),
      statusVerifikasi: "Pending"
    });

    // Injeksi Index Sekunder
    await kv.sadd("global:teams", teamSlug);
    if (players && players.length > 0) {
      const igns = players.map((p: any) => p.ign.toLowerCase());
      const discords = players.map((p: any) => p.discord.toLowerCase());
      const duelLinks = players.map((p: any) => p.idDuelLinks);
      
      if (igns.length) await kv.sadd("global:ign", ...igns);
      if (discords.length) await kv.sadd("global:discord", ...discords);
      if (duelLinks.length) await kv.sadd("global:duellinks", ...duelLinks);
    }

    // Ekstraksi Data buat Email & Notif
    const ketua = players.find((p: any) => p.role === "Ketua") || { namaLengkap: "-", discord: "-", idDuelLinks: "-" };
    const wakil = players.find((p: any) => p.role === "Wakil Ketua") || { namaLengkap: "-", discord: "-", idDuelLinks: "-" };

    // ==========================================
    // 3. ASYNC BACKGROUND TASKS (Email, Webhooks & Bot)
    // ==========================================
    const backgroundTasks = async () => {
      // A. Eksekusi Email Eksklusif
      if (email) {
        await sendEmailSafe({ 
          from: EMAIL_CONFIG.sender, 
          to: email, 
          subject: `Status Pendaftaran: Tim ${namaTim} [Teamwars S7]`, 
          html: getPesertaTemplate({ namaTim, warna, ketua, wakil, totalRoster: players.length }) 
        });
      }

      // B. Otomatisasi Bot Discord (Bikin Role & Channel)
      const roleId = await createDiscordRole(namaTim, warna);
      if (roleId) {
        await createDiscordChannel(namaTim, roleId);
        // Update Redis dengan ID Role biar panitia gampang manage nantinya
        await kv.hset(kvKey, { discordRoleId: roleId });
      }

      // C. Tembak 4 Webhook Premium Sekaligus
      await sendAllWebhooks({ 
        namaTim, 
        warna, 
        ketua, 
        totalRoster: players.length, 
        teamSlug, 
        kvKey,
        logoTim,         // <-- TAMBAHIN INI
        buktiTransfer    // <-- TAMBAHIN INI
      });

    // Eksekusi Non-Blocking (Anti-Timeout)
    if (context?.waitUntil) {
      context.waitUntil(backgroundTasks());
    } else {
      // Fallback aman untuk runtime Node.js biasa
      backgroundTasks().catch(console.error);
    }

    // Respons Kilat ke Frontend User
    return NextResponse.json({ success: true, message: "Pendaftaran berhasil diproses!" });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
