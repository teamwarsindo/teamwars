import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic';

export async function GET() {
  const logs: string[] = [];
  const fixedTeams: { old: string, new: string }[] = [];

  try {
    logs.push("🔍 Memulai proses pengecekan langsung dari Keys Database...");

    // 1. Tarik SEMUA keys yang berawalan 'teams:' langsung dari akar database
    const allKeys = await kv.keys('teams:*');
    
    if (!allKeys || allKeys.length === 0) {
      return NextResponse.json({ message: "Tidak ada data tim di database." });
    }

    // 2. Loop semua keys yang ditemukan
    for (const key of allKeys) {
      // Key formatnya adalah "teams:nama-slug", jadi kita hapus "teams:" untuk mengekstrak slug-nya
      const oldSlug = key.replace('teams:', '');
      
      // Mengecek apakah slug kotor (berakhiran -)
      if (oldSlug.endsWith('-')) {
        // Membersihkan tanda hubung di akhir teks
        const fixedSlug = oldSlug.replace(/-+$/, '');
        
        logs.push(`⚠️ Ditemukan key kotor: '${key}'. Memperbaiki menjadi 'teams:${fixedSlug}'...`);

        // 3. Tarik data mentah dari key lama
        const teamData: any = await kv.hgetall(key);

        if (teamData) {
          // 4. Pindah data ke key baru yang sudah bersih
          await kv.hset(`teams:${fixedSlug}`, teamData);

          // 5. Pastikan index global:teams juga sinkron (Hapus yang kotor, masukkan yang bersih)
          await kv.srem('global:teams', oldSlug);
          await kv.sadd('global:teams', fixedSlug);

          // 6. Hapus key lama yang kotor dari database
          await kv.del(key);

          fixedTeams.push({ old: oldSlug, new: fixedSlug });
          logs.push(`✅ Sukses memigrasi data ke 'teams:${fixedSlug}'`);
        } else {
          logs.push(`❌ Gagal menarik data dari '${key}', dilewati.`);
        }
      }
    }

    logs.push("🏁 Pengecekan selesai!");

    return NextResponse.json({
      success: true,
      message: fixedTeams.length > 0 
        ? `Berhasil memperbaiki ${fixedTeams.length} slug kotor!` 
        : "Semua slug sudah bersih, tidak ada yang perlu diperbaiki.",
      fixed_data: fixedTeams,
      detail_log: logs
    });

  } catch (error: any) {
    console.error("Fix Slugs Error:", error);
    logs.push(`🔥 FATAL ERROR: ${error.message}`);
    return NextResponse.json({ error: "Internal Server Error", detail_log: logs }, { status: 500 });
  }
}
