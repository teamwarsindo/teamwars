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
    // 1. PRE-FLIGHT CHECK (SMART SELF-EXCLUSION)
    // ==========================================
    if (data.isPreFlight) {
      const { namaTim, players, excludeSlug } = data;
      const errorList: ErrorDetail[] = [];

      if (!namaTim) {
        return NextResponse.json({ success: false, message: "Nama tim kosong." }, { status: 400 });
      }

      const teamSlug = namaTim.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
      
      // Cek duplikat nama tim (Abaikan jika slug sama dengan tim yang sedang diedit)
      if ((!excludeSlug || excludeSlug !== teamSlug) && await kv.exists(`teams:${teamSlug}`)) {
        errorList.push({ 
          field: 'namaTim', 
          message: `Nama tim "${namaTim}" sudah terdaftar! Gunakan nama lain.` 
        });
      }

      if (players && players.length > 0) {
        // Ambil data lama jika ini mode Edit (excludeSlug ada) untuk diabaikan
        let oldIgns: string[] = [];
        let oldDiscords: string[] = [];
        let oldDuelLinks: string[] = [];

        if (excludeSlug) {
          const oldData: any = await kv.hgetall(`teams:${excludeSlug}`);
          if (oldData && oldData.players) {
            const parsedOldPlayers = JSON.parse(oldData.players);
            oldIgns = parsedOldPlayers.map((p: any) => p.ign.toLowerCase());
            oldDiscords = parsedOldPlayers.map((p: any) => p.discord.toLowerCase());
            oldDuelLinks = parsedOldPlayers.map((p: any) => p.idDuelLinks || p.duelId);
          }
        }

        for (let i = 0; i < players.length; i++) {
          const p = players[i];
          
          if (p.ign && !oldIgns.includes(p.ign.toLowerCase()) && await kv.sismember("global:ign", p.ign.toLowerCase())) {
            errorList.push({ field: `players.${i}.ign`, message: `IGN "${p.ign}" sudah terdaftar!` });
          }
          if (p.discord && !oldDiscords.includes(p.discord.toLowerCase()) && await kv.sismember("global:discord", p.discord.toLowerCase())) {
            errorList.push({ field: `players.${i}.discord`, message: `Discord @${p.discord} sudah terdaftar!` });
          }
          if (p.idDuelLinks && !oldDuelLinks.includes(p.idDuelLinks) && await kv.sismember("global:duellinks", p.idDuelLinks)) {
            errorList.push({ field: `players.${i}.idDuelLinks`, message: `ID Duel Links ${p.idDuelLinks} sudah terdaftar!` });
          }
        }
      }

      if (errorList.length > 0) return NextResponse.json({ success: false, errors: errorList }, { status: 409 });
      return NextResponse.json({ success: true, message: "Aman, silakan lanjut upload!" });
    }

    // ==========================================
    // 2. MAIN SUBMISSION (NEW TEAM)
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

    const rawSummary: any = await kv.get("global:summary_list");
    const summaryList = Array.isArray(rawSummary) ? rawSummary : [];
    summaryList.push({
      namaTim: namaTim.trim(),
      teamSlug: teamSlug,
      statusVerifikasi: "Pending",
      createdAt: timestampNow
    });
    await kv.set("global:summary_list", JSON.stringify(summaryList));

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
          createdAt: timestampNow 
        });

        // 🚨 SIMPAN SEMUA ID PENTING KE REDIS
        await kv.hset(kvKey, { 
          discordRoleId: roleId || "",
          adminMsgId: webhookMsgIds["Admin"] || "",
          financeMsgId: webhookMsgIds["Finance"] || "",
          creativeMsgId: webhookMsgIds["Creative"] || "",
          publicMsgId: webhookMsgIds["Public"] || ""
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
                            
  
