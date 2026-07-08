import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const { token, players } = payload;

    if (!token) return NextResponse.json({ error: "Akses ditolak. Token hilang." }, { status: 400 });

    // 1. Cari slug dari token
    const teamSlug = await kv.get(`token:map:${token}`);
    if (!teamSlug) return NextResponse.json({ error: "Sesi edit tidak valid/kadaluarsa." }, { status: 403 });

    // 2. Tarik data roster LAMA dari database
    const oldTeamData: any = await kv.hgetall(`teams:${teamSlug}`);
    if (!oldTeamData) return NextResponse.json({ error: "Tim tidak ditemukan." }, { status: 404 });
    
    // Pastikan format array (Vercel KV kadang mereturn string jika diset via stringify)
    const oldPlayers = typeof oldTeamData.players === "string" ? JSON.parse(oldTeamData.players) : oldTeamData.players;

    // ==========================================================
    // 3. LOGIKA ARRAY DIFFING (Sesuai PDF Poin 1)
    // ==========================================================
    // Kumpulkan data lama
    const oldIgns = oldPlayers.map((p: any) => p.ign.toLowerCase());
    const oldDiscords = oldPlayers.map((p: any) => p.discord.toLowerCase());
    const oldDuelIds = oldPlayers.map((p: any) => p.idDuelLinks || p.duelId);

    // Kumpulkan data baru
    const newIgns = players.map((p: any) => p.ign.toLowerCase());
    const newDiscords = players.map((p: any) => p.discord.toLowerCase());
    const newDuelIds = players.map((p: any) => p.idDuelLinks || p.duelId);

    // A. Cari Data yang DIBUANG (Ada di lama, TIDAK ADA di baru)
    const ignsToRemove = oldIgns.filter((ign: string) => !newIgns.includes(ign));
    const discordsToRemove = oldDiscords.filter((d: string) => !newDiscords.includes(d));
    const duelIdsToRemove = oldDuelIds.filter((id: string) => !newDuelIds.includes(id));

    // B. Cari Data BARU MASUK (Ada di baru, TIDAK ADA di lama)
    const ignsToAdd = newIgns.filter((ign: string) => !oldIgns.includes(ign));
    const discordsToAdd = newDiscords.filter((d: string) => !oldDiscords.includes(d));
    const duelIdsToAdd = newDuelIds.filter((id: string) => !oldDuelIds.includes(id));

    // ==========================================================
    // 4. EKSEKUSI PENGHAPUSAN (SREM) & PENAMBAHAN (SADD) INDEX
    // ==========================================================
    // Hapus data hantu agar tidak memblokir orang lain
    if (ignsToRemove.length > 0) await kv.srem("global:ign", ...ignsToRemove);
    if (discordsToRemove.length > 0) await kv.srem("global:discord", ...discordsToRemove);
    if (duelIdsToRemove.length > 0) await kv.srem("global:duelId", ...duelIdsToRemove);

    // Kunci data pemain baru masuk
    if (ignsToAdd.length > 0) await kv.sadd("global:ign", ...ignsToAdd);
    if (discordsToAdd.length > 0) await kv.sadd("global:discord", ...discordsToAdd);
    if (duelIdsToAdd.length > 0) await kv.sadd("global:duelId", ...duelIdsToAdd);

    // ==========================================================
    // 5. SIMPAN HASIL AKHIR KE DATABASE UTAMA
    // ==========================================================
    // Catatan: Identitas (nama, logo, dll) tidak disentuh agar aman.
    await kv.hset(`teams:${teamSlug}`, {
      players: players, // Update murni pada roster
      updatedAt: new Date().toISOString()
    });

    // ==========================================================
    // 6. CACHE BUSTER (Sesuai PDF Poin 5)
    // ==========================================================
    revalidatePath("/admin-dashboard"); // Ganti jika path dashboard admin lu beda
    
    // (Opsional) Lempar Webhook ke channel Discord kalau lu mau ngabarin admin
    // await fetch(process.env.DISCORD_WEBHOOK_ADMIN, { ... })

    return NextResponse.json({ success: true, message: "Roster berhasil diperbarui!" });
    
  } catch (error: any) {
    console.error("Update Team Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal saat update." }, { status: 500 });
  }
}
