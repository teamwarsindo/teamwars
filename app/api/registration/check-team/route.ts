import { NextResponse, NextRequest } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json({ error: "Nama tim wajib disertakan" }, { status: 400 });
    }

    // Normalisasi slug sesuai dengan yang ada di api/submit
    const teamSlug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    
    // Cek di global index Redis
    const isExist = await kv.sismember("global:teams", teamSlug);

    return NextResponse.json({ available: !isExist });
  } catch (error) {
    return NextResponse.json({ available: true }, { status: 500 }); 
    // Fallback ke true agar user tetap bisa lanjut jika Redis timeout, 
    // toh akan ditangkap lagi di pre-flight api/submit
  }
}
