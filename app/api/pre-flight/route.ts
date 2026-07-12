import { NextResponse, NextRequest } from 'next/server';
import { kv } from '@vercel/kv';

interface ErrorDetail {
  field: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { namaTim, players, excludeSlug } = data;
    const errorList: ErrorDetail[] = [];

    // Bersihkan excludeSlug di awal agar bisa dipakai di seluruh pengecekan
    const cleanExcludeSlug = excludeSlug ? excludeSlug.trim().toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-") : undefined;

    // 1. PENGECEKAN NAMA TIM (Hanya jalan kalau namaTim diisi)
    if (namaTim && namaTim.trim()) {
      const cleanNamaTim = namaTim.trim();
      const teamSlug = cleanNamaTim.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
      
      if ((!cleanExcludeSlug || cleanExcludeSlug !== teamSlug) && await kv.exists(`teams:${teamSlug}`)) {
        errorList.push({ 
          field: 'namaTim', 
          message: `Nama tim "${cleanNamaTim}" sudah terdaftar! Gunakan nama lain.` 
        });
      }
    }

    // 2. PENGECEKAN PEMAIN (Akan selalu jalan walau namaTim kosong)
    if (players && players.length > 0) {
      let oldIgns: string[] = [];
      let oldDiscords: string[] = [];
      let oldDuelLinks: string[] = [];

      if (cleanExcludeSlug) {
        const oldData: any = await kv.hgetall(`teams:${cleanExcludeSlug}`);
        if (oldData && oldData.players) {
          const parsedOldPlayers = typeof oldData.players === "string" ? JSON.parse(oldData.players) : oldData.players;
          
          // Tambahkan trim() juga saat narik data lama untuk memastikan komparasi bersih 100%
          oldIgns = parsedOldPlayers.map((p: any) => p.ign?.trim().toLowerCase() || "");
          oldDiscords = parsedOldPlayers.map((p: any) => p.discord?.trim().toLowerCase() || "");
          oldDuelLinks = parsedOldPlayers.map((p: any) => (p.idDuelLinks || p.duelId || "").trim());
        }
      }

      for (let i = 0; i < players.length; i++) {
        const p = players[i];
        
        // 🎯 Terapkan trim pada setiap input sebelum dicek
        const cleanIgn = p.ign ? p.ign.trim() : "";
        const cleanDiscord = p.discord ? p.discord.trim() : "";
        const cleanDuelId = p.idDuelLinks ? p.idDuelLinks.trim() : "";
        
        if (cleanIgn && !oldIgns.includes(cleanIgn.toLowerCase()) && await kv.sismember("global:ign", cleanIgn.toLowerCase())) {
          errorList.push({ field: `players.${i}.ign`, message: `IGN "${cleanIgn}" sudah terdaftar!` });
        }
        
        if (cleanDiscord && !oldDiscords.includes(cleanDiscord.toLowerCase()) && await kv.sismember("global:discord", cleanDiscord.toLowerCase())) {
          errorList.push({ field: `players.${i}.discord`, message: `Discord @${cleanDiscord} sudah terdaftar!` });
        }
        
        if (cleanDuelId && !oldDuelLinks.includes(cleanDuelId) && await kv.sismember("global:duellinks", cleanDuelId)) {
          errorList.push({ field: `players.${i}.idDuelLinks`, message: `ID Duel Links ${cleanDuelId} sudah terdaftar!` });
        }
      }
    }

    // 3. PENGEMBALIAN HASIL
    if (errorList.length > 0) {
      return NextResponse.json({ success: false, errors: errorList });
    }
    
    return NextResponse.json({ success: true, message: "Aman, silakan lanjut!" });

  } catch (error: unknown) {
    console.error("Pre-Flight Error:", error);
    return NextResponse.json({ success: false, error: "Terjadi kesalahan server saat pre-flight" }, { status: 500 });
  }
}
