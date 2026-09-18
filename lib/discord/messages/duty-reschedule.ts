import { kv } from '@vercel/kv';
import { discordAPI, getEmbedFooterText } from '../utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';

export interface RescheduleDutyMatch {
  matchDateIso: string;
  dateStr: string;
  timeStr: string;
  team1Emoji?: string;
  team1Name: string;
  team2Emoji?: string;
  team2Name: string;
  referee?: string | null;
  streamer?: string | null;
  isRescheduled?: boolean;
}

const KV_KEYS = {
  REFEREE: 'twi:reschedule_tracker:referee_msg_id',
  STREAMER: 'twi:reschedule_tracker:streamer_msg_id',
};

const isDutyEmpty = (val?: string | null) => {
  if (!val) return true;
  const clean = val.trim();
  return clean === '' || clean === '-' || clean.toLowerCase() === 'tbd';
};

export async function sendOrUpdateDutyRescheduleSchedule(params: {
  weekName: string;
  matches: Array<RescheduleDutyMatch>;
  isPatch?: boolean;
  patchReferee?: boolean;
  patchStreamer?: boolean;
}) {
  const patchRef = params.patchReferee ?? params.isPatch ?? false;
  const patchStream = params.patchStreamer ?? params.isPatch ?? false;

  const rescheduledMatches = params.matches.filter((m) => Boolean(m.isRescheduled));
  const needRefereeMatches = rescheduledMatches.filter((m) => isDutyEmpty(m.referee));
  const needStreamerMatches = rescheduledMatches.filter((m) => isDutyEmpty(m.streamer));

  const buildDutyDescription = (schedules: Array<RescheduleDutyMatch>): string => {
    let desc = 'Penyesuaian jadwal pertandingan resmi yang sudah disepakati:\n\n';
    if (!schedules || schedules.length === 0) {
      desc += '_Semua pertandingan pekan ini sudah terisi penuh._';
      return desc;
    }

    const sorted = [...schedules].sort(
      (a, b) => new Date(a.matchDateIso).getTime() - new Date(b.matchDateIso).getTime()
    );

    const matchLines = sorted.map((m) => {
      const e1 = m.team1Emoji ? `${m.team1Emoji} ` : '';
      const e2 = m.team2Emoji ? `${m.team2Emoji} ` : '';
      return `${e1}**${m.team1Name}** vs ${e2}**${m.team2Name}**\n${m.dateStr} at ${m.timeStr}`;
    });

    return desc + matchLines.join('\n\n');
  };

  const weekSuffix = params.weekName.toLowerCase().replace(/\s+/g, '');

  const targets = [
    {
      roleType: 'REFEREE',
      channelId: DISCORD_CONFIG.CH_REFEREE,
      roleId: DISCORD_CONFIG.ROLE_REFEREE,
      kvKey: `${KV_KEYS.REFEREE}_${weekSuffix}`,
      emptyList: needRefereeMatches,
      isPatch: patchRef,
      title: `📊 Schedule Butuh Wasit - ${params.weekName}`,
      color: 0x3498db,
      alertMessage: '📌 **TUGAS WAJIB:** Masih ada pertandingan resmi yang belum ada wasit. Segera ambil tugas masing-masing demi kelancaran turnamen.',
    },
    {
      roleType: 'STREAMER',
      channelId: DISCORD_CONFIG.CH_STREAMER,
      roleId: DISCORD_CONFIG.ROLE_STREAMER,
      kvKey: `${KV_KEYS.STREAMER}_${weekSuffix}`,
      emptyList: needStreamerMatches,
      isPatch: patchStream,
      title: `📊 Schedule Butuh Streamer - ${params.weekName}`,
      color: 0xe74c3c,
      alertMessage: '📺 Halo teman-teman! Jadwal tanding resmi sudah ditetapkan. Sekiranya ada yang tersedia untuk menyiarkan pertandingan ini, silakan konfirmasi ya~',
    },
  ];

  for (const target of targets) {
    if (!target.channelId) continue;

    // 🛑 Lewati target jika parameter spesifik ditentukan dan role ini tidak ditargetkan patch
    if ((params.patchReferee !== undefined || params.patchStreamer !== undefined) && !target.isPatch) {
      continue;
    }

    const oldMsgId = await kv.get<string>(target.kvKey);

    // 1. Jika tugas sudah penuh: hapus tracker lama
    if (target.emptyList.length === 0) {
      if (oldMsgId) {
        await discordAPI(`/channels/${target.channelId}/messages/${oldMsgId}`, 'DELETE').catch(() => null);
        await kv.del(target.kvKey);
      }
      continue;
    }

    const roleMention = target.roleId ? `<@&${target.roleId}>` : '';
    const contentText = target.isPatch
      ? target.alertMessage
      : roleMention
      ? `${roleMention}\n${target.alertMessage}`
      : target.alertMessage;

    const embedPayload = {
      title: target.title,
      color: target.color,
      description: buildDutyDescription(target.emptyList),
      footer: { text: getEmbedFooterText() },
    };

    // 2. KONDISI PATCH: hanya edit pesan yang ada di channel ini
    if (target.isPatch && oldMsgId) {
      const patchRes: any = await discordAPI(
        `/channels/${target.channelId}/messages/${oldMsgId}`,
        'PATCH',
        {
          content: contentText,
          embeds: [embedPayload],
        }
      ).catch(() => null);

      if (patchRes?.id) continue;
    }

    // 3. KONDISI RE-POST: jika bukan patch atau pesan lama belum ada
    if (oldMsgId) {
      await discordAPI(`/channels/${target.channelId}/messages/${oldMsgId}`, 'DELETE').catch(() => null);
      await kv.del(target.kvKey);
    }

    const postRes: any = await discordAPI(
      `/channels/${target.channelId}/messages`,
      'POST',
      {
        content: contentText,
        embeds: [embedPayload],
        allowed_mentions: { parse: ['roles'] },
      }
    ).catch(() => null);

    if (postRes?.id) {
      await kv.set(target.kvKey, postRes.id);
    }
  }
    }
