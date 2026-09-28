import { kv } from '@vercel/kv';
import {
  MatchScheduleItem,
  getTeamSlug,
  TOURNAMENT_RULES,
} from '@/app/tournament/_library';

export async function advanceBracketWinner(finishedMatch: MatchScheduleItem, winnerName: string) {
  try {
    const matchObj = finishedMatch as any;
    const matchWeek = Number(matchObj.weekNumber || matchObj.week || 0);

    // 🛡️ 1. HANYA PROSES FASE PLAYOFF (Week >= TOURNAMENT_RULES.PLAYOFF_START_WEEK)
    if (matchWeek < TOURNAMENT_RULES.PLAYOFF_START_WEEK) {
      return;
    }

    const matchIdStr = String(matchObj.id || '').toLowerCase();
    const matchTitleStr = String(matchObj.matchTitle || matchObj.title || matchObj.name || '').toLowerCase();

    // 2. Deteksi Babak & Nomor Match Saat Ini Secara Dinamis
    let currentStage = '';
    let matchNum = '';

    if (matchTitleStr.includes('play-in') || matchIdStr.includes('po')) {
      currentStage = 'play-ins';
      const numMatch = matchTitleStr.match(/play-ins?\s*#?(\d+)/i) || matchIdStr.match(/po-(\d+)/i) || matchIdStr.match(/(\d+)/);
      matchNum = numMatch ? numMatch[1] : '';
    } else if (matchTitleStr.includes('quarter') || matchIdStr.includes('qf')) {
      currentStage = 'quarter-final';
      const numMatch = matchTitleStr.match(/quarter(?:-final)?\s*#?(\d+)/i) || matchIdStr.match(/qf-(\d+)/i) || matchIdStr.match(/(\d+)/);
      matchNum = numMatch ? numMatch[1] : '';
    } else if (matchTitleStr.includes('semi') || matchIdStr.includes('sf')) {
      currentStage = 'semi-final';
      const numMatch = matchTitleStr.match(/semi(?:-final)?\s*#?(\d+)/i) || matchIdStr.match(/sf-(\d+)/i) || matchIdStr.match(/(\d+)/);
      matchNum = numMatch ? numMatch[1] : '';
    }

    if (!matchNum && !finishedMatch.id) return;

    // Pola placeholder yang mungkin ditulis di babak berikutnya
    // Contoh: "winner play-ins #1", "winner quarter-final #1", "winner qf #1", "winner sf #1"
    const targetPlaceholders = [
      `winner ${currentStage} #${matchNum}`.toLowerCase(),
      `winner ${currentStage} ${matchNum}`.toLowerCase(),
      currentStage === 'quarter-final' ? `winner qf #${matchNum}` : '',
      currentStage === 'quarter-final' ? `winner qf ${matchNum}` : '',
      currentStage === 'semi-final' ? `winner sf #${matchNum}` : '',
      currentStage === 'semi-final' ? `winner sf ${matchNum}` : '',
    ].filter(Boolean);

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    let isBracketUpdated = false;

    // 3. Ambil data asli tim pemenang dari Upstash KV (teams:slug)
    const winnerSlug = getTeamSlug(winnerName);
    const winnerTeamData = await kv.hgetall<any>(`teams:${winnerSlug}`);

    const officialTeamName = winnerTeamData?.namaTim || winnerName;
    const officialTeamLogo =
      winnerTeamData?.logoTim ||
      winnerTeamData?.logoUrl ||
      winnerTeamData?.logo ||
      '';
    const officialTeamColor = winnerTeamData?.warna || '';

    // 4. Update Slot di Babak Berikutnya
    for (const item of schedules) {
      const matchItem = item as any;
      const targetWeek = Number(matchItem.weekNumber || matchItem.week || 0);

      // Hanya proses jadwal yang berada di week yang sama atau babak setelahnya
      if (targetWeek < matchWeek) continue;

      // Cek Slot Tim A
      const teamANameLower = String(item.teamAName || '').toLowerCase();
      const isTargetA =
        targetPlaceholders.some((p) => teamANameLower.includes(p)) ||
        matchItem.teamASourceMatchId === finishedMatch.id;

      if (isTargetA) {
        item.teamAName = officialTeamName;
        matchItem.teamAId = officialTeamName;
        if (officialTeamLogo) {
          item.teamALogo = officialTeamLogo;
          matchItem.teamAImage = officialTeamLogo;
        }
        if (officialTeamColor) {
          matchItem.teamAColor = officialTeamColor;
        }
        isBracketUpdated = true;
      }

      // Cek Slot Tim B
      const teamBNameLower = String(item.teamBName || '').toLowerCase();
      const isTargetB =
        targetPlaceholders.some((p) => teamBNameLower.includes(p)) ||
        matchItem.teamBSourceMatchId === finishedMatch.id;

      if (isTargetB) {
        item.teamBName = officialTeamName;
        matchItem.teamBId = officialTeamName;
        if (officialTeamLogo) {
          item.teamBLogo = officialTeamLogo;
          matchItem.teamBImage = officialTeamLogo;
        }
        if (officialTeamColor) {
          matchItem.teamBColor = officialTeamColor;
        }
        isBracketUpdated = true;
      }
    }

    // 5. Simpan kembali jadwal jika ada perubahan
    if (isBracketUpdated) {
      await kv.set('twi:schedules', schedules);
    }
  } catch (err) {
    console.error('[ADVANCE BRACKET ERROR]:', err);
  }
}
