import { discordAPI, getFooterText } from '../utils';

export interface DeckSubmissionStore {
  matchId: string;
  teamSlug: string;
  submittedPlayers: Array<{
    name: string;
    submittedAt: string;
    submittedBy: string;
  }>;
  totalDecks: number;
  lastTrackerMessageId?: string | null;
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
    }) + ' WIB'
  );
}

// 🟡 1. EMBED PENGUMUMAN PAGI (CHANNEL CAMP)
export function getMorningCampEmbed(params: {
  deadlineWib: string;
  timeRemainingStr: string;
}) {
  return {
    title: '⏳ PENGUMPULAN DECK DIBUKA — TWI SEASON 7',
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
    footer: { text: getFooterText() },
  };
}

// 📊 2. EMBED LIVE DECK TRACKER (CHANNEL CAMP)
export function getLiveDeckTrackerEmbed(params: {
  deadlineWib: string;
  timeRemainingStr: string;
  submittedPlayers: Array<{ name: string }>;
}) {
  const count = params.submittedPlayers.length;
  const totalDecks = count * 2;
  const isComplete = count >= 5;

  const playerRows: string[] = [];
  for (let i = 0; i < 5; i++) {
    if (i < count) {
      playerRows.push(`${i + 1}. **${params.submittedPlayers[i].name}** ✅ *(2 Deck)*`);
    } else {
      playerRows.push(`${i + 1}. \`[Slot Kosong]\` ❌`);
    }
  }

  return {
    title: '📊 STATUS PENGUMPULAN DECK (LIVE TRACKER)',
    color: isComplete ? 0x2ecc71 : 0x3498db,
    description:
      `⏳ **Batas Waktu Submit:** ${params.deadlineWib} (**${params.timeRemainingStr}**)\n` +
      `📦 **Total Terkumpul:** **\`${totalDecks} / 10 Deck\`** ${isComplete ? '*(LENGKAP ✅)*' : ''}\n\n` +
      '🔗 **Regulasi Lengkap:** [teamwars.web.id/rules](https://teamwars.web.id/rules)',
    fields: [
      {
        name: '👥 Pemain Terdata (2 Deck/Pemain)',
        value: playerRows.join('\n'),
      },
      {
        name: '📌 Informasi',
        value: '• Kirim SS deck di channel ini.\n• Wasit/Admin gunakan `/submit` untuk memvalidasi pemain.',
      },
    ],
    footer: { text: getFooterText() },
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
      {
        name: '📌 Kuota & Teknis Lainnya',
        value:
          '• **Repeat Deck:** Maksimal 2x per tim (hanya jika kalah di game 1 tanpa menang).\n' +
          '• **Substitute Cadangan:** Maksimal 1x pergantian (izin wasit & deck identik).\n' +
          '• **DC & Glitch:** Disconnect = **Kalah otomatis**. Klaim glitch wajib lapor bukti video/SS maksimal **5 menit**.',
      },
    ],
    footer: { text: getFooterText() },
  };
}

// 🔁 HELPER DELETE-REPOST LIVE TRACKER DI CHANNEL CAMP
export async function sendOrUpdateLiveTracker(params: {
  channelId: string;
  matchDateIso: string;
  submittedPlayers: Array<{ name: string }>;
  existingMsgId?: string | null;
}): Promise<string | null> {
  if (!params.channelId) return null;

  if (params.existingMsgId) {
    await discordAPI(`/channels/${params.channelId}/messages/${params.existingMsgId}`, 'DELETE').catch(() => null);
  }

  const deadlineIso = new Date(new Date(params.matchDateIso).getTime() - 60 * 60 * 1000).toISOString();
  const embed = getLiveDeckTrackerEmbed({
    deadlineWib: formatWIBTimeOnly(deadlineIso),
    timeRemainingStr: formatTimeRemaining(deadlineIso),
    submittedPlayers: params.submittedPlayers,
  });

  const res = await discordAPI(`/channels/${params.channelId}/messages`, 'POST', {
    embeds: [embed],
  }).catch(() => null);

  return res?.id || null;
}