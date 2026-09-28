import { kv } from '@vercel/kv';
import { MatchScheduleItem, getTeamSlug } from '@/app/tournament/_library';

export async function advanceBracketWinner(finishedMatch: MatchScheduleItem, winnerName: string) {
  try {
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    let isBracketUpdated = false;

    // Ambil data tim pemenang dari master teams (untuk logo & slug resmi)
    const winnerSlug = getTeamSlug(winnerName);
    const winnerData = await kv.hgetall<any>(`teams:${winnerSlug}`);
    const winnerLogo = winnerData?.logo || winnerData?.image || '';

    // Ambil nomor urut match (misal: "Play-Ins #1" -> "#1")[span_0](start_span)[span_0](end_span)[span_1](start_span)[span_1](end_span)
    const matchNumberMatch = finishedMatch.title?.match(/#(\d+)/) || finishedMatch.id.match(/(\d+)/);
    const matchNum = matchNumberMatch ? matchNumberMatch[1] : '';

    // Pola placeholder teks di babak berikutnya (misal: "Winner Play-Ins #1")[span_2](start_span)[span_2](end_span)
    const targetPlaceholder = `winner play-ins #${matchNum}`.toLowerCase();

    for (const item of schedules) {
      // 1. Cek apakah Slot Tim A menunggu pemenang match ini
      const isTeamAPlaceholder =
        item.teamAName?.toLowerCase().includes(targetPlaceholder) ||
        (item as any).teamASourceMatchId === finishedMatch.id;

      if (isTeamAPlaceholder) {
        item.teamAName = winnerName;
        (item as any).teamASlug = winnerSlug;
        if (winnerLogo) (item as any).teamALogo = winnerLogo;
        isBracketUpdated = true;
      }

      // 2. Cek apakah Slot Tim B menunggu pemenang match ini
      const isTeamBPlaceholder =
        item.teamBName?.toLowerCase().includes(targetPlaceholder) ||
        (item as any).teamBSourceMatchId === finishedMatch.id;

      if (isTeamBPlaceholder) {
        item.teamBName = winnerName;
        (item as any).teamBSlug = winnerSlug;
        if (winnerLogo) (item as any).teamBLogo = winnerLogo;
        isBracketUpdated = true;
      }
    }

    // Simpan kembali array jadwal yang slotnya sudah terisi tim asli
    if (isBracketUpdated) {
      await kv.set('twi:schedules', schedules);
    }
  } catch (err) {
    console.error('[ADVANCE BRACKET ERROR]:', err);
  }
}
