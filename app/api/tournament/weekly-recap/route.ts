import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/lib/types/tournament';
import { sendOrUpdateWeeklyRecapEmbed } from '@/lib/discord/messages/weekly-recap';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { targetWeek } = body; // Contoh: "Week 1"

    if (!targetWeek) {
      return NextResponse.json({ error: 'Target Week wajib dipilih' }, { status: 400 });
    }

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];

    // 1. Filter match yang berada di Week yang dipilih
    const weekMatches = schedules.filter((m) => {
      const mWeek = m.weekName || `Week ${m.calculatedWeekNumber || 1}`;
      return mWeek === targetWeek;
    });

    if (weekMatches.length === 0) {
      return NextResponse.json({ error: `Tidak ada match ditemukan untuk ${targetWeek}` }, { status: 404 });
    }

    // 2. Hitung jumlah match per tanggal pada Week tersebut
    const dateMap: Record<string, { dateFormatted: string; count: number }> = {};

    weekMatches.forEach((m) => {
      if (!m.matchDate) return;
      const d = new Date(m.matchDate);
      const keyIso = d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
      const dateFormatted = d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        timeZone: 'Asia/Jakarta',
      });

      if (!dateMap[keyIso]) {
        dateMap[keyIso] = { dateFormatted, count: 0 };
      }
      dateMap[keyIso].count += 1;
    });

    const dailyMatchCounts = Object.keys(dateMap)
      .sort()
      .map((k) => dateMap[k]);

    // 3. Broadcast ke seluruh channel match pada Week tersebut yang sudah ter-sync
    let updatedCount = 0;

    for (let i = 0; i < schedules.length; i++) {
      const m = schedules[i];
      const mWeek = m.weekName || `Week ${m.calculatedWeekNumber || 1}`;

      if (mWeek === targetWeek && m.discordChannelId) {
        const newRecapMsgId = await sendOrUpdateWeeklyRecapEmbed({
          channelId: m.discordChannelId,
          weekName: targetWeek,
          dailyMatchCounts,
          existingRecapMsgId: m.recapMsgId,
        });

        if (newRecapMsgId) {
          schedules[i].recapMsgId = newRecapMsgId;
          updatedCount++;
        }
      }
    }

    // 4. Simpan perubahan ID recap ke KV Redis
    await kv.set('twi:schedules', schedules);

    return NextResponse.json({
      success: true,
      message: `Weekly Recap berhasil disebarkan ke ${updatedCount} channel di ${targetWeek}!`,
      updatedCount,
    });
  } catch (error) {
    console.error('Error broadcasting Weekly Recap:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
        }
