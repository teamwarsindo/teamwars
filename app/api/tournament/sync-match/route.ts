import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/lib/types/tournament';
import { createMatchDiscordChannel } from '@/lib/discord/channels';
import { executeAssignStaff, executeUnassignStaff } from '@/lib/discord/services/staff-assignment';

// Helper slug nama tim
function getTeamSlug(teamName: string) {
  return teamName
    .toLowerCase()
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

// Helper hitung minggu berbasis tanggal jika field weekNumber di KV belum ada
function getMatchWeekNumber(dateString?: string): number {
  if (!dateString) return 1;
  const startDate = getTournamentStartDate();
  const matchDate = new Date(dateString).getTime();
  if (isNaN(matchDate)) return 1;

  const diffDays = Math.floor((matchDate - startDate) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

// Helper delay mencegah Rate Limit Discord API (429)
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { matchId, action, targetWeek, unassignType, assignType, targetStaffId, scoreA, scoreB } = body;

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];

    // ==========================================
    // 🟢 1. ACTION: SYNC PER WEEK (MASSAL / BATCH)
    // ==========================================
    if (action === 'WEEK' || targetWeek) {
      if (!targetWeek || targetWeek === 'ALL') {
        return NextResponse.json(
          { error: 'Silakan pilih minggu spesifik (misal: "Week 1") untuk sync per minggu.' },
          { status: 400 }
        );
      }

      const weekNumber = parseInt(targetWeek.replace('Week ', ''), 10);
      
      // Filter presisi berbasis tanggal pertandingan
      const weekMatches = schedules.filter((m) => {
        const computedWeek = m.weekNumber || getMatchWeekNumber(m.matchDate);
        return computedWeek === weekNumber;
      });

      if (weekMatches.length === 0) {
        return NextResponse.json({ error: `Tidak ada jadwal pertandingan untuk ${targetWeek}` }, { status: 400 });
      }

      const updatedMatches: MatchScheduleItem[] = [...schedules];
      const syncedChannelMap: Record<string, string> = {};

      for (const match of weekMatches) {
        const idx = updatedMatches.findIndex((m) => m.id === match.id);
        if (idx === -1) continue;

        const slugA = getTeamSlug(match.teamAName);
        const slugB = getTeamSlug(match.teamBName);

        const [teamA, teamB] = await Promise.all([
          kv.hgetall<any>(`teams:${slugA}`).then((res) => res || kv.hgetall<any>(`team:${slugA}`)),
          kv.hgetall<any>(`teams:${slugB}`).then((res) => res || kv.hgetall<any>(`team:${slugB}`)),
        ]);

        const res = await createMatchDiscordChannel({
          matchId: match.id,
          groupName: match.groupName,
          teamAName: match.teamAName,
          teamBName: match.teamBName,
          kodeTimA: teamA?.kodeTim,
          kodeTimB: teamB?.kodeTim,
          emojiAId: teamA?.emojiId,
          emojiBId: teamB?.emojiId,
          roleAId: teamA?.discordRoleId || teamA?.roleId,
          roleBId: teamB?.discordRoleId || teamB?.roleId,
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

      return NextResponse.json({
        success: true,
        message: `Sync Channel ${targetWeek} berhasil dieksekusi!`,
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
        scoreA: scoreA !== undefined ? Number(scoreA) : 0,
        scoreB: scoreB !== undefined ? Number(scoreB) : 0,
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

    const res = await createMatchDiscordChannel({
      matchId: match.id,
      groupName: match.groupName,
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

    if (res.channelId) {
      (schedules[matchIdx] as any).discordChannelId = res.channelId;
      if (res.openingMsgId) {
        (schedules[matchIdx] as any).openingMsgId = res.openingMsgId;
      }
      await kv.set('twi:schedules', schedules);
    }

    return NextResponse.json({
      success: true,
      message: `Sync Channel untuk match ${matchId} berhasil!`,
      channelId: res.channelId,
      openingMsgId: res.openingMsgId,
    });

  } catch (error: any) {
    console.error('Error Syncing Match:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
            }
