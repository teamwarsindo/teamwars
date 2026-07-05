import { NextResponse, NextRequest } from 'next/server';
import { Resend } from 'resend';
import { kv } from '@vercel/kv';
import { EMAIL_CONFIG } from '@/lib/config';
import { getPesertaTemplate } from '@/lib/email-templates'; 

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmailSafe(params: any) {
  try {
    await resend.emails.send(params);
  } catch (error) {
    console.error(`Gagal kirim email ke ${params.to}:`, error);
  }
}

async function sendToDiscord(webhookUrl: string | undefined, message: string) {
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message })
    });
  } catch (error) {
    console.error("Gagal kirim webhook Discord:", error);
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
    // 2. MAIN SUBMISSION (Simpan ke DB & Kirim Email)
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
      players: players, // players boleh di-stringify karena array
      createdAt: new Date().toISOString(),
      statusVerifikasi: "Pending"
    });

    
    // Injeksi Index Sekunder untuk Pre-Flight berikutnya
    await kv.sadd("global:teams", teamSlug);
    if (players && players.length > 0) {
      const igns = players.map((p: any) => p.ign.toLowerCase());
      const discords = players.map((p: any) => p.discord.toLowerCase());
      const duelLinks = players.map((p: any) => p.idDuelLinks);
      
      if (igns.length) await kv.sadd("global:ign", ...igns);
      if (discords.length) await kv.sadd("global:discord", ...discords);
      if (duelLinks.length) await kv.sadd("global:duellinks", ...duelLinks);
    }

    // Ekstraksi Data Email
    const ketua = players.find((p: any) => p.role === "Ketua") || { namaLengkap: "-", discord: "-", idDuelLinks: "-" };
    const wakil = players.find((p: any) => p.role === "Wakil Ketua") || { namaLengkap: "-", discord: "-", idDuelLinks: "-" };
    const templateData = { namaTim, email, warna, ketua, wakil, logoTim, buktiTransfer, players, kvKey };

    // Eksekusi Background: 1 Email untuk Peserta, 3 Webhook untuk Panitia
    context.waitUntil((async () => {
      
      // 1. Email Eksklusif Peserta
      if (email) {
        await sendEmailSafe({ 
          from: EMAIL_CONFIG.sender, 
          to: email, 
          subject: `Status Pendaftaran: Tim ${namaTim} [Teamwars S7]`, 
          html: getPesertaTemplate(templateData) 
        });
      }

      // 2. Webhook Admin / General (Notifikasi Utama)
      await sendToDiscord(
        process.env.WEBHOOK_ADMIN, 
        `📢 **Tim ${namaTim}** telah mendaftar ke TWI Season 7 dengan **${players.length} pemain**! 🔥`
      );

      // 3. Webhook Finance (Cek Pembayaran)
      await sendToDiscord(
        process.env.WEBHOOK_FINANCE, 
        `💰 **Verifikasi Finance:** Cek mutasi masuk dari tim **${namaTim}**.\nKontak: ${ketua.namaLengkap} (@${ketua.discord})\nLink Bukti Transfer: ${buktiTransfer}`
      );

      // 4. Webhook Creative (Aset Desain)
      await sendToDiscord(
        process.env.WEBHOOK_CREATIVE, 
        `🎨 **Aset Baru Masuk:** Logo dari tim **${namaTim}**.\nKode Warna: \`${warna}\`\nLink Master Logo: ${logoTim}`
      );

    })());

    return NextResponse.json({ success: true, message: "Pendaftaran berhasil diproses!" });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
