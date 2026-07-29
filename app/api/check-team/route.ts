import { NextResponse, NextRequest } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    const token = searchParams.get('token'); // Ambil token jika dalam mode Edit

    if (!name) {
      return NextResponse.json({ error: "Nama tim wajib disertakan" }, { status: 400 });
    }

    // Normalisasi slug sesuai dengan standar slug tim
    const teamSlug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");

    // Jika membawa token (Mode Edit), cek apakah slug ini adalah milik tim dia sendiri
    if (token) {
      const currentTeamSlug = await kv.get(`token:map:${token}`);
      if (currentTeamSlug === teamSlug) {
        // Nama tidak berubah / milik tim sendiri -> Izinkan!
        return NextResponse.json({ available: true });
      }
    }

    // Cek di global index Redis untuk pendaftaran baru / ganti ke nama tim lain
    const isExist = await kv.sismember("global:teams", teamSlug);

    return NextResponse.json({ available: !isExist });
  } catch (error) {
    console.error('Error Check Team API:', error);
    return NextResponse.json({ available: true }, { status: 500 }); 
    // Fallback ke true agar user tetap bisa lanjut jika Redis timeout, 
    // toh akan ditangkap lagi di pre-flight api/submit
  }
}
