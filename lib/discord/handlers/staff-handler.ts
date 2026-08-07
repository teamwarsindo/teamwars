import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/lib/types/tournament';
import { sendAssignmentLog, sendReassignReplyNote, completeAssignmentLog } from '@/lib/discord/messages/assignment-log';

export async function handleStaffCommand(interaction: any) {
  const options = interaction.data?.options || [];
  const action = options.find((o: any) => o.name === 'action')?.value;
  const type = options.find((o: any) => o.name === 'type')?.value;
  const userId = options.find((o: any) => o.name === 'user')?.value;
  const matchId = options.find((o: any) => o.name === 'match')?.value;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  if (action === 'update') {
    const res = await fetch(`${baseUrl}/api/tournament/staff-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    }).then((r) => r.json());

    return {
      type: 4,
      data: {
        content: res.message || ' Master list staf berhasil diperbarui!',
        flags: 64,
      },
    };
  }

  const res = await fetch(`${baseUrl}/api/tournament/staff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, matchId, type, userId }),
  }).then((r) => r.json());

  if (!res.success) {
    return {
      type: 4,
      data: { content: `❌ Error: ${res.error || res.message}`, flags: 64 },
    };
  }

  const match: MatchScheduleItem = res.match;
  const roleType = type === 'STREAMER' ? 'STREAMER' : 'REFEREE';

  await fetch(`${baseUrl}/api/tournament/sync-match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      matchId: match.id,
      removeStaffId: res.oldUserId,
      removeRoleType: roleType,
    }),
  });

  if (action === 'assign') {
    const logId = await sendAssignmentLog({ match, staffDiscordId: userId, roleType });
    if (logId) {
      const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
      const idx = schedules.findIndex((m) => m.id === match.id);
      if (idx !== -1) {
        if (roleType === 'REFEREE') (schedules[idx] as any).refereeLogMsgId = logId;
        else (schedules[idx] as any).streamerLogMsgId = logId;
        await kv.set('twi:schedules', schedules);
      }
    }
  } else if (action === 'reassign') {
    const targetLogMsgId = roleType === 'REFEREE' ? (match as any).refereeLogMsgId : (match as any).streamerLogMsgId;
    if (targetLogMsgId && res.oldUserId) {
      await sendReassignReplyNote({ targetLogMsgId, oldStaffDiscordId: res.oldUserId, roleType });
    }

    const newLogId = await sendAssignmentLog({ match, staffDiscordId: userId, roleType });
    if (newLogId) {
      const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
      const idx = schedules.findIndex((m) => m.id === match.id);
      if (idx !== -1) {
        if (roleType === 'REFEREE') (schedules[idx] as any).refereeLogMsgId = newLogId;
        else (schedules[idx] as any).streamerLogMsgId = newLogId;
        await kv.set('twi:schedules', schedules);
      }
    }
  } else if (action === 'complete') {
    const targetLogMsgId = roleType === 'REFEREE' ? (match as any).refereeLogMsgId : (match as any).streamerLogMsgId;
    const staffId = roleType === 'REFEREE' ? match.refereeDiscordId : (match.streamerDiscordId || (match as any).casterDiscordId);

    if (targetLogMsgId && staffId) {
      await completeAssignmentLog({ match, targetLogMsgId, staffDiscordId: staffId, roleType });
    }
  }

  return {
    type: 4,
    data: {
      content: ` Processing /staff ${action} berhasil untuk Match **${match.id}**!`,
      flags: 64,
    },
  };
}