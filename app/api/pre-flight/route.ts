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
    const cleanExcludeSlug = excludeSlug ? excludeSlug.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-") : undefined;

    // 1. PENGECEKAN NAMA TIM (Hanya jalan kalau namaTim diisi)
    if (namaTim) {
      const teamSlug = namaTim.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
      
      if ((!cleanExcludeSlug || cleanExcludeSlug !== teamSlug) && await kv.exists(`teams:${teamSlug}`)) {
        errorList.push({ 
          field: 'namaTim', 
          message: `Nama tim "${namaTim}" sudah terdaftar! Gunakan nama lain.` 
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
          
          oldIgns = parsedOldPlayers.map((p: any) => p.ign?.toLowerCase() || "");
          oldDiscords = parsedOldPlayers.map((p: any) => p.discord?.toLowerCase() || "");
          oldDuelLinks = parsedOldPlayers.map((p: any) => p.idDuelLinks || p.duelId || "");
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

    // 3. PENGEMBALIAN HASIL
    // Cek apakah ada error (entah dari Nama Tim ATAU dari Data Pemain)
    if (errorList.length > 0) {
      // Return 200 dengan JSON format errors sesuai ekspektasi frontend lu (TIDAK BOLEH 400/409 karena akan gagal di tangkap catch)
      return NextResponse.json({ success: false, errors: errorList });
    }
    
    return NextResponse.json({ success: true, message: "Aman, silakan lanjut!" });

  } catch (error: unknown) {
    console.error("Pre-Flight Error:", error);
    return NextResponse.json({ success: false, error: "Terjadi kesalahan server saat pre-flight" }, { status: 500 });
  }
}
