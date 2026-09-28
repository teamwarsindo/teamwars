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

    // Ambil nomor urut match (misal: "Play-Ins #1" -> "#1") menggunakan type cast any
    const matchObj = finishedMatch as any;
    const matchLabel: string = matchObj.title || matchObj.name || matchObj.matchTitle || matchObj.id || '';
    const matchNumberMatch = matchLabel.match(/#(\d+)/) || matchLabel.match(/(\d+)/);
    const matchNum = matchNumberMatch ? matchNumberMatch[1] : '';

    // Pola placeholder teks di babak berikutnya (misal: "Winner Play-Ins #1")
    const targetPlaceholder = `winner play-ins #${matchNum}`.toLowerCase();

    for (const item of schedules) {
      const matchItem = item as any;

      // 1. Cek apakah Slot Tim A menunggu pemenang match ini
      const isTeamAPlaceholder =
        (item.teamAName && item.teamAName.toLowerCase().includes(targetPlaceholder)) ||
        matchItem.teamASourceMatchId === finishedMatch.id;

      if (isTeamAPlaceholder) {
        item.teamAName = winnerName;
        matchItem.teamASlug = winnerSlug;
        if (winnerLogo) matchItem.teamALogo = winnerLogo;
        isBracketUpdated = true;
      }

      // 2. Cek apakah Slot Tim B menunggu pemenang match ini
      const isTeamBPlaceholder =
        (item.teamBName && item.teamBName.toLowerCase().includes(targetPlaceholder)) ||
        matchItem.teamBSourceMatchId === finishedMatch.id;

      if (isTeamBPlaceholder) {
        item.teamBName = winnerName;
        matchItem.teamBSlug = winnerSlug;
        if (winnerLogo) matchItem.teamBLogo = winnerLogo;
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
