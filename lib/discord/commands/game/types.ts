import { kv } from '@vercel/kv';
import { MatchScheduleItem } from '@/app/tournament/_library';
import { sendOrUpdateLiveTracker, TrackerPlayer } from '@/lib/discord/messages/match-briefing';

export interface GameContext {
  interaction: any;
  channelId: string;
  appId: string;
  token: string;
  match: MatchScheduleItem;
  reportData: any;
  optMap: Record<string, any>;
  isBeforeKickoff: boolean;
  userIsAdmin: boolean;
}

export function getOptionMap(options: any[] = []): Record<string, any> {
  const map: Record<string, any> = {};
  for (const opt of options) map[opt.name] = opt.value;
  return map;
}

export async function resolveMatchFromChannel(channelId: string) {
  const schedules = (await kv.get<MatchScheduleItem[]>('twi:schedules')) || [];
  const currentMatch = schedules.find((m) => m.discordChannelId === channelId);
  if (currentMatch) return currentMatch;

  const messages = (await kv.hgetall<Record<string, any>>('discord:match_messages')) || {};
  for (const [matchId, raw] of Object.entries(messages)) {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (data.matchChannel?.channelId === channelId) {
      return schedules.find((m) => m.id === matchId) || null;
    }
  }
  return null;
}

export async function syncCampTrackers(matchId: string, matchDateIso: string, reportData: any) {
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
    msgData.campA.trackerMsgId = trackerIdA;
    changed = true;
  }
  if (msgData.campB?.channelId) {
    const trackerIdB = await sendOrUpdateLiveTracker({
      channelId: msgData.campB.channelId,
      matchDateIso,
      submittedPlayers: mapTracker(reportData.teamB?.lineup),
      existingMsgId: msgData.campB.trackerMsgId,
    });
    msgData.campB.trackerMsgId = trackerIdB;
    changed = true;
  }

  if (changed) {
    await kv.hset('discord:match_messages', { [matchId]: JSON.stringify(msgData) });
  }
}
