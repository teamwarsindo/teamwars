import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { discordAPI, getEmbedFooterText } from '@/lib/discord/utils';
import { isPlayerLockedInDuel, normalizeDecksAndLife } from './_helpers/validation';
import { syncCampTrackers } from './_helpers/discord-sync';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const matchId = searchParams.get('matchId');
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];

    if (!matchId) return NextResponse.json({ success: true, schedules });

    const match = schedules.find((m) => String(m.id).toLowerCase() === matchId.toLowerCase());
    const rawReport = await kv.hget<any>('twi:match_reports', matchId);
    const report = rawReport ? (typeof rawReport === 'string' ? JSON.parse(rawReport) : rawReport) : null;

    return NextResponse.json({ success: true, match, report });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { matchId, teamALineup, teamBLineup, action = 'save' } = body;

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const idx = schedules.findIndex((m) => String(m.id).toLowerCase() === String(matchId).toLowerCase());
    if (idx === -1) return NextResponse.json({ success: false, error: 'Match tidak ditemukan.' }, { status: 404 });
    const match = schedules[idx];

    const existingRaw = await kv.hget<any>('twi:match_reports', matchId);
    const existingReport = existingRaw ? (typeof existingRaw === 'string' ? JSON.parse(existingRaw) : existingRaw) : {};
    const existingGames = existingReport.games || [];

    // DIRECT SAVE (Web Editor)
    if (action === 'direct_save' || action === 'backfill') {
      const fullReport = body.reportData || body;

      for (const teamKey of ['teamA', 'teamB'] as const) {
        const incomingLineup: any[] = (fullReport[teamKey]?.lineup || []).filter(
          (p: any) => p && p.ign && p.ign.trim() !== '' && p.ign.trim() !== '-'
        );
        const existingLineup: any[] = existingReport[teamKey]?.lineup || [];

        for (const oldPlayer of existingLineup) {
          const isPresent = incomingLineup.some((p) => p.ign.trim().toLowerCase() === oldPlayer.ign.trim().toLowerCase());
          if (!isPresent && isPlayerLockedInDuel(oldPlayer.ign, existingGames, teamKey)) {
            return NextResponse.json({ success: false, error: `Ditolak! ${oldPlayer.ign} sudah memiliki riwayat duel.` }, { status: 400 });
          }
        }

        const processed = [];
        for (const p of incomingLineup) {
          const { deck1, deck2, remainingLife, error } = normalizeDecksAndLife(p);
          if (error) return NextResponse.json({ success: false, error }, { status: 400 });
          processed.push({ ...p, ign: p.ign.trim(), idDuelLinks: p.idDuelLinks?.trim() || '', remainingLife: p.remainingLife ?? remainingLife, deck1, deck2 });
        }
        if (fullReport[teamKey]) fullReport[teamKey].lineup = processed;
      }

      await kv.hset('twi:match_reports', { [matchId]: fullReport });

      // Sinkronisasi schedule hanya bila mencapai skor 10
      const scoreA = Number(fullReport.teamA?.score ?? 0);
      const scoreB = Number(fullReport.teamB?.score ?? 0);
      if (scoreA >= 10 || scoreB >= 10) {
        schedules[idx] = { ...match, isFinished: true, scoreA, scoreB, winner: scoreA > scoreB ? match.teamAName : match.teamBName } as any;
        await kv.set('twi:schedules', schedules);
      }

      return NextResponse.json({ success: true, report: fullReport });
    }

    // FORM SUBMIT / PUBLISH DEFAULT
    const processLineup = (inputList: any[], teamKey: 'teamA' | 'teamB') => {
      const activeList = (inputList || []).filter((p: any) => p && p.ign && p.ign.trim() !== '' && p.ign.trim() !== '-');
      for (const oldP of (existingReport[teamKey]?.lineup || [])) {
        if (!activeList.some((p: any) => p.ign.trim().toLowerCase() === oldP.ign.trim().toLowerCase()) && isPlayerLockedInDuel(oldP.ign, existingGames, teamKey)) {
          throw new Error(`Duelist ${oldP.ign} sudah memiliki riwayat duel dan tidak boleh dihapus.`);
        }
      }
      return activeList.map((p: any) => {
        const { deck1, deck2, remainingLife, error } = normalizeDecksAndLife(p);
        if (error) throw new Error(error);
        return { ign: p.ign.trim(), idDuelLinks: p.idDuelLinks?.trim() || '', remainingLife: p.remainingLife ?? remainingLife, totalWins: Number(p.totalWins ?? 0), totalLosses: Number(p.totalLosses ?? 0), deck1, deck2 };
      });
    };

    let pA = existingReport.teamA?.lineup || [];
    let pB = existingReport.teamB?.lineup || [];
    try {
      if (teamALineup) pA = processLineup(teamALineup, 'teamA');
      if (teamBLineup) pB = processLineup(teamBLineup, 'teamB');
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 400 });
    }

    const reportData = {
      ...existingReport,
      matchId,
      teamA: { name: match.teamAName, score: existingReport.teamA?.score ?? 0, repeatsUsed: existingReport.teamA?.repeatsUsed ?? 0, lineup: pA },
      teamB: { name: match.teamBName, score: existingReport.teamB?.score ?? 0, repeatsUsed: existingReport.teamB?.repeatsUsed ?? 0, lineup: pB },
      games: existingGames,
      isFinished: existingReport.isFinished ?? false,
      winnerTeam: existingReport.winnerTeam ?? null,
    };

    await kv.hset('twi:match_reports', { [matchId]: reportData });
    if (action === 'publish') await syncCampTrackers(matchId, match.matchDate, reportData);

    return NextResponse.json({ success: true, report: reportData });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { matchId, action } = body;

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const idx = schedules.findIndex((m) => String(m.id).toLowerCase() === String(matchId).toLowerCase());
    if (idx === -1) return NextResponse.json({ success: false, error: 'Match tidak ditemukan.' }, { status: 404 });
    const match = schedules[idx];

    const rawReport = await kv.hget<any>('twi:match_reports', matchId);
    if (!rawReport) return NextResponse.json({ success: false, error: 'Lineup belum dibuat.' }, { status: 400 });
    const reportData = typeof rawReport === 'string' ? JSON.parse(rawReport) : rawReport;

    if (action === 'add_game') {
      const { winnerOpt, playerAIgn, deckAName, playerBIgn, deckBName, statusKalah = 'REGULAR', notes = '', shouldPublish = false } = body;
      const scoreA = reportData.teamA?.score || 0;
      const scoreB = reportData.teamB?.score || 0;

      if (scoreA >= 10 || scoreB >= 10 || reportData.isFinished) {
        return NextResponse.json({ success: false, error: 'Pertandingan sudah selesai.' }, { status: 400 });
      }

      const pA = (reportData.teamA.lineup || []).find((p: any) => p.ign.toLowerCase() === playerAIgn.toLowerCase());
      const pB = (reportData.teamB.lineup || []).find((p: any) => p.ign.toLowerCase() === playerBIgn.toLowerCase());
      if (!pA || !pB) return NextResponse.json({ success: false, error: 'Pemain tidak ditemukan di lineup.' }, { status: 400 });

      const dA = [pA.deck1, pA.deck2].find((d) => d && d.archetype.toLowerCase() === deckAName.toLowerCase());
      const dB = [pB.deck1, pB.deck2].find((d) => d && d.archetype.toLowerCase() === deckBName.toLowerCase());
      if (!dA || !dB) return NextResponse.json({ success: false, error: 'Deck tidak ditemukan.' }, { status: 400 });

      const gameNumber = (reportData.games?.length || 0) + 1;
      const winnerTeamKey = winnerOpt === 'A' ? 'teamA' : 'teamB';

      if (winnerOpt === 'A') {
        reportData.teamA.score = scoreA + 1;
        dA.wins = (dA.wins || 0) + 1;
        pA.totalWins = (pA.totalWins || 0) + 1;
        if (statusKalah === 'REPEAT') {
          reportData.teamB.repeatsUsed = (reportData.teamB.repeatsUsed || 0) + 1;
          dB.isRepeatUsed = true;
        } else if (statusKalah === 'PENALTY_2') {
          pB.remainingLife = Math.max(0, (pB.remainingLife || 2) - 2);
          if (pB.deck1) pB.deck1.isDead = true;
          if (pB.deck2) pB.deck2.isDead = true;
        } else {
          pB.remainingLife = Math.max(0, (pB.remainingLife || 2) - 1);
          dB.isDead = true;
          dB.losses = (dB.losses || 0) + 1;
          pB.totalLosses = (pB.totalLosses || 0) + 1;
        }
      } else {
        reportData.teamB.score = scoreB + 1;
        dB.wins = (dB.wins || 0) + 1;
        pB.totalWins = (pB.totalWins || 0) + 1;
        if (statusKalah === 'REPEAT') {
          reportData.teamA.repeatsUsed = (reportData.teamA.repeatsUsed || 0) + 1;
          dA.isRepeatUsed = true;
        } else if (statusKalah === 'PENALTY_2') {
          pA.remainingLife = Math.max(0, (pA.remainingLife || 2) - 2);
          if (pA.deck1) pA.deck1.isDead = true;
          if (pA.deck2) pA.deck2.isDead = true;
        } else {
          pA.remainingLife = Math.max(0, (pA.remainingLife || 2) - 1);
          dA.isDead = true;
          dA.losses = (dA.losses || 0) + 1;
          pA.totalLosses = (pA.totalLosses || 0) + 1;
        }
      }

      if (!reportData.games) reportData.games = [];
      reportData.games.push({
        gameNumber,
        winner: winnerTeamKey,
        playerA: { ign: pA.ign, idDuelLinks: pA.idDuelLinks, archetype: dA.archetype, skill: dA.skill },
        playerB: { ign: pB.ign, idDuelLinks: pB.idDuelLinks, archetype: dB.archetype, skill: dB.skill },
        lossCondition: statusKalah,
        notes,
        timestamp: new Date().toISOString(),
      });

      const sA = reportData.teamA.score;
      const sB = reportData.teamB.score;
      if (sA >= 10 || sB >= 10) {
        reportData.isFinished = true;
        reportData.winnerTeam = sA >= 10 ? 'teamA' : 'teamB';
        schedules[idx] = { ...match, isFinished: true, scoreA: sA, scoreB: sB, winner: sA >= 10 ? match.teamAName : match.teamBName } as any;
        await kv.set('twi:schedules', schedules);
      }

      await kv.hset('twi:match_reports', { [matchId]: reportData });

      if (shouldPublish) {
        await syncCampTrackers(matchId, match.matchDate, reportData);
        const matchChannelId = (match as any).discordChannelId;
        if (matchChannelId) {
          await discordAPI(`/channels/${matchChannelId}/messages`, 'POST', {
            embeds: [{
              title: `⚔️ HASIL GAME ${gameNumber} — ${(winnerOpt === 'A' ? match.teamAName : match.teamBName).toUpperCase()} WIN!`,
              color: winnerOpt === 'A' ? 0x3b82f6 : 0xef4444,
              description: `**${match.teamAName}** [ \`${reportData.teamA.score}\` — \`${reportData.teamB.score}\` ] **${match.teamBName}**\n\n🔵 **${pA.ign}** (\`${dA.archetype}\`)\n🔴 **${pB.ign}** (\`${dB.archetype}\`)\n\n• **Status:** \`${statusKalah}\``,
              footer: { text: getEmbedFooterText() },
            }],
          }).catch(console.error);
        }
      }

      return NextResponse.json({ success: true, report: reportData });
    }

    if (action === 'del_game') {
      const { shouldPublish = false } = body;
      const games = reportData.games || [];
      if (games.length === 0) return NextResponse.json({ success: false, error: 'Tidak ada game untuk di-rollback.' }, { status: 400 });

      const popped = games.pop();
      const winner = popped.winner;
      const cond = popped.lossCondition || 'REGULAR';

      if (winner === 'teamA') reportData.teamA.score = Math.max(0, (reportData.teamA.score || 1) - 1);
      else reportData.teamB.score = Math.max(0, (reportData.teamB.score || 1) - 1);

      const restorePlayer = (teamKey: 'teamA' | 'teamB', playerKey: 'playerA' | 'playerB', isWinner: boolean) => {
        const p = (reportData[teamKey].lineup || []).find((x: any) => x.ign.toLowerCase() === popped[playerKey].ign.toLowerCase());
        if (!p) return;
        const d = [p.deck1, p.deck2].find((x) => x && x.archetype.toLowerCase() === popped[playerKey].archetype.toLowerCase());
        if (isWinner) {
          if (d) d.wins = Math.max(0, (d.wins || 1) - 1);
          p.totalWins = Math.max(0, (p.totalWins || 1) - 1);
        } else {
          if (cond === 'REPEAT') {
            reportData[teamKey].repeatsUsed = Math.max(0, (reportData[teamKey].repeatsUsed || 1) - 1);
            if (d) d.isRepeatUsed = false;
          } else if (cond === 'PENALTY_2') {
            p.remainingLife = Math.min(2, (p.remainingLife || 0) + 2);
            if (p.deck1) p.deck1.isDead = false;
            if (p.deck2) p.deck2.isDead = false;
          } else {
            if (d) { d.isDead = false; d.losses = Math.max(0, (d.losses || 1) - 1); }
            p.remainingLife = Math.min(2, (p.remainingLife || 0) + 1);
            p.totalLosses = Math.max(0, (p.totalLosses || 1) - 1);
          }
        }
      };

      restorePlayer('teamA', 'playerA', winner === 'teamA');
      restorePlayer('teamB', 'playerB', winner === 'teamB');

      reportData.isFinished = false;
      reportData.winnerTeam = null;

      await kv.hset('twi:match_reports', { [matchId]: reportData });
      if (shouldPublish) await syncCampTrackers(matchId, match.matchDate, reportData);

      return NextResponse.json({ success: true, report: reportData });
    }

    return NextResponse.json({ success: false, error: 'Action tidak valid.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
        }
