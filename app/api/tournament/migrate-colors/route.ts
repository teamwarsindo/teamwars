import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem, getTeamSlug } from '@/app/tournament/_library';

const KV_KEY_SCHEDULES = 'twi:schedules';

// 16 Slug Resmi TWI Season 7
const OFFICIAL_SLUGS = [
  'asashin-og',
  'blackrose',
  'ds-octagram',
  'ds-sakurajima',
  'ds-xernobyl',
  'final-chapter',
  'fpf-darkfall',
  'fpf-fabulous',
  'kings-united',
  'licht-dracarys',
  'licht-playground',
  'licht-united',
  'nova-quasar',
  'supernova',
  'true-god',
  'ux-dino-rampage',
];

export async function GET() {
  try {
    const schedules = (await kv.get<MatchScheduleItem[]>(KV_KEY_SCHEDULES)) || [];
    const colorMapBySlug: Record<string, string> = {};
    const rawDataFound: Record<string, any> = {};

    // 1. Ambil data setiap tim dari Redis KV
    for (const slug of OFFICIAL_SLUGS) {
      const key = `teams:${slug}`;
      
      // Cek format Hash (hgetall) dan format String/Object (get)
      let data: any = await kv.hgetall(key);
      if (!data || Object.keys(data).length === 0) {
        data = await kv.get(key);
      }

      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          // Tetap string jika bukan JSON
        }
      }

      rawDataFound[slug] = data;

      if (data) {
        // Deteksi hex code di berbagai kemungkinan field
        const hex =
          data.color ||
          data.primaryColor ||
          data.teamColor ||
          data.themeColor ||
          data.hexColor ||
          data.warna ||
          (typeof data === 'string' && data.startsWith('#') ? data : undefined);

        if (hex) {
          colorMapBySlug[slug] = hex;
        }
      }
    }

    // 2. Inject ke data schedules
    let updatedCount = 0;
    const updatedSchedules = schedules.map((m) => {
      const slugA = getTeamSlug(m.teamAName);
      const slugB = getTeamSlug(m.teamBName);

      const colorA = colorMapBySlug[slugA] || m.teamAColor;
      const colorB = colorMapBySlug[slugB] || m.teamBColor;

      if (colorA !== m.teamAColor || colorB !== m.teamBColor) {
        updatedCount++;
      }

      return {
        ...m,
        teamAColor: colorA,
        teamBColor: colorB,
      };
    });

    // 3. Simpan kembali ke twi:schedules jika ada warna yang terdeteksi
    if (Object.keys(colorMapBySlug).length > 0) {
      await kv.set(KV_KEY_SCHEDULES, updatedSchedules);
    }

    return NextResponse.json({
      success: true,
      message: `Migrasi selesai. ${updatedCount} match schedule berhasil diperbarui.`,
      detectedColors: colorMapBySlug,
      debugRawKV: rawDataFound, // Memperlihatkan isi data asli di Redis KV untuk inspeksi
    });
  } catch (error) {
    console.error('Error saat migrasi:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
