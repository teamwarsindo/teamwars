import { NextResponse, NextRequest } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    let token = searchParams.get('token');

    if (!name) {
      return NextResponse.json({ error: "Nama tim wajib disertakan" }, { status: 400 });
    }

    // 💡 DETEKSI OTOMATIS MODE EDIT DARI REFERER URL (Jika frontend lupa ngirim token)
    if (!token) {
      const referer = request.headers.get('referer') || '';
      // Contoh referer: https://www.teamwars.web.id/edit-team/e0739a40-be76-4608-b07d-feab16bb064e?key=...
      const editMatch = referer.match(/\/edit-team\/([a-zA-Z0-9-]+)/);
      if (editMatch && editMatch[1]) {
        token = editMatch[1]; // Otomatis dapat token dari URL edit!
      }
    }

    // Normalisasi slug
    const teamSlug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");

    // Jika dalam Mode Edit (punya token), cek apakah slug ini milik tim dia sendiri
    if (token) {
      const currentTeamSlug = await kv.get(`token:map:${token}`);
      if (currentTeamSlug === teamSlug) {
        // Nama tidak berubah / milik tim sendiri -> Izinkan!
        return NextResponse.json({ available: true });
      }
    }

    // Cek di global index Redis untuk pendaftaran baru
    const isExist = await kv.sismember("global:teams", teamSlug);

    return NextResponse.json({ available: !isExist });
  } catch (error) {
    console.error('Error Check Team API:', error);
    return NextResponse.json({ available: true }, { status: 500 }); 
  }
}
