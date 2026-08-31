import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { sendOrUpdateLiveTracker, TrackerPlayer } from '@/lib/discord/messages/match-briefing';
import { discordAPI, getEmbedFooterText } from '@/lib/discord/utils';

export const dynamic = 'force-dynamic';

// Helper sinkronisasi Live Tracker ke Camp masing-masing tim
async function syncCampTrackers(matchId: string, matchDateIso: string, reportData: any) {
  try {
    const matchMessages = (await kv.hgetall<Record<string, any>>('discord:match_messages')) || {};
    const rawMsg = matchMessages[matchId];
    if (!rawMsg) return;

    const msgData = typeof rawMsg === 'string' ? JSON.parse(rawMsg) : rawMsg;

    const mapTracker = (lineup: any[]): TrackerPlayer[] =>
      (lineup || []).map((p) => ({
        ign: p.ign,
        idDuelLinks: p.idDuelLinks || '',
        deck1: p.deck1 ? { archetype: p.deck1.archetype, skill: p.deck1.skill } : null,
        deck2: p.deck2 ? { archetype: p.deck2.archetype, skill: p.deck2.skill } : null,
      }));

    let changed = false;
    if (msgData.campA?.channelId) {
      const trackerIdA = await sendOrUpdateLiveTracker({
        channelId: msgData.campA.channelId,
        matchDateIso,
        submittedPlayers: mapTracker(reportData.teamA?.lineup),
        existingMsgId: msgData.campA.trackerMsgId,
      });
      if (trackerIdA) {
        msgData.campA.trackerMsgId = trackerIdA;
        changed = true;
      }
    }
    if (msgData.campB?.channelId) {
      const trackerIdB = await sendOrUpdateLiveTracker({
        channelId: msgData.campB.channelId,
        matchDateIso,
        submittedPlayers: mapTracker(reportData.teamB?.lineup),
        existingMsgId: msgData.campB.trackerMsgId,
      });
      if (trackerIdB) {
        msgData.campB.trackerMsgId = trackerIdB;
        changed = true;
      }
    }

    if (changed) {
      await kv.hset('discord:match_messages', { [matchId]: JSON.stringify(msgData) });
    }
  } catch (e) {
    console.error('[SYNC TRACKER ERROR]:', e);
  }
}

// -------------------------------------------------------------
// GET: Ambil Master Schedule & Match Report Draft
// -------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const matchId = searchParams.get('matchId');

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];

    if (!matchId) {
      return NextResponse.json({ success: true, schedules });
    }

    const match = schedules.find((m) => String(m.id).toLowerCase() === matchId.toLowerCase());
    const report = (await kv.hget<any>('twi:match_reports', matchId)) || null;

    return NextResponse.json({ success: true, match, report });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// -------------------------------------------------------------
// POST: Simpan Lineup (/submit manager) atau Publish Discord
// -------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { matchId, teamALineup, teamBLineup, action = 'save' } = body;

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const match = schedules.find((m) => String(m.id).toLowerCase() === matchId.toLowerCase());
    if (!match) return NextResponse.json({ success: false, error: 'Match tidak ditemukan.' }, { status: 404 });

    const existingReport = (await kv.hget<any>('twi:match_reports', matchId)) || {};

    const formatLineup = (inputList: any[]) =>
      (inputList || []).map((p: any) => ({
        ign: p.ign || '',
        idDuelLinks: p.idDuelLinks || '',
        remainingLife: p.remainingLife ?? 2,
        totalWins: p.totalWins ?? 0,
        totalLosses: p.totalLosses ?? 0,
        deck1: p.deck1 ? { archetype: p.deck1.archetype || '', skill: p.deck1.skill || '', wins: p.deck1.wins || 0, losses: p.deck1.losses || 0, isDead: !!p.deck1.isDead, isRepeatUsed: !!p.deck1.isRepeatUsed } : null,
        deck2: p.deck2 ? { archetype: p.deck2.archetype || '', skill: p.deck2.skill || '', wins: p.deck2.wins || 0, losses: p.deck2.losses || 0, isDead: !!p.deck2.isDead, isRepeatUsed: !!p.deck2.isRepeatUsed } : null,
      }));

    const reportData = {
      ...existingReport,
      matchId,
      teamA: {
        name: match.teamAName,
        score: existingReport.teamA?.score ?? 0,
        repeatsUsed: existingReport.teamA?.repeatsUsed ?? 0,
        lineup: teamALineup ? formatLineup(teamALineup) : (existingReport.teamA?.lineup || []),
      },
      teamB: {
        name: match.teamBName,
        score: existingReport.teamB?.score ?? 0,
        repeatsUsed: existingReport.teamB?.repeatsUsed ?? 0,
        lineup: teamBLineup ? formatLineup(teamBLineup) : (existingReport.teamB?.lineup || []),
      },
      games: existingReport.games || [],
      isFinished: existingReport.isFinished ?? false,
      winnerTeam: existingReport.winnerTeam ?? null,
    };

    // 1. Simpan ke Database Draft (KV)
    await kv.hset('twi:match_reports', { [matchId]: reportData });

    // 2. Jika Aksi Publish -> Trigger Sync ke Live Tracker Discord Camp A & B
    if (action === 'publish') {
      await syncCampTrackers(matchId, match.matchDate, reportData);
    }

    return NextResponse.json({ success: true, report: reportData });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// -------------------------------------------------------------
// PUT: Tambah Ronde Game, Rollback, atau Publish Game Log
// -------------------------------------------------------------
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { matchId, action } = body;

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const match = schedules.find((m) => String(m.id).toLowerCase() === matchId.toLowerCase());
    if (!match) return NextResponse.json({ success: false, error: 'Match tidak ditemukan.' }, { status: 404 });

    const reportData = await kv.hget<any>('twi:match_reports', matchId);
    if (!reportData) return NextResponse.json({ success: false, error: 'Lineup belum dibuat/disubmit.' }, { status: 400 });

    // 1. Tambah Ronde Duel (/game add)
    if (action === 'add_game') {
      const { winnerOpt, playerAIgn, deckAName, playerBIgn, deckBName, statusKalah = 'REGULAR', notes = '', shouldPublish = false } = body;

      const scoreA = reportData.teamA?.score || 0;
      const scoreB = reportData.teamB?.score || 0;

      if (scoreA >= 10 || scoreB >= 10 || reportData.isFinished) {
        return NextResponse.json({ success: false, error: 'Pertandingan sudah selesai (skor 10 tercapai).' }, { status: 400 });
      }

      const pA = (reportData.teamA.lineup || []).find((p: any) => p.ign.toLowerCase() === playerAIgn.toLowerCase());
      const pB = (reportData.teamB.lineup || []).find((p: any) => p.ign.toLowerCase() === playerBIgn.toLowerCase());
      if (!pA || !pB) return NextResponse.json({ success: false, error: 'Pemain tidak ditemukan di lineup.' }, { status: 400 });

      const dA = [pA.deck1, pA.deck2].find((d) => d && d.archetype.toLowerCase() === deckAName.toLowerCase());
      const dB = [pB.deck1, pB.deck2].find((d) => d && d.archetype.toLowerCase() === deckBName.toLowerCase());
      if (!dA || !dB) return NextResponse.json({ success: false, error: 'Deck tidak ditemukan.' }, { status: 400 });

      const gameNumber = (reportData.games?.length || 0) + 1;
      const winnerTeamKey = winnerOpt === 'A' ? 'teamA' : 'teamB';
      const winnerTeamName = winnerOpt === 'A' ? match.teamAName : match.teamBName;

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
      const newGameRecord = {
        gameNumber,
        winner: winnerTeamKey,
        playerA: { ign: pA.ign, idDuelLinks: pA.idDuelLinks, archetype: dA.archetype, skill: dA.skill },
        playerB: { ign: pB.ign, idDuelLinks: pB.idDuelLinks, archetype: dB.archetype, skill: dB.skill },
        lossCondition: statusKalah,
        notes,
        timestamp: new Date().toISOString(),
      };
      reportData.games.push(newGameRecord);

      if (reportData.teamA.score >= 10) {
        reportData.isFinished = true;
        reportData.winnerTeam = 'teamA';
      } else if (reportData.teamB.score >= 10) {
        reportData.isFinished = true;
        reportData.winnerTeam = 'teamB';
      }

      // Simpan Draft
      await kv.hset('twi:match_reports', { [matchId]: reportData });

      // Jika tombol Publish ditekan
      if (shouldPublish) {
        // 1. Update Tracker di Camp
        await syncCampTrackers(matchId, match.matchDate, reportData);

        // 2. Kirim Pesan Log Game ke Channel Match
        const matchChannelId = (match as any).discordChannelId;
        if (matchChannelId) {
          const winnerColor = winnerOpt === 'A' ? 0x3b82f6 : 0xef4444;
          await discordAPI(`/channels/${matchChannelId}/messages`, 'POST', {
            embeds: [
              {
                title: `⚔️ HASIL GAME ${gameNumber} — ${winnerTeamName.toUpperCase()} WIN!`,
                color: winnerColor,
                description:
                  `**${match.teamAName}** [ \`${reportData.teamA.score}\` — \`${reportData.teamB.score}\` ] **${match.teamBName}**\n\n` +
                  `🔵 **${pA.ign}** (\`${dA.archetype}\`)\n` +
                  `🔴 **${pB.ign}** (\`${dB.archetype}\`)\n\n` +
                  `• **Status Lawan:** \`${statusKalah}\`\n` +
                  (notes ? `• **Catatan:** *${notes}*\n` : ''),
                footer: { text: getEmbedFooterText() },
              },
            ],
          }).catch(console.error);
        }
      }

      return NextResponse.json({ success: true, report: reportData });
    }

    // 2. Rollback Game (/game del)
    if (action === 'del_game') {
      const { shouldPublish = false } = body;
      const games = reportData.games || [];
      if (games.length === 0) {
        return NextResponse.json({ success: false, error: 'Tidak ada game yang bisa di-rollback.' }, { status: 400 });
      }

      const popped = games.pop();
      const winner = popped.winner;
      const lossCondition = popped.lossCondition || 'REGULAR';

      if (winner === 'teamA') {
        reportData.teamA.score = Math.max(0, (reportData.teamA.score || 1) - 1);
      } else {
        reportData.teamB.score = Math.max(0, (reportData.teamB.score || 1) - 1);
      }

      const pA = (reportData.teamA.lineup || []).find((p: any) => p.ign.toLowerCase() === popped.playerA.ign.toLowerCase());
      if (pA) {
        const dA = [pA.deck1, pA.deck2].find((d) => d && d.archetype.toLowerCase() === popped.playerA.archetype.toLowerCase());
        if (winner === 'teamA') {
          if (dA) dA.wins = Math.max(0, (dA.wins || 1) - 1);
          pA.totalWins = Math.max(0, (pA.totalWins || 1) - 1);
        } else {
          if (lossCondition === 'REPEAT') {
            reportData.teamA.repeatsUsed = Math.max(0, (reportData.teamA.repeatsUsed || 1) - 1);
            if (dA) dA.isRepeatUsed = false;
          } else if (lossCondition === 'PENALTY_2') {
            pA.remainingLife = Math.min(2, (pA.remainingLife || 0) + 2);
            if (pA.deck1) pA.deck1.isDead = false;
            if (pA.deck2) pA.deck2.isDead = false;
          } else {
            if (dA) {
              dA.isDead = false;
              dA.losses = Math.max(0, (dA.losses || 1) - 1);
            }
            pA.remainingLife = Math.min(2, (pA.remainingLife || 0) + 1);
            pA.totalLosses = Math.max(0, (pA.totalLosses || 1) - 1);
          }
        }
      }

      const pB = (reportData.teamB.lineup || []).find((p: any) => p.ign.toLowerCase() === popped.playerB.ign.toLowerCase());
      if (pB) {
        const dB = [pB.deck1, pB.deck2].find((d) => d && d.archetype.toLowerCase() === popped.playerB.archetype.toLowerCase());
        if (winner === 'teamB') {
          if (dB) dB.wins = Math.max(0, (dB.wins || 1) - 1);
          pB.totalWins = Math.max(0, (pB.totalWins || 1) - 1);
        } else {
          if (lossCondition === 'REPEAT') {
            reportData.teamB.repeatsUsed = Math.max(0, (reportData.teamB.repeatsUsed || 1) - 1);
            if (dB) dB.isRepeatUsed = false;
          } else if (lossCondition === 'PENALTY_2') {
            pB.remainingLife = Math.min(2, (pB.remainingLife || 0) + 2);
            if (pB.deck1) pB.deck1.isDead = false;
            if (pB.deck2) pB.deck2.isDead = false;
          } else {
            if (dB) {
              dB.isDead = false;
              dB.losses = Math.max(0, (dB.losses || 1) - 1);
            }
            pB.remainingLife = Math.min(2, (pB.remainingLife || 0) + 1);
            pB.totalLosses = Math.max(0, (pB.totalLosses || 1) - 1);
          }
        }
      }

      reportData.isFinished = false;
      reportData.winnerTeam = null;

      await kv.hset('twi:match_reports', { [matchId]: reportData });

      if (shouldPublish) {
        await syncCampTrackers(matchId, match.matchDate, reportData);
      }

      return NextResponse.json({ success: true, report: reportData });
    }

    return NextResponse.json({ success: false, error: 'Action tidak valid.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
  
