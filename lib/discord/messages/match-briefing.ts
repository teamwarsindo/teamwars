import { discordAPI, getEmbedFooterText } from '../utils';
import { getMatchWeekNumber } from '@/app/tournament/_library';

export interface DeckSlotInfo {
  status?: 'PENDING_INPUT' | 'VERIFIED' | 'NOT_SUBMITTED' | string;
  archetype?: string | null;
  skill?: string | null;
  ssUrl?: string | null;
}

export interface DeckSubmissionStore {
  matchId: string;
  teamSlug: string;
  submittedPlayers: Array<{
    name?: string;
    ign?: string;
    idDuelLinks?: string;
    submittedAt?: string;
    submittedBy?: string;
    deck1?: DeckSlotInfo | null;
    deck2?: DeckSlotInfo | null;
  }>;
  totalDecks: number;
  morningMsgId?: string | null;
  lastTrackerMessageId?: string | null;
}

export interface TrackerPlayer {
  ign?: string;
  name?: string;
  idDuelLinks?: string;
  submittedAt?: string;
  submittedBy?: string;
  deck1?: DeckSlotInfo | null;
  deck2?: DeckSlotInfo | null;
}

export function formatTimeRemaining(targetDateIso?: string): string {
  if (!targetDateIso) return 'belum ditentukan';
  const diffMs = new Date(targetDateIso).getTime() - Date.now();
  if (diffMs <= 0) return 'waktu telah berakhir';

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
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

// 🔍 HELPER PENGECEKAN KEBERADAAN PESAN DI DISCORD (LIVE CHECK)
export async function checkDiscordMessageExists(channelId: string, messageId?: string | null): Promise<boolean> {
  if (!channelId || !messageId) return false;
  try {
    const res = await discordAPI(`/channels/${channelId}/messages/${messageId}`, 'GET');
    return !!(res && res.id);
  } catch {
    return false;
  }
}

// 🟡 1. EMBED PENGUMUMAN PAGI (CHANNEL CAMP)
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

// Helper pembuat baris deck sub-list
function formatDeckLine(prefix: '├─' | '└─', deck?: DeckSlotInfo | null): { text: string; isSubmitted: boolean; isPending: boolean } {
  if (!deck) {
    return { text: `${prefix} ❌ Belum Submit`, isSubmitted: false, isPending: false };
  }

  if (deck.status === 'VERIFIED' && deck.archetype) {
    const skillText = deck.skill && deck.skill !== '-' ? ` • ${deck.skill}` : '';
    const ssText = deck.ssUrl ? ` • [Lihat SS](${deck.ssUrl})` : '';
    return {
      text: `${prefix} ${deck.archetype}${skillText}${ssText}`,
      isSubmitted: true,
      isPending: false,
    };
  }

  return { text: `${prefix} ⏳ Menunggu Input`, isSubmitted: true, isPending: true };
}

// 📊 2. EMBED LIVE DECK TRACKER (CHANNEL CAMP)
export function getLiveDeckTrackerEmbed(params: {
  week?: string | number;
  matchDateIso?: string;
  deadlineWib: string;
  timeRemainingStr: string;
  submittedPlayers: TrackerPlayer[];
  lastUpdated?: string | Date;
}) {
  const calculatedWeek = params.week || getMatchWeekNumber(params.matchDateIso);
  const weekLabel = `Week ${calculatedWeek}`;
  const count = params.submittedPlayers.length;

  let totalDecksSubmitted = 0;
  const playerBlocks: string[] = [];

  for (let i = 0; i < 5; i++) {
    if (i < count) {
      const player = params.submittedPlayers[i];
      const playerName = player.ign || player.name || 'Pemain';
      const dlLabel = player.idDuelLinks ? ` (${player.idDuelLinks})` : '';

      const d1 = formatDeckLine('├─', player.deck1);
      const d2 = formatDeckLine('└─', player.deck2);

      let playerDeckCount = 0;
      if (d1.isSubmitted) playerDeckCount++;
      if (d2.isSubmitted) playerDeckCount++;
      totalDecksSubmitted += playerDeckCount;

      let badge = '⏳ (0/2 Deck)';
      if (d1.isSubmitted && d2.isSubmitted) {
        badge = (!d1.isPending && !d2.isPending) ? '✅ (2 Deck)' : '⏳ (2 Deck di Camp)';
      } else if (playerDeckCount === 1) {
        badge = '⚠️ (1/2 Deck)';
      }

      playerBlocks.push(
        `${i + 1}. **${playerName}**${dlLabel} ${badge}\n   ${d1.text}\n   ${d2.text}`
      );
    } else {
      playerBlocks.push(
        `${i + 1}. \`[Slot Kosong]\` ❌\n   ├─ ❌ Belum Submit\n   └─ ❌ Belum Submit`
      );
    }
  }

  const isComplete = totalDecksSubmitted >= 10;

  return {
    title: `📊 Deck Submission (${weekLabel})`,
    color: isComplete ? 0x2ecc71 : 0x3498db,
    description:
      `⏳ **Batas Waktu Submit:** ${params.deadlineWib} (**${params.timeRemainingStr}**)\n` +
      `📦 **Total Terkumpul:** **\`${totalDecksSubmitted} / 10 Deck\`** ${isComplete ? '*(LENGKAP ✅)*' : ''}\n\n` +
      '🔗 **Regulasi Lengkap:** [teamwars.web.id/rules](https://teamwars.web.id/rules)',
    fields: [
      {
        name: '👥 Lineup & Status Deck Pemain',
        value: playerBlocks.join('\n\n'),
      },
      {
        name: '📌 Informasi Perintah Staff',
        value:
          '• **`/submit add`** : Daftarkan 1 s/d 5 nama pemain ke lineup.\n' +
          '• **`/submit edit`** : Input/verifikasi detail nama Deck, Skill, dan SS.\n' +
          '• **`/submit change`** : Pergantian pemain lineup dengan roster cadangan.',
      },
    ],
    footer: { text: getEmbedFooterText(params.lastUpdated) },
  };
}

// ⚔️ 3. EMBED MATCH BRIEFING (CHANNEL MATCH - H-30 MENIT)
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

// 🔁 HELPER DELETE-REPOST LIVE TRACKER
export async function sendOrUpdateLiveTracker(params: {
  channelId: string;
  matchDateIso: string;
  week?: string | number;
  submittedPlayers: TrackerPlayer[];
  existingMsgId?: string | null;
}): Promise<string | null> {
  if (!params.channelId) return null;

  if (params.existingMsgId) {
    await discordAPI(`/channels/${params.channelId}/messages/${params.existingMsgId}`, 'DELETE').catch(() => null);
  }

  const deadlineIso = new Date(new Date(params.matchDateIso).getTime() - 60 * 60 * 1000).toISOString();
  const embed = getLiveDeckTrackerEmbed({
    week: params.week,
    matchDateIso: params.matchDateIso,
    deadlineWib: formatWIBTimeOnly(deadlineIso),
    timeRemainingStr: formatTimeRemaining(deadlineIso),
    submittedPlayers: params.submittedPlayers,
    lastUpdated: new Date(),
  });

  const res = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', {
    embeds: [embed],
  }).catch(() => null);

  return res?.id || null;
    }
