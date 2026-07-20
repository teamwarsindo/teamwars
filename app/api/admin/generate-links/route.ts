import { NextResponse, NextRequest } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET(request: NextRequest) {
  try {
    // 1. Ambil URL dasar (agar otomatis menyesuaikan apakah sedang di localhost atau production)
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    
    // ⚡ PROTEKSI SEDERHANA: Gunakan ID Discord-mu sebagai password di URL
    // Cara akses: /api/admin/generate-links?key=470212070957252618
    const key = url.searchParams.get('key');
    const ADMIN_SECRET = "470212070957252618";

    if (key !== ADMIN_SECRET) {
      return NextResponse.json({ error: "Akses Ditolak. Gunakan parameter ?key=[ID_DISCORD] di URL." }, { status: 401 });
    }

    // 2. Ambil semua slug tim dari index global
    const allTeamSlugs = await kv.smembers('global:teams');
    
    if (!allTeamSlugs || allTeamSlugs.length === 0) {
      return NextResponse.json({ success: true, message: "Belum ada tim yang mendaftar.", data: [] });
    }

    // 3. Tarik semua data tim secara paralel agar prosesnya sangat cepat
    const allTeamDatas = await Promise.all(
      allTeamSlugs.map(async (slug) => {
        const data = await kv.hgetall(`teams:${slug}`);
        return data;
      })
    );

    // 4. Format data dan buat link-nya
    const generatedLinks = allTeamDatas
      .filter((team: any) => team && team.namaTim && team.editToken) // Pastikan data tidak kosong
      .map((team: any) => {
        return {
          namaTim: team.namaTim,
          linkPeserta: `${baseUrl}/edit-team/${team.editToken}`,
          linkAdmin: `${baseUrl}/edit-team/${team.editToken}/${ADMIN_SECRET}`
        };
      });

    // 5. Urutkan berdasarkan nama tim sesuai abjad (A-Z) biar kamu gampang mencarinya
    generatedLinks.sort((a, b) => a.namaTim.localeCompare(b.namaTim));

    // 6. Kembalikan response JSON
    return NextResponse.json({
      success: true,
      totalTim: generatedLinks.length,
      data: generatedLinks
    });

  } catch (error) {
    console.error("Generate Links Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal server saat mengambil data." }, { status: 500 });
  }
}
