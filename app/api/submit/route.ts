import { NextResponse, NextRequest } from 'next/server';
import { Resend } from 'resend';
import { kv } from '@vercel/kv';
import { EMAIL_CONFIG } from '@/lib/config';
import { getPesertaTemplate } from '@/lib/email-templates'; 
import { createDiscordRole, createDiscordChannel } from '@/lib/discord-bot';
import { sendAllWebhooks } from '@/lib/discord-webhooks';

// Inisialisasi Resend wajib mengambil dari Environment Variable Vercel
const resend = new Resend(process.env.RESEND_API_KEY);

// Interface khusus agar Frontend tahu alamat pasti letak error-nya
interface ErrorDetail {
  field: string;
  message: string;
}

// Helper pengirim email aman agar jika email error, proses registrasi tim tidak ikut gagal
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
    // 1. PRE-FLIGHT CHECK (Sistem Radar Kolektor Error)
    // ==========================================
    if (data.isPreFlight) {
      const { namaTim, players } = data;
      const errorList: ErrorDetail[] = []; // Keranjang penampung error massal

      if (!namaTim) {
        return NextResponse.json({ success: false, message: "Nama tim kosong." }, { status: 400 });
      }

      const teamSlug = namaTim.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
      
      // A. Pengecekan Nama Tim (Tidak pakai 'return' langsung biar bisa sapu bersih ke bawah)
      if (await kv.exists(`teams:${teamSlug}`)) {
        errorList.push({ 
          field: 'namaTim', 
          message: `Nama tim "${namaTim}" sudah terdaftar! Gunakan nama lain.` 
        });
      }

      // B. Pengecekan Player Massal (Memetakan indeks array player secara spesifik)
      if (players && players.length > 0) {
        for (let i = 0; i < players.length; i++) {
          const p = players[i];
          
          if (p.ign && await kv.sismember("global:ign", p.ign.toLowerCase())) {
            errorList.push({ 
              field: `players.${i}.ign`, 
              message: `IGN "${p.ign}" sudah terdaftar di tim lain!` 
            });
          }
          if (p.discord && await kv.sismember("global:discord", p.discord.toLowerCase())) {
            errorList.push({ 
              field: `players.${i}.discord`, 
              message: `Discord @${p.discord} sudah terdaftar di tim lain!` 
            });
          }
          if (p.idDuelLinks && await kv.sismember("global:duellinks", p.idDuelLinks)) {
            errorList.push({ 
              field: `players.${i}.idDuelLinks`, 
              message: `ID Duel Links ${p.idDuelLinks} sudah terdaftar!` 
            });
          }
        }
      }

      // Jika radar menemukan ada data kembar, kirim daftar borongannya ke frontend
      if (errorList.length > 0) {
        return NextResponse.json({ success: false, errors: errorList }, { status: 409 });
      }
      
      return NextResponse.json({ success: true, message: "Aman, silakan lanjut upload!" });
    }

    // ==========================================
    // 2. MAIN SUBMISSION (Eksekutor Gawang Terakhir & DB Write)
    // ==========================================
    const { email, namaTim, warna, logoTim, buktiTransfer, players } = data; 
    const teamSlug = namaTim.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const kvKey = `teams:${teamSlug}`;

    // Lapisan Keamanan Terakhir: Mencegah Race Condition (Tabrakan waktu kirim submit)
    if (await kv.exists(kvKey)) {
      return NextResponse.json({ 
        success: false, 
        errors: [{ field: 'namaTim', message: "Nama tim mendadak sudah terdaftar! Silakan gunakan nama lain." }] 
      }, { status: 409 });
    }

    // Gembok Data Utama Tim ke Redis
    await kv.hset(kvKey, {
      namaTim: namaTim.trim(),
      warna: warna,
      email: email.trim(),
      logoTim: logoTim, 
      buktiTransfer: buktiTransfer, 
      players: JSON.stringify(players), 
      createdAt: new Date().toISOString(),
      statusVerifikasi: "Pending"
    });

    // Injeksi Sekunder untuk validasi pendaftar berikutnya
    await kv.sadd("global:teams", teamSlug);
    if (players && players.length > 0) {
      const igns = players.map((p: any) => p.ign.toLowerCase());
      const discords = players.map((p: any) => p.discord.toLowerCase());
      const duelLinks = players.map((p: any) => p.idDuelLinks);
      
      if (igns.length) await kv.sadd("global:ign", ...igns);
      if (discords.length) await kv.sadd("global:discord", ...discords);
      if (duelLinks.length) await kv.sadd("global:duellinks", ...duelLinks);
    }

    // Ekstraksi Data Kapten untuk keperluan integrasi luar
    const ketua = players.find((p: any) => p.role === "Ketua") || { namaLengkap: "-", discord: "-", idDuelLinks: "-" };
    const wakil = players.find((p: any) => p.role === "Wakil Ketua") || { namaLengkap: "-", discord: "-", idDuelLinks: "-" };
    const templateData = { namaTim, warna, ketua, wakil, totalRoster: players.length };

    // ==========================================
    // 3. ORKESTRASI PROMISE PARALEL (Mode Eksekutor Langsung)
    // ==========================================
    
    // Pipa Jalur A: Pengiriman Email Peserta
    const emailPromise = email 
      ? sendEmailSafe({ 
          from: EMAIL_CONFIG.sender, 
          to: email, 
          subject: `Status Pendaftaran: Tim ${namaTim} [Teamwars S7]`, 
          html: getPesertaTemplate(templateData) 
        })
      : Promise.resolve();

    // Pipa Jalur B: Rangkaian Ekosistem Discord (Harus berurutan internal agar ID Role didapat)
    const discordTasks = async () => {
      try {
        // Pembuatan Role Warna Tim
        const roleId = await createDiscordRole(namaTim, warna);
        if (roleId) {
          // Pembuatan Private Channel HQ Tim
          await createDiscordChannel(namaTim, roleId);
          // Gembok ID Role ke Redis untuk kebutuhan approval kelak
          await kv.hset(kvKey, { discordRoleId: roleId });
        }
        
        // Sebar Notifikasi ke 4 Webhook Discord (Jeda anti-spam internal 300ms sudah diatur didalam fungsi ini)
        await sendAllWebhooks({ 
          namaTim, 
          warna, 
          ketua, 
          totalRoster: players.length, 
          teamSlug, 
          kvKey,
          logoTim,
          buktiTransfer
        });
      } catch (err) {
        console.error("Gagal menjalankan tugas Bot / Webhook Discord:", err);
      }
    };

    // Tembak kedua pipa besar secara serentak di waktu bersamaan (Sangat menghemat waktu tunggu web)
    await Promise.allSettled([
      emailPromise,
      discordTasks()
    ]);

    // Berikan respons sukses kilat setelah orkestrasi selesai
    return NextResponse.json({ success: true, message: "Pendaftaran berhasil diproses!" });

  } catch (error: unknown) {
    // Standard Lolos Uji Turbopack Next.js Modern
    const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan server internal";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
