import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library/types';
import { backupDiscordChannelMessages } from '@/lib/discord/backup';
import { deleteMatchDiscordChannel } from '@/lib/discord/channels';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const matchId = searchParams.get('matchId');

    // 1. Request detail log match spesifik
    if (matchId) {
      const [cachedData, schedules, globalDiscordMap, globalIgnMap] = await Promise.all([
        kv.get<any>(`twi:match_logs:${matchId}`),
        kv.get<MatchScheduleItem[]>('twi:schedules'),
        kv.hgetall<Record<string, string>>('global:discord'),
        kv.hgetall<Record<string, string>>('global:ign'),
      ]);

      const currentMatch = (schedules || []).find((m: any) => m.id === matchId);
      const teamASlug = (currentMatch?.teamAId || (currentMatch as any)?.teamACode || currentMatch?.teamAName || '')
        .toLowerCase()
        .replace(/\s+/g, '-');
      const teamBSlug = (currentMatch?.teamBId || (currentMatch as any)?.teamBCode || currentMatch?.teamBName || '')
        .toLowerCase()
        .replace(/\s+/g, '-');

      // Ambil roster pemain Tim A dan Tim B
      const [rawPlayersA, rawPlayersB] = await Promise.all([
        teamASlug ? kv.hget<any>(`teams:${teamASlug}`, 'players') : null,
        teamBSlug ? kv.hget<any>(`teams:${teamBSlug}`, 'players') : null,
      ]);

      const playersA = Array.isArray(rawPlayersA)
        ? rawPlayersA
        : typeof rawPlayersA === 'string'
        ? JSON.parse(rawPlayersA)
        : [];
      const playersB = Array.isArray(rawPlayersB)
        ? rawPlayersB
        : typeof rawPlayersB === 'string'
        ? JSON.parse(rawPlayersB)
        : [];

      // Susun mapping gabungan: discordUsername/IGN -> { teamSlug, ign }
      const playerTeamMap: Record<string, { teamSlug: string; ign: string }> = {};

      // Masukkan roster Tim A
      playersA.forEach((p: any) => {
        const teamSlug = teamASlug;
        const ign = p.ign || p.namaLengkap || p.discord;
        if (p.discord) playerTeamMap[p.discord.trim().toLowerCase()] = { teamSlug, ign };
        if (p.ign) playerTeamMap[p.ign.trim().toLowerCase()] = { teamSlug, ign };
      });

      // Masukkan roster Tim B
      playersB.forEach((p: any) => {
        const teamSlug = teamBSlug;
        const ign = p.ign || p.namaLengkap || p.discord;
        if (p.discord) playerTeamMap[p.discord.trim().toLowerCase()] = { teamSlug, ign };
        if (p.ign) playerTeamMap[p.ign.trim().toLowerCase()] = { teamSlug, ign };
      });

      // Masukkan mapping global:discord
      if (globalDiscordMap) {
        Object.entries(globalDiscordMap).forEach(([discordUser, slug]) => {
          const cleanUser = discordUser.trim().toLowerCase();
          if (!playerTeamMap[cleanUser]) {
            playerTeamMap[cleanUser] = {
              teamSlug: String(slug).toLowerCase(),
              ign: cleanUser,
            };
          }
        });
      }

      // Masukkan mapping global:ign
      if (globalIgnMap) {
        Object.entries(globalIgnMap).forEach(([ignKey, slug]) => {
          const cleanIgn = ignKey.trim().toLowerCase();
          if (!playerTeamMap[cleanIgn]) {
            playerTeamMap[cleanIgn] = {
              teamSlug: String(slug).toLowerCase(),
              ign: ignKey,
            };
          }
        });
      }

      const logs = Array.isArray(cachedData) ? cachedData : cachedData?.logs || [];
      const channelName = Array.isArray(cachedData)
        ? `⚔️-${matchId}`
        : cachedData?.channelName || `⚔️-${matchId}`;

      return NextResponse.json({
        matchId,
        channelName,
        logs,
        playerTeamMap,
      });
    }

    // 2. Ambil list schedules yang valid (aktif / sudah dibackup)
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const validArchivedSchedules = schedules.filter((m: any) => {
      const hasActiveChannel = Boolean(m.discordChannelId && String(m.discordChannelId).trim() !== '');
      const hasSavedLogs = Boolean(m.discordLogsSaved);
      return hasActiveChannel || hasSavedLogs;
    });

    return NextResponse.json({ schedules: validArchivedSchedules });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { matchId, channelId, week } = body;

    if (!matchId || !channelId) {
      return NextResponse.json({ error: 'matchId dan channelId wajib disertakan' }, { status: 400 });
    }

    const { channelName, messages } = await backupDiscordChannelMessages({
      matchId,
      channelId,
      week: Number(week) || 1,
    });

    const payload = { channelName, logs: messages };
    await kv.set(`twi:match_logs:${matchId}`, payload);

    // Tandai status arsip tersimpan di schedules
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const updatedSchedules = schedules.map((m: any) => {
      if (m.id === matchId) {
        return {
          ...m,
          discordLogsSaved: true,
          discordLogsSavedAt: new Date().toISOString(),
        };
      }
      return m;
    });
    await kv.set('twi:schedules', updatedSchedules);

    return NextResponse.json({
      success: true,
      message: `Berhasil mencadangkan ${messages.length} pesan.`,
      channelName,
      count: messages.length,
      logs: messages,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { matchId, channelId, refereeDiscordId, roleAId, roleBId } = body;

    if (!matchId) {
      return NextResponse.json({ error: 'matchId wajib disertakan' }, { status: 400 });
    }

    await deleteMatchDiscordChannel({
      matchId,
      savedChannelId: channelId,
      refereeDiscordId,
      roleAId,
      roleBId,
    });

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const updatedSchedules = schedules.map((m: any) => {
      if (m.id === matchId) {
        return {
          ...m,
          discordChannelId: undefined,
          discordLogsSaved: true,
        };
      }
      return m;
    });
    await kv.set('twi:schedules', updatedSchedules);

    const validArchivedSchedules = updatedSchedules.filter((m: any) => {
      const hasActiveChannel = Boolean(m.discordChannelId && String(m.discordChannelId).trim() !== '');
      const hasSavedLogs = Boolean(m.discordLogsSaved);
      return hasActiveChannel || hasSavedLogs;
    });

    return NextResponse.json({
      success: true,
      message: `Channel Discord untuk ${matchId} berhasil dihapus dan status KV diperbarui.`,
      schedules: validArchivedSchedules,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
