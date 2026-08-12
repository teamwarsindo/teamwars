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

import { sendFinanceMessage } from '@/lib/discord/messages/finance';
import { sendCreativeMessage } from '@/lib/discord/messages/creative';
import { sendRosterMessage } from '@/lib/discord/messages/roster';

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
    const { email, namaTim, warna, logoTim, buktiTransfer, players, channelId: customChannelId } = data; 

    if (!namaTim || typeof namaTim !== 'string') {
      return NextResponse.json({ success: false, errors: [{ field: 'namaTim', message: "Nama tim wajib diisi!" }] }, { status: 400 });
    }

    const trimmedNamaTim = namaTim.trim();
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
      statusVerifikasi: "Pending",
      editToken: editToken
    });

    await kv.set(`token:map:${editToken}`, teamSlug);
    await kv.sadd("global:teams", teamSlug);

    // ==========================================
    // INJEKSI INDEX SEKUNDER (HSET Untuk Tipe HASH)
    // ==========================================
    if (players && players.length > 0) {
      const discordMap: Record<string, string> = {};
      const ignMap: Record<string, string> = {};
      const duelLinksMap: Record<string, string> = {};

      players.forEach((p: any) => {
        if (p.discord) discordMap[p.discord.toLowerCase()] = teamSlug;
        if (p.ign) ignMap[p.ign.toLowerCase()] = teamSlug;
        
        const dlId = p.idDuelLinks || p.duelId;
        if (dlId) duelLinksMap[dlId.toString().toLowerCase()] = teamSlug;
      });

      if (Object.keys(discordMap).length > 0) await kv.hset("global:discord", discordMap);
      if (Object.keys(ignMap).length > 0) await kv.hset("global:ign", ignMap);
      if (Object.keys(duelLinksMap).length > 0) await kv.hset("global:duellinks", duelLinksMap);
    }

    const ketua = players.find((p: any) => p.role === "Ketua") || { namaLengkap: "-", discord: "-", idDuelLinks: "-" };
    const wakil = players.find((p: any) => p.role === "Wakil Ketua") || { namaLengkap: "-", discord: "-", idDuelLinks: "-" };
    
    const templateData = { 
      namaTim: trimmedNamaTim, warna, ketua, wakil, totalRoster: players.length, 
      logoTim, buktiTransfer, players, editToken 
    };

    // Orkestrasi Background Tasks (Email & Discord)
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
            trackerMsgId = await sendTeamTracker({ channelId, namaTim: trimmedNamaTim, warna, roleId, players, createdAt: timestampNow });
          }
        }
        
        const [financeId, creativeId, rosterId] = await Promise.all([
          sendFinanceMessage({ namaTim: trimmedNamaTim, warna, buktiTransfer, teamSlug, channelId: customChannelId }),
          sendCreativeMessage({ namaTim: trimmedNamaTim, warna, logoTim, channelId: customChannelId }),
          sendRosterMessage({ namaTim: trimmedNamaTim, warna, ketua, wakil, players, logoTim, createdAt: timestampNow, channelId: customChannelId })
        ]);

        await kv.hset(kvKey, { 
          discordRoleId: roleId,
          discordChannelId: channelId, 
          discordVoiceChannelId: voiceChannelId, 
          trackerMsgId: trackerMsgId, 
          adminMsgId: rosterId,
          financeMsgId: financeId,
          creativeMsgId: creativeId
        });

        try { await autoSortTeamRoles(); } catch (e) { console.warn("Gagal mengurutkan otomatis."); }
      } catch (err) { console.error("Gagal tugas Discord:", err); }
    };

    await Promise.allSettled([emailPromise, discordTasks()]);
    return NextResponse.json({ success: true, message: "Pendaftaran berhasil!" });

  } catch (error: unknown) {
    console.error("API Submit Error:", error);
    return NextResponse.json({ success: false, error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
