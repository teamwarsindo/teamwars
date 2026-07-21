import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic';

export async function GET() {
  const logs: string[] = [];
  const fixedTeams: { old: string, new: string }[] = [];

  try {
    logs.push("🔍 Memulai proses pengecekan slug tim...");

    // 1. Tarik semua daftar slug tim dari database
    const allSlugs = await kv.smembers('global:teams');
    
    if (!allSlugs || allSlugs.length === 0) {
      return NextResponse.json({ message: "Tidak ada data tim di database." });
    }

    // 2. Lakukan perulangan untuk mengecek setiap slug
    for (const oldSlug of allSlugs) {
      
      // Mengecek apakah slug diakhiri dengan satu atau lebih tanda hubung (-)
      if (oldSlug.endsWith('-')) {
        // Membersihkan tanda hubung di akhir teks
        const fixedSlug = oldSlug.replace(/-+$/, '');
        
        logs.push(`⚠️ Ditemukan slug kotor: '${oldSlug}'. Memperbaiki menjadi '${fixedSlug}'...`);

        // 3. Tarik data tim menggunakan slug lama
        const teamData: any = await kv.hgetall(`teams:${oldSlug}`);

        if (teamData) {
          // 4. Pindahkan data ke key dengan slug yang baru (bersih)
          await kv.hset(`teams:${fixedSlug}`, teamData);

          // 5. Update daftar global:teams (Hapus yang lama, masukkan yang baru)
          await kv.srem('global:teams', oldSlug);
          await kv.sadd('global:teams', fixedSlug);

          // 6. Hapus data dengan key lama agar tidak nyampah di database
          await kv.del(`teams:${oldSlug}`);

          fixedTeams.push({ old: oldSlug, new: fixedSlug });
          logs.push(`✅ Sukses memigrasi data tim ke slug '${fixedSlug}'`);
        } else {
          logs.push(`❌ Gagal menarik data untuk slug '${oldSlug}', dilewati.`);
        }
      }
    }

    logs.push("🏁 Pengecekan selesai!");

    // 3. Kembalikan respons berupa JSON yang rapi
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
