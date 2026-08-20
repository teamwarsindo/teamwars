import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem, getTeamSlug } from '@/app/tournament/_library';

const KV_KEY_SCHEDULES = 'twi:schedules';

export async function GET() {
  try {
    const schedules = (await kv.get<MatchScheduleItem[]>(KV_KEY_SCHEDULES)) || [];

    if (schedules.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Tidak ada data jadwal di twi:schedules.',
      });
    }

    // 1. Kumpulkan seluruh nama tim unik yang bertanding
    const teamNames = Array.from(
      new Set(
        schedules
          .flatMap((m) => [m.teamAName, m.teamBName])
          .filter(Boolean)
      )
    );

    // 2. Fetch warna dari setiap key teams:slug secara paralel
    const colorMap = new Map<string, string>();
    await Promise.all(
      teamNames.map(async (name) => {
        const slug = getTeamSlug(name);
        try {
          const teamData: any = await kv.hgetall(`teams:${slug}`);
          if (teamData) {
            const hex = teamData.color || teamData.primaryColor || teamData.teamColor;
            if (hex) {
              colorMap.set(name.toLowerCase(), hex);
            }
          }
        } catch (err) {
          console.error(`Gagal fetch hash tim untuk ${name}:`, err);
        }
      })
    );

    // 3. Inject teamAColor & teamBColor ke setiap match schedule tanpa mengubah skor atau ID
    let updatedCount = 0;
    const updatedSchedules: MatchScheduleItem[] = schedules.map((m) => {
      const colorA = colorMap.get(m.teamAName.toLowerCase());
      const colorB = colorMap.get(m.teamBName.toLowerCase());

      if (colorA || colorB) {
        updatedCount++;
      }

      return {
        ...m,
        teamAColor: colorA || m.teamAColor,
        teamBColor: colorB || m.teamBColor,
      };
    });

    // 4. Simpan kembali seluruh jadwal yang sudah diperkaya ke KV
    await kv.set(KV_KEY_SCHEDULES, updatedSchedules);

    return NextResponse.json({
      success: true,
      message: `Migrasi berhasil! ${updatedCount} pertandingan diperbarui dengan warna tim asli.`,
      detectedColors: Object.fromEntries(colorMap),
      sampleSchedule: updatedSchedules.slice(0, 2),
    });
  } catch (error) {
    console.error('Error saat migrasi warna jadwal:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
  
