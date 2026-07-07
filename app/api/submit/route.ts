import { NextResponse, NextRequest } from 'next/server';
import { Resend } from 'resend';
import { kv } from '@vercel/kv';
import { EMAIL_CONFIG } from '@/lib/config';
import { getPesertaTemplate } from '@/lib/email-templates'; 
import { createDiscordRole, createDiscordChannel } from '@/lib/discord-bot';
import { sendAllWebhooks } from '@/lib/discord-webhooks';

const resend = new Resend(process.env.RESEND_API_KEY);

interface ErrorDetail {
  field: string;
  message: string;
}

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
    // 1. PRE-FLIGHT CHECK
    // ==========================================
    if (data.isPreFlight) {
      const { namaTim, players } = data;
      const errorList: ErrorDetail[] = [];

      if (!namaTim) {
        return NextResponse.json({ success: false, message: "Nama tim kosong." }, { status: 400 });
      }

      const teamSlug = namaTim.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
      
      if (await kv.exists(`teams:${teamSlug}`)) {
        errorList.push({ 
          field: 'namaTim', 
          message: `Nama tim "${namaTim}" sudah terdaftar! Gunakan nama lain.` 
        });
      }

      if (players && players.length > 0) {
        for (let i = 0; i < players.length; i++) {
          const p = players[i];
          if (p.ign && await kv.sismember("global:ign", p.ign.toLowerCase())) {
            errorList.push({ field: `players.${i}.ign`, message: `IGN "${p.ign}" sudah terdaftar!` });
          }
          if (p.discord && await kv.sismember("global:discord", p.discord.toLowerCase())) {
            errorList.push({ field: `players.${i}.discord`, message: `Discord @${p.discord} sudah terdaftar!` });
          }
          if (p.idDuelLinks && await kv.sismember("global:duellinks", p.idDuelLinks)) {
            errorList.push({ field: `players.${i}.idDuelLinks`, message: `ID Duel Links ${p.idDuelLinks} sudah terdaftar!` });
          }
        }
      }

      if (errorList.length > 0) return NextResponse.json({ success: false, errors: errorList }, { status: 409 });
      return NextResponse.json({ success: true, message: "Aman, silakan lanjut upload!" });
    }

    // ==========================================
    // 2. MAIN SUBMISSION
    // ==========================================
    const { email, namaTim, warna, logoTim, buktiTransfer, players } = data; 
    const teamSlug = namaTim.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const kvKey = `teams:${teamSlug}`;

    if (await kv.exists(kvKey)) {
      return NextResponse.json({ success: false, errors: [{ field: 'namaTim', message: "Nama tim sudah terdaftar!" }] }, { status: 409 });
    }

    const timestampNow = new Date().toISOString(); // Waktu pendaftaran seragam

    // Simpan ke brankas utama Redis
    await kv.hset(kvKey, {
      namaTim: namaTim.trim(),
      warna: warna,
      email: email.trim(),
      logoTim: logoTim, 
      buktiTransfer: buktiTransfer, 
      players: JSON.stringify(players), 
      createdAt: timestampNow,
      statusVerifikasi: "Pending"
    });

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
      namaTim, warna, ketua, wakil, totalRoster: players.length, 
      logoTim, buktiTransfer, players 
    };

    // ==========================================
    // 3. ORKESTRASI BACKGROUND TASKS
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
        
        if (roleId) {
          await createDiscordChannel(namaTim, roleId);
        }
        
        // TEMBAK WEBHOOK & TANGKAP MESSAGE ID-NYA
        const webhookMsgIds = await sendAllWebhooks({ 
          namaTim, warna, ketua, wakil, players, 
          totalRoster: players.length, teamSlug, kvKey,
          logoTim, buktiTransfer,
          createdAt: timestampNow // 👈 Wajib agar footer 'Tercatat di sistem' jalan!
        });

        // 🚨 SIMPAN ID PENTING KE REDIS UNTUK FITUR EDIT ROSTER NANTI
        await kv.hset(kvKey, { 
          discordRoleId: roleId || "",
          adminMsgId: webhookMsgIds["Admin"] || "",
          financeMsgId: webhookMsgIds["Finance"] || ""
        });

      } catch (err) {
        console.error("Gagal tugas Discord:", err);
      }
    };

    await Promise.allSettled([emailPromise, discordTasks()]);
    return NextResponse.json({ success: true, message: "Pendaftaran berhasil!" });

  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: "Terjadi kesalahan server" }, { status: 500 });
  }
      }
