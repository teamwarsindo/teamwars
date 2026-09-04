import { kv } from '@vercel/kv';
import { discordAPI, getEmbedFooterText } from '../utils';
import { getMatchWeekNumber } from '@/app/tournament/_library';

export interface DeckSlotInfo {
  archetype?: string | null;
  skill?: string | null;
  wins?: number;
  losses?: number;
  isDead?: boolean;
  isRepeatUsed?: boolean;
  lastGameNumber?: number | null;
}

export interface TrackerPlayer {
  ign?: string;
  name?: string;
  idDuelLinks?: string;
  deck1?: DeckSlotInfo | null;
  deck2?: DeckSlotInfo | null;
}

// ⏱️ Hitung sisa waktu selaras dengan jam menit footer (detik dinormalisasi ke 00)
export function formatTimeRemaining(targetDateIso?: string, referenceDate: Date = new Date()): string {
  if (!targetDateIso) return 'belum ditentukan';

  const targetDate = new Date(targetDateIso);

  const refNorm = new Date(referenceDate);
  refNorm.setSeconds(0, 0);

  const targetNorm = new Date(targetDate);
  targetNorm.setSeconds(0, 0);

  const diffMs = targetNorm.getTime() - refNorm.getTime();
  if (diffMs <= 0) return 'waktu telah berakhir';

  const totalMinutes = Math.round(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) return `sisa ${hours} jam ${minutes} menit`;
  if (hours > 0) return `sisa ${hours} jam`;
  return `sisa ${minutes} menit`;
}

export function formatWIBTimeOnly(dateIso?: string): string {
  if (!dateIso) return '-';
  const d = new Date(dateIso);
  return (
    d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jakarta',
    }).replace(':', '.') + ' WIB'
  );
}

// 🔍 Live check message
export async function checkDiscordMessageExists(channelId: string, messageId?: string | null): Promise<boolean> {
  if (!channelId || !messageId) return false;
  try {
    const res = await discordAPI(`/channels/${channelId}/messages/${messageId}`, 'GET');
    return !!(res && res.id);
  } catch {
    return false;
  }
}

// 🟡 1. EMBED PENGUMUMAN PAGI
export function getMorningCampEmbed(params: {
  week?: string | number;
  matchDateIso?: string;
  deadlineWib: string;
  timeRemainingStr: string;
}) {
  const calculatedWeek = params.week || getMatchWeekNumber(params.matchDateIso);
  const weekLabel = `Week ${calculatedWeek}`;

  return {
    title: `⏳ Reminder Submission (${weekLabel})`,
    color: 0xf59e0b,
    description:
      'Pengumpulan deck **sudah dapat dilakukan mulai sekarang** di channel camp ini.\n\n' +
      '🔗 **Regulasi Lengkap:** [teamwars.web.id/rules](https://teamwars.web.id/rules)',
    fields: [
      {
        name: '📋 Ketentuan Submit & Line-up',
        value:
          `• **Deadline Submit:** 10 SS deck terbaru wajib terkirim lengkap maksimal **${params.deadlineWib}** (${params.timeRemainingStr}).\n` +
          '• **Line-up & Archetype:** 5 pemain (masing-masing 2 deck berbeda). Kuota archetype sama maksimal **5x per tim** (termasuk mixed deck).\n' +
          '• **Validasi Akun:** ID & IGN in-game wajib sama persis dengan data registrasi.',
      },
      {
        name: '⚠️ Sanksi Keterlambatan & Kick-off',
        value:
          '• **Telat (H-60 s/d Kick-off):** Pemotongan waktu kontrol **2 menit per deck**.\n' +
          '• **Saat Kick-off:** Deck belum disubmit = **Loss Deck**.\n' +
          '• **Gagal Hadir:** Total submit kurang dari 6 deck = **Kalah W.O (0-10)**.',
      },
      {
        name: '🚨 Sanksi Fatal Akun & Deck',
        value:
          '• Masuk akun salah / ubah isi deck yang disubmit = **Loss 2 deck**.\n' +
          '• Salah membawa archetype = **Loss 1 deck**.',
      },
    ],
    footer: { text: getEmbedFooterText() },
  };
}

// Helper format deck line dengan singkatan skill dari master KV
function formatDeckLine(
  prefix: '├─' | '└─',
  deck?: DeckSlotInfo | null,
  isSlotActive = true,
  skillsMap: Record<string, string> = {}
): { text: string; isSubmitted: boolean } {
  if (!isSlotActive || deck === null) {
    return { text: `${prefix} ❌ Belum Submit`, isSubmitted: false };
  }

  const hasArchetype = Boolean(deck?.archetype && deck.archetype.trim() !== '');
  const hasSkill = Boolean(deck?.skill && deck.skill !== '-' && deck.skill.trim() !== '');

  if (hasArchetype || hasSkill) {
    const archetypeLabel = hasArchetype ? deck!.archetype : '*(Menunggu Archetype)*';
    let skillLabel = '';

    if (hasSkill) {
      const shortSkill = skillsMap[deck!.skill!] || deck!.skill;
      skillLabel = ` • ${shortSkill}`;
    }

    return {
      text: `${prefix} ${hasArchetype ? '✅' : '⏳'} ${archetypeLabel}${skillLabel}`,
      isSubmitted: hasArchetype,
    };
  }

  return {
    text: `${prefix} ⏳ Menunggu Input`,
    isSubmitted: false,
  };
}

// 📊 2. EMBED LIVE DECK TRACKER
export function getLiveDeckTrackerEmbed(params: {
  week?: string | number;
  matchDateIso?: string;
  deadlineWib: string;
  timeRemainingStr: string;
  submittedPlayers: TrackerPlayer[];
  skillsMap?: Record<string, string>;
  lastUpdated?: string | Date;
}) {
  const calculatedWeek = params.week || getMatchWeekNumber(params.matchDateIso);
  const weekLabel = `Week ${calculatedWeek}`;
  const count = params.submittedPlayers.length;
  const skillsMap = params.skillsMap || {};

  let totalDecksSubmitted = 0;
  const playerFields: Array<{ name: string; value: string; inline: boolean }> = [];

  for (let i = 0; i < 5; i++) {
    if (i < count) {
      const player = params.submittedPlayers[i];
      const playerName = player.ign || player.name || 'Pemain';
      const dlLabel = player.idDuelLinks ? ` (${player.idDuelLinks})` : '';

      const hasDeck1 = player.deck1 !== null;
      const hasDeck2 = player.deck2 !== null;

      const d1 = formatDeckLine('├─', player.deck1, hasDeck1, skillsMap);
      const d2 = formatDeckLine('└─', player.deck2, hasDeck2, skillsMap);

      if (d1.isSubmitted) totalDecksSubmitted++;
      if (d2.isSubmitted) totalDecksSubmitted++;

      playerFields.push({
        name: `${i + 1}. ${playerName}${dlLabel}`,
        value: `${d1.text}\n${d2.text}`,
        inline: false,
      });
    } else {
      playerFields.push({
        name: `${i + 1}. [Slot Kosong]`,
        value: `├─ ❌ Belum Submit\n└─ ❌ Belum Submit`,
        inline: false,
      });
    }
  }

  const isComplete = totalDecksSubmitted >= 10;

  return {
    title: `📊 Deck Submission (${weekLabel})`,
    color: isComplete ? 0x2ecc71 : 0x3498db,
    description:
      `⏳ **Batas Waktu:** ${params.deadlineWib} (**${params.timeRemainingStr}**)\n` +
      `📦 **Terkumpul:** **\`${totalDecksSubmitted} / 10 Deck\`** ${isComplete ? '*(LENGKAP ✅)*' : ''}\n\n` +
      '🔗 **Regulasi:** [teamwars.web.id/rules](https://teamwars.web.id/rules)',
    fields: [
      ...playerFields,
      {
        name: '📌 Perintah Staff',
        value:
          '• `/submit add` : Daftarkan 1-5 pemain\n' +
          '• `/submit edit` : Update deck & skill\n' +
          '• `/submit change` : Ganti pemain',
        inline: false,
      },
    ],
    footer: { text: getEmbedFooterText(params.lastUpdated) },
  };
}

// ⚔️ 3. EMBED MATCH BRIEFING
export function getMatchBriefingEmbed() {
  return {
    title: '⚔️ IN-GAME MATCH BRIEFING — TWI SEASON 7',
    color: 0xaa1348,
    description:
      'Wasit mengambil alih jalannya pertandingan. Mohon patuhi regulasi duel berikut:\n\n' +
      '🔗 **Regulasi Lengkap:** [teamwars.web.id/rules](https://teamwars.web.id/rules)',
    fields: [
      {
        name: '🎮 Regulasi Room & Rotasi',
        value:
          '• ID Room akan dibagikan langsung oleh Wasit. **Hanya pemain yang sedang bertanding yang diperbolehkan berada di dalam room.**\n' +
          '• **Pemenang (Winner):** *Stay table* di dalam room.\n' +
          '• **Kalah (Loser):** Wajib ganti ke deck kedua. Jika kedua deck miliknya sudah habis, pemain tersebut **wajib segera keluar room** dan digantikan oleh pemain berikutnya.',
      },
      {
        name: '⏱️ Waktu Kontrol & Standby',
        value:
          '• Waktu kontrol total **15 menit per tim** (jalan saat persiapan/ganti deck, pause saat duel/di lobby).\n' +
          '• Pemain pertama wajib langsung standby di room. Jika belum masuk saat jam kick-off tiba, timer kontrol tim langsung berjalan.',
      },
      {
        name: '📸 Screenshot (SS) Starting Hand & Sanksi Tim',
        value:
          '• Wajib SS *full screen* di awal duel (hand & field sendiri, hand & field lawan, serta sisa kartu Main/Extra Deck lawan) dan kirim ke channel tim tiap game usai.\n' +
          '• **Sanksi:** Pelanggaran 1 = Peringatan Ringan. **Akumulasi 2x Peringatan Ringan dalam 1 tim = Loss 1 deck**.',
      },
    ],
    footer: { text: getEmbedFooterText() },
  };
}

// 🔁 HELPER LIVE TRACKER (PATCH atau DELETE-REPOST)
export async function sendOrUpdateLiveTracker(params: {
  channelId: string;
  matchDateIso: string;
  week?: string | number;
  submittedPlayers: TrackerPlayer[];
  existingMsgId?: string | null;
  shouldRepost?: boolean;
}): Promise<string | null> {
  if (!params.channelId) return null;

  const now = new Date();
  const skillsMap = (await kv.get<Record<string, string>>('twi:master_skills')) || {};
  const deadlineIso = new Date(new Date(params.matchDateIso).getTime() - 60 * 60 * 1000).toISOString();

  const embed = getLiveDeckTrackerEmbed({
    week: params.week,
    matchDateIso: params.matchDateIso,
    deadlineWib: formatWIBTimeOnly(deadlineIso),
    timeRemainingStr: formatTimeRemaining(deadlineIso, now),
    submittedPlayers: params.submittedPlayers,
    skillsMap,
    lastUpdated: now,
  });

  // 1. Edit di tempat jika BUKAN mode repost dan ID pesan tracker lama tersedia
  if (!params.shouldRepost && params.existingMsgId) {
    try {
      const res = await discordAPI(
        `/channels/${params.channelId}/messages/${params.existingMsgId}`,
        'PATCH',
        { embeds: [embed] }
      );
      if (res?.id) return res.id;
    } catch (patchErr) {
      console.warn('Gagal PATCH live tracker lama, fallback POST pesan baru:', patchErr);
    }
  }

  // 2. Hapus pesan tracker lama jika mode repost diaktifkan
  if (params.shouldRepost && params.existingMsgId) {
    await discordAPI(`/channels/${params.channelId}/messages/${params.existingMsgId}`, 'DELETE').catch(() => null);
  }

  // 3. Buat pesan baru ke dasar channel
  const res = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', {
    embeds: [embed],
  }).catch((err) => {
    console.error('Error posting live tracker embed:', err);
    return null;
  });

  return res?.id || null;
    }
