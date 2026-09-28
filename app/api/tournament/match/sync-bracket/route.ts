import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Ambil data master schedules
    const schedules = (await kv.get<any[]>('twi:schedules')) || [];

    // 2. Daftar pemenang Play-Ins resmi berdasarkan hasil match
    const playInWinners = [
      { placeholder: 'Winner Play-Ins #1', slug: 'ds-octagram' },
      { placeholder: 'Winner Play-Ins #2', slug: 'licht-playground' },
      { placeholder: 'Winner Play-Ins #3', slug: 'ds-xernobyl' },
      { placeholder: 'Winner Play-Ins #4', slug: 'licht-united' },
    ];

    let updateCount = 0;

    for (const target of playInWinners) {
      // Ambil data tim lengkap langsung dari KV Hash teams:slug
      const teamData = await kv.hgetall<any>(`teams:${target.slug}`);
      if (!teamData) continue;

      const teamName = teamData.namaTim || target.slug;
      const teamLogo = teamData.logoTim || teamData.logoUrl || '';
      const teamColor = teamData.warna || '#3498db';

      for (const match of schedules) {
        // Cek Tim A
        const isTargetA =
          String(match.teamAId || '').toLowerCase() === target.placeholder.toLowerCase() ||
          String(match.teamAName || '').toLowerCase() === target.placeholder.toLowerCase();

        if (isTargetA) {
          match.teamAName = teamName;
          match.teamAId = teamName;
          match.teamASlug = target.slug;
          match.teamALogo = teamLogo;
          match.teamAImage = teamLogo;
          match.teamAColor = teamColor;
          updateCount++;
        }

        // Cek Tim B
        const isTargetB =
          String(match.teamBId || '').toLowerCase() === target.placeholder.toLowerCase() ||
          String(match.teamBName || '').toLowerCase() === target.placeholder.toLowerCase();

        if (isTargetB) {
          match.teamBName = teamName;
          match.teamBId = teamName;
          match.teamBSlug = target.slug;
          match.teamBLogo = teamLogo;
          match.teamBImage = teamLogo;
          match.teamBColor = teamColor;
          updateCount++;
        }
      }
    }

    // 3. Simpan kembali seluruh jadwal ke KV
    await kv.set('twi:schedules', schedules);

    return NextResponse.json({
      success: true,
      message: `Berhasil menginjeksi ${updateCount} slot Quarter-Final!`,
      injectedWinners: playInWinners.map((w) => w.slug),
    });
  } catch (error: any) {
    console.error('Injeksi QF Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
