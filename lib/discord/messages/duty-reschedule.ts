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
  return clean === '' || clean === '-';
};

export async function sendOrUpdateDutyRescheduleSchedule(params: {
  weekName: string; // Contoh: "Week 7"
  matches: Array<RescheduleDutyMatch>;
}) {
  // 1. Hanya ambil match hasil reschedule yang sudah disepakati
  const rescheduledMatches = params.matches.filter((m) => Boolean(m.isRescheduled));

  // 2. Filter per kebutuhan peran
  const needRefereeMatches = rescheduledMatches.filter((m) => isDutyEmpty(m.referee));
  const needStreamerMatches = rescheduledMatches.filter((m) => isDutyEmpty(m.streamer));

  // 3. Format deskripsi match
  const buildDutyDescription = (schedules: Array<RescheduleDutyMatch>): string => {
    let desc = 'Penyesuaian jadwal pertandingan resmi yang sudah disepakati:\n\n';

    if (!schedules || schedules.length === 0) {
      desc += '_Belum ada jadwal terkonfirmasi._';
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
      channelId: DISCORD_CONFIG.CH_REFEREE,
      roleId: DISCORD_CONFIG.ROLE_REFEREE,
      kvKey: `${KV_KEYS.REFEREE}_${weekSuffix}`,
      emptyList: needRefereeMatches,
      title: `📊 Schedule Butuh Wasit - ${params.weekName}`,
      color: 0x3498db,
      label: 'Referee',
      alertMessage: '📌 **TUGAS WAJIB:** Pertandingan resmi di bawah belum ada wasit. Segera ambil tugas masing-masing demi kelancaran turnamen.',
    },
    {
      channelId: DISCORD_CONFIG.CH_STREAMER,
      roleId: DISCORD_CONFIG.ROLE_STREAMER,
      kvKey: `${KV_KEYS.STREAMER}_${weekSuffix}`,
      emptyList: needStreamerMatches,
      title: `📊 Schedule Butuh Streamer - ${params.weekName}`,
      color: 0xe74c3c,
      label: 'Streamer',
      alertMessage: '📺 Halo teman-teman! Jadwal tanding resmi sudah ditetapkan. Sekiranya ada yang tersedia untuk menyiarkan pertandingan ini, silakan konfirmasi ya~',
    },
  ];

  for (const target of targets) {
    if (!target.channelId) continue;

    // Cek dan hapus pesan tracker lama dari KV jika ada
    const oldMsgId = await kv.get<string>(target.kvKey);
    if (oldMsgId) {
      await discordAPI(`/channels/${target.channelId}/messages/${oldMsgId}`, 'DELETE').catch(() => null);
      await kv.del(target.kvKey);
    }

    // Jika seluruh tugas sudah terisi (kosong), jangan kirim pesan baru
    if (target.emptyList.length === 0) {
      continue;
    }

    // Format tag role: <@&ID_ROLE>
    const roleMention = target.roleId ? `<@&${target.roleId}>` : '';
    const contentText = roleMention ? `${roleMention}\n${target.alertMessage}` : target.alertMessage;

    // Buat payload pesan embed lengkap dengan content dan allowed_mentions
    const payload = {
      content: contentText,
      embeds: [
        {
          title: target.title,
          color: target.color,
          description: buildDutyDescription(target.emptyList),
          footer: { text: getEmbedFooterText() },
        },
      ],
      allowed_mentions: {
        parse: ['roles'], // Wajib agar tag <@&id> benar-benar memicu notifikasi ping
      },
    };

    // Kirim pesan baru dan simpan ID ke KV
    const postRes: any = await discordAPI(
      `/channels/${target.channelId}/messages`,
      'POST',
      payload
    ).catch(() => null);

    if (postRes?.id) {
      await kv.set(target.kvKey, postRes.id);
    }
  }
      }
