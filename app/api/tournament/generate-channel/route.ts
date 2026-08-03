import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/lib/types/tournament';
import { createMatchDiscordChannel } from '@/lib/discord/channels';

function getTeamSlug(teamName: string) {
  return teamName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// Helper Generator Random Token jika token match masih kosong
function generateRandomToken(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(req: Request) {
  try {
    const { matchId, matchIds, weekName } = await req.json();

    const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
    const targetMatchIds: string[] = matchIds || (matchId ? [matchId] : []);

    if (targetMatchIds.length === 0) {
      return NextResponse.json({ error: 'Tidak ada match yang dipilih' }, { status: 400 });
    }

    const results = [];
    const isSync = !matchIds;
    let isScheduleUpdated = false;

    for (const mId of targetMatchIds) {
      const matchIndex = schedules.findIndex((m) => m.id === mId);
      if (matchIndex === -1) continue;

      const match = schedules[matchIndex];

      // 🟢 AUTO-GENERATE TOKEN JIKA MASIH KOSONG (TANPA MENGUBAH JADWAL)
      if (!match.refereeToken) {
        match.refereeToken = generateRandomToken(16);
        schedules[matchIndex] = match;
        isScheduleUpdated = true;
      }

      const [teamA, teamB] = await Promise.all([
        kv.hgetall(`teams:${getTeamSlug(match.teamAName)}`),
        kv.hgetall(`teams:${getTeamSlug(match.teamBName)}`),
      ]);

      const roleAId = (teamA as any)?.discordRoleId;
      const roleBId = (teamB as any)?.discordRoleId;

      const channelId = await createMatchDiscordChannel({
        matchId: match.id,
        teamAName: match.teamAName,
        teamBName: match.teamBName,
        weekName: weekName || 'Week 1',
        matchDateIso: match.matchDate,
        refereeName: match.referee,
        refereeDiscordId: match.refereeDiscordId,
        streamerName: match.streamer,
        streamerDiscordId: match.caster,
        streamLink: match.streamLink,
        roleAId,
        roleBId,
        isSync,
      });

      results.push({ matchId: mId, success: !!channelId, channelId });

      if (targetMatchIds.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // 💾 Simpan kembali ke Redis jika ada token baru yang dibuat
    if (isScheduleUpdated) {
      await kv.set('twi:schedules', schedules);
    }

    return NextResponse.json({ success: true, totalProcessed: results.length, results });
  } catch (error) {
    console.error('Error generate channel:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
