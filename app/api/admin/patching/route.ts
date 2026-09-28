import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { sendOrUpdateOpeningEmbed } from '@/lib/discord/messages/opening';
import {
  delay,
  getTeamSlug,
  getMatchWeekNumber,
  getTournamentWeekNumberSafe,
} from '@/lib/discord/match-sync/helpers';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const targetWeek = searchParams.get('week') || searchParams.get('targetWeek') || '9';

    // 1. Ambil data jadwal dari Redis KV
    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];

    // 2. Ekstraksi pekan & filtering presisi
    const weekMatch = String(targetWeek).match(/\d+/);
    const weekNumber = weekMatch ? parseInt(weekMatch[0], 10) : getTournamentWeekNumberSafe();
    const normTarget = String(targetWeek).toLowerCase().replace(/[^a-z0-9]/g, '');

    const weekMatches = schedules.filter((m: any) => {
      const computedWeek = m.weekNumber || getMatchWeekNumber(m.matchDate);
      if (computedWeek === weekNumber) return true;

      const mWeekName = String(m.weekName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const mStage = String(m.stage || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return (mWeekName && mWeekName.includes(normTarget)) || (mStage && mStage.includes(normTarget));
    });

    if (weekMatches.length === 0) {
      return NextResponse.json(
        { error: `Tidak ditemukan jadwal pertandingan untuk ${targetWeek}` },
        { status: 404 }
      );
    }

    const updatedSchedules: MatchScheduleItem[] = [...schedules];
    const results: Array<{ matchId: string; channelId: string; newOpeningMsgId: string | null }> = [];

    // 3. Eksekusi refresh opening pesan tanpa menge-tag role tim
    for (const match of weekMatches) {
      const channelId = (match as any).discordChannelId;
      const existingOpeningMsgId = (match as any).openingMsgId;

      // Lewati jika match belum dibuatkan channel Discord
      if (!channelId) continue;

      const slugA = getTeamSlug(match.teamAName);
      const slugB = getTeamSlug(match.teamBName);

      const [teamA, teamB] = await Promise.all([
        kv.hgetall<any>(`teams:${slugA}`).then((res) => res || kv.hgetall<any>(`team:${slugA}`)),
        kv.hgetall<any>(`teams:${slugB}`).then((res) => res || kv.hgetall<any>(`team:${slugB}`)),
      ]);

      const roleA = teamA?.discordRoleId || teamA?.roleId;
      const roleB = teamB?.discordRoleId || teamB?.roleId;
      const groupOrStage = match.groupName || (match as any).stage || 'Playoff';
      const computedWeekNum = match.weekNumber || getMatchWeekNumber(match.matchDate);
      const weekStr = (match as any).weekName || `Week ${computedWeekNum}`;

      // Memanggil fungsi opening dengan existingMsgId agar dihapus & diposting ulang tanpa tag role
      const newOpeningMsgId = await sendOrUpdateOpeningEmbed({
        channelId,
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
        weekName: weekStr,
        matchDateIso: match.matchDate,
        refereeName: match.referee,
        refereeDiscordId: match.refereeDiscordId,
        streamerName: match.streamer,
        streamerDiscordId: match.streamerDiscordId,
        streamLink: match.streamLink,
        existingMsgId: existingOpeningMsgId,
      });

      // Update referensi ID pesan opening jika berubah
      const idx = updatedSchedules.findIndex((m) => m.id === match.id);
      if (idx !== -1 && newOpeningMsgId) {
        (updatedSchedules[idx] as any).openingMsgId = newOpeningMsgId;
      }

      results.push({
        matchId: match.id,
        channelId,
        newOpeningMsgId,
      });

      // Delay mencegah rate limit Discord API
      await delay(350);
    }

    // 4. Simpan kembali pembaruan ID pesan opening ke database KV
    await kv.set('twi:schedules', updatedSchedules);

    return NextResponse.json({
      success: true,
      message: `Berhasil me-refresh pesan opening untuk babak ${targetWeek}!`,
      totalUpdated: results.length,
      details: results,
    });
  } catch (error: any) {
    console.error('Error refreshing opening messages:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}