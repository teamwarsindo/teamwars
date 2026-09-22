import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem, TOURNAMENT_RULES } from '@/app/tournament/_library';
import {
  createMatchDiscordChannel,
  syncPlayoffCoordinationDiscordChannel,
} from '@/lib/discord/channels';
import { getPlayoffCoordinationMessagePayload } from '@/lib/discord/messages/playoff-coordination';
import { executeAssignStaff } from '@/lib/discord/commands/assign/execute';
import { executeUnassignStaff } from '@/lib/discord/commands/assign/unassign-runner';
import { discordAPI } from '@/lib/discord/utils';

const KV_PLAYOFF_COORD_KEY = 'twi:playoff_coordination_channel';

// Helper slug nama tim
function getTeamSlug(teamName: string) {
  return (teamName || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// Helper mengambil tanggal start turnamen dari Env Variable
function getTournamentStartDate(): number {
  const startDateStr = process.env.TWI_START_DATE || '2026-08-03';
  return new Date(`${startDateStr}T00:00:00+07:00`).getTime();
}

// Helper hitung minggu berbasis tanggal
function getMatchWeekNumber(dateString?: string): number {
  if (!dateString) return 1;
  const startDate = getTournamentStartDate();
  const matchDate = new Date(dateString).getTime();
  if (isNaN(matchDate)) return 1;

  const diffDays = Math.floor((matchDate - startDate) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

// Helper Inisialisasi / Buat Dokumen Match Report di Hash twi:match_reports
async function ensureMatchReportInitialized(match: MatchScheduleItem, weekNumber: number) {
  const existingReport = await kv.hget<any>('twi:match_reports', match.id);

  if (!existingReport) {
    const slugA = getTeamSlug(match.teamAName);
    const slugB = getTeamSlug(match.teamBName);
    const matchDateStr = match.matchDate ? match.matchDate.split('T')[0] : '';

    const newReport = {
      matchId: match.id,
      week: weekNumber,
      metadata: {
        date: matchDateStr,
        streamPlatform: (match as any).streamPlatform || 'YouTube',
        streamer: match.streamer || '',
        referee: match.referee || '',
        streamUrl: match.streamLink || (match as any).streamUrl || '',
      },
      teamA: {
        name: match.teamAName,
        slug: slugA,
        score: 0,
        repeatsUsed: 0,
        warningsUsed: 0,
        lineup: [],
      },
      teamB: {
        name: match.teamBName,
        slug: slugB,
        score: 0,
        repeatsUsed: 0,
        warningsUsed: 0,
        lineup: [],
      },
      games: [],
      finalScore: { teamA: 0, teamB: 0 },
      winnerTeam: null,
      isFinished: false,
    };

    await kv.hset('twi:match_reports', { [match.id]: newReport });
  }
}

// Helper delay mencegah Rate Limit Discord API (429)
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: Request) {
  try {
    // 🔒 0. Otorisasi Cron Internal
    const cronSecret = req.headers.get('x-cron-secret');
    if (process.env.CRON_SECRET && cronSecret && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized: Invalid Cron Secret' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { matchId, action, targetWeek, unassignType, assignType, targetStaffId } = body;

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];

    // ==========================================
    // 🟢 1. ACTION: SYNC PER WEEK (MASSAL / BATCH)
    // ==========================================
    if (action === 'WEEK' || targetWeek) {
      if (!targetWeek || targetWeek === 'ALL') {
        return NextResponse.json(
          { error: 'Silakan tentukan minggu atau babak spesifik untuk disinkronkan.' },
          { status: 400 }
        );
      }

      // Ekstraksi angka pekan dengan regex (mendukung "Week 8", "Week 8 • PLAY-INS", atau hanya angka)
      const weekMatch = String(targetWeek).match(/\d+/);
      const weekNumber = weekMatch ? parseInt(weekMatch[0], 10) : getTournamentWeekNumberSafe();
      const normTarget = String(targetWeek).toLowerCase().replace(/[^a-z0-9]/g, '');

      // Filter presisi: cocokkan nomor pekan, computed week, atau label nama babak (Playoff/Play-Ins)
      const weekMatches = schedules.filter((m: any) => {
        const computedWeek = m.weekNumber || getMatchWeekNumber(m.matchDate);
        if (computedWeek === weekNumber) return true;

        const mWeekName = String(m.weekName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const mStage = String(m.stage || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return (mWeekName && mWeekName.includes(normTarget)) || (mStage && mStage.includes(normTarget));
      });

      if (weekMatches.length === 0) {
        return NextResponse.json({ error: `Tidak ada jadwal pertandingan untuk ${targetWeek}` }, { status: 400 });
      }

      const updatedMatches: MatchScheduleItem[] = [...schedules];
      const syncedChannelMap: Record<string, string> = {};

      const involvedPlayoffRoles = new Set<string>();
      const involvedPlayoffTeams: { name: string; roleId?: string }[] = [];

      for (const match of weekMatches) {
        const idx = updatedMatches.findIndex((m) => m.id === match.id);
        if (idx === -1) continue;

        const slugA = getTeamSlug(match.teamAName);
        const slugB = getTeamSlug(match.teamBName);

        const [teamA, teamB] = await Promise.all([
          kv.hgetall<any>(`teams:${slugA}`).then((res) => res || kv.hgetall<any>(`team:${slugA}`)),
          kv.hgetall<any>(`teams:${slugB}`).then((res) => res || kv.hgetall<any>(`team:${slugB}`)),
        ]);

        const roleA = teamA?.discordRoleId || teamA?.roleId;
        const roleB = teamB?.discordRoleId || teamB?.roleId;

        // Kumpulkan tim & role untuk Room Koordinasi Playoff
        if (roleA) involvedPlayoffRoles.add(roleA);
        if (roleB) involvedPlayoffRoles.add(roleB);

        if (match.teamAName && !involvedPlayoffTeams.some((t) => t.name.toLowerCase() === match.teamAName.toLowerCase())) {
          involvedPlayoffTeams.push({ name: match.teamAName, roleId: roleA });
        }
        if (match.teamBName && !involvedPlayoffTeams.some((t) => t.name.toLowerCase() === match.teamBName.toLowerCase())) {
          involvedPlayoffTeams.push({ name: match.teamBName, roleId: roleB });
        }

        // Tentukan nama grup atau label stage babak
        const groupOrStage = match.groupName || (match as any).stage || 'Playoff';
        
        // Buat channel match Discord
        const res = await createMatchDiscordChannel({
          matchId: match.id,
          groupName: groupOrStage,
          teamAName: match.teamAName,
          teamBName: match.teamBName,
          kodeTimA: teamA?.kodeTim,
          kodeTimB: teamB?.kodeTim,
          emojiAId: teamA?.emojiId,
          emojiBId: teamB?.emojiId,
          roleAId: roleA,
          roleBId: roleB,
          weekName: targetWeek,
          matchDateIso: match.matchDate,
          refereeName: match.referee,
          refereeDiscordId: match.refereeDiscordId,
          streamerName: match.streamer,
          streamerDiscordId: match.streamerDiscordId,
          streamLink: match.streamLink,
          savedChannelId: (match as any).discordChannelId,
          openingMsgId: (match as any).openingMsgId,
        });

        // 📝 Inisialisasi otomatis ke hash twi:match_reports jika belum ada
        await ensureMatchReportInitialized(match, weekNumber);

        if (res.channelId) {
          (updatedMatches[idx] as any).discordChannelId = res.channelId;
          if (res.openingMsgId) {
            (updatedMatches[idx] as any).openingMsgId = res.openingMsgId;
          }
          syncedChannelMap[match.id] = res.channelId;
        }

        await delay(300);
      }

      await kv.set('twi:schedules', updatedMatches);

      // =========================================================================
      // 🤝 SINKRONISASI ROOM KOORDINASI KHUSUS PLAYOFF (WEEK 8 & 9)
      // =========================================================================
      const playInsWeek = TOURNAMENT_RULES.PLAYOFF_START_WEEK; // 8
      const quarterWeek = playInsWeek + 1; // 9

      const existingCoordChannelId = await kv.get<string>(KV_PLAYOFF_COORD_KEY);

      if (weekNumber > quarterWeek) {
        // Week Semifinal ke atas: Bersihkan channel koordinasi lama jika masih tersisa
        if (existingCoordChannelId) {
          await discordAPI(`/channels/${existingCoordChannelId}`, 'DELETE').catch(() => null);
          await kv.del(KV_PLAYOFF_COORD_KEY);
        }
      } else if (weekNumber === playInsWeek || weekNumber === quarterWeek) {
        // Hapus channel koordinasi pekan sebelumnya
        if (existingCoordChannelId) {
          await discordAPI(`/channels/${existingCoordChannelId}`, 'DELETE').catch(() => null);
          await kv.del(KV_PLAYOFF_COORD_KEY);
        }

        const isPlayIns = weekNumber === playInsWeek;
        const stageTitle = isPlayIns ? 'Play-Ins' : 'Quarter Finals';
        const channelName = isPlayIns ? '🤝-koordinasi-playins' : '🤝-koordinasi-quarter';

        const createdCoordChannelId = await syncPlayoffCoordinationDiscordChannel({
          channelName,
          involvedRoleIds: Array.from(involvedPlayoffRoles),
        });

        if (createdCoordChannelId) {
          await kv.set(KV_PLAYOFF_COORD_KEY, createdCoordChannelId);

          const payload = getPlayoffCoordinationMessagePayload({
            stageTitle,
            teams: involvedPlayoffTeams,
          });

          await discordAPI(`/channels/${createdCoordChannelId}/messages`, 'POST', payload).catch(() => null);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Sync Channel & Inisialisasi Match Report untuk ${targetWeek} berhasil dieksekusi!`,
        channels: syncedChannelMap,
      });
    }

    if (!matchId) {
      return NextResponse.json({ error: 'Match ID wajib diisi' }, { status: 400 });
    }

    // ==========================================
    // 🔴 2. ACTION: UNASSIGN WASIT / STREAMER
    // ==========================================
    if (action === 'UNASSIGN') {
      const type = unassignType || assignType || 'REFEREE';
      const result = await executeUnassignStaff({
        matchId,
        assignType: type,
      });
      return NextResponse.json({ success: true, message: `Unassign match ${matchId} berhasil!`, result });
    }

    // ==========================================
    // 🔵 3. ACTION: ASSIGN WASIT / STREAMER
    // ==========================================
    if (action === 'ASSIGN' && targetStaffId) {
      const result = await executeAssignStaff({
        matchId,
        assignType: assignType || 'REFEREE',
        targetStaffId,
      });
      return NextResponse.json({ success: true, message: `Assign match ${matchId} berhasil!`, result });
    }

    // ==========================================
    // 🟢 4. ACTION: SYNC SINGLE MATCH CHANNEL
    // ==========================================
    const matchIdx = schedules.findIndex((m) => m.id === matchId);
    if (matchIdx === -1) {
      return NextResponse.json({ error: 'Match tidak ditemukan di Redis KV' }, { status: 400 });
    }

    const match = schedules[matchIdx];
    const slugA = getTeamSlug(match.teamAName);
    const slugB = getTeamSlug(match.teamBName);

    const [teamA, teamB] = await Promise.all([
      kv.hgetall<any>(`teams:${slugA}`).then((res) => res || kv.hgetall<any>(`team:${slugA}`)),
      kv.hgetall<any>(`teams:${slugB}`).then((res) => res || kv.hgetall<any>(`team:${slugB}`)),
    ]);

    const computedWeekNum = match.weekNumber || getMatchWeekNumber(match.matchDate);
    const weekStr = (match as any).weekName || `Week ${computedWeekNum}`;
    const groupOrStage = match.groupName || (match as any).stage || 'Playoff';
    
    const res = await createMatchDiscordChannel({
      matchId: match.id,
      groupName: groupOrStage,
      teamAName: match.teamAName,
      teamBName: match.teamBName,
      kodeTimA: teamA?.kodeTim,
      kodeTimB: teamB?.kodeTim,
      emojiAId: teamA?.emojiId,
      emojiBId: teamB?.emojiId,
      roleAId: teamA?.discordRoleId || teamA?.roleId,
      roleBId: teamB?.discordRoleId || teamB?.roleId,
      weekName: weekStr,
      matchDateIso: match.matchDate,
      refereeName: match.referee,
      refereeDiscordId: match.refereeDiscordId,
      streamerName: match.streamer,
      streamerDiscordId: match.streamerDiscordId,
      streamLink: match.streamLink,
      savedChannelId: (match as any).discordChannelId,
      openingMsgId: (match as any).openingMsgId,
    });

    // 📝 Inisialisasi otomatis ke hash twi:match_reports
    await ensureMatchReportInitialized(match, computedWeekNum);

    if (res.channelId) {
      (schedules[matchIdx] as any).discordChannelId = res.channelId;
      if (res.openingMsgId) {
        (schedules[matchIdx] as any).openingMsgId = res.openingMsgId;
      }
      await kv.set('twi:schedules', schedules);
    }

    return NextResponse.json({
      success: true,
      message: `Sync Channel & Match Report untuk ${matchId} berhasil!`,
      channelId: res.channelId,
      openingMsgId: res.openingMsgId,
    });

  } catch (error: any) {
    console.error('Error Syncing Match:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}

// Fallback helper untuk week number default
function getTournamentWeekNumberSafe(): number {
  return getMatchWeekNumber(new Date().toISOString());
}
