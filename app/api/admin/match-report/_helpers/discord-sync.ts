import { kv } from '@vercel/kv';
import { sendOrUpdateLiveTracker, TrackerPlayer } from '@/lib/discord/messages/match-briefing';

export async function syncCampTrackers(matchId: string, matchDateIso: string, reportData: any) {
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
