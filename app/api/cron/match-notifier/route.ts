export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/config';
import { discordAPI } from '@/lib/discord/utils';

// Data Match Dummy
const MATCH_DATA = {
  matchId: 'twi-s7-match-01',
  matchTimeWIB: '20.00 WIB',
  teamA: {
    nama: 'Yanumon',
    channelId: '1531878006589751426',
    roleId: '1531878088932331661',
  },
  teamB: {
    nama: 'Iqbalovers',
    channelId: '1531871083001544754',
    roleId: '1531878181127061625',
  },
  matchChannelId: '610153245955850240',
  wasit: {
    nama: 'Admin TWI',
    mention: '@WasitBertugas',
  },
  roomId: 'ROOM-TWI-8892',
};

// Generator Template Pesan
function buildReminderMessage(teamName: string, roleId: string, matchTime: string): string {
  return `<@&${roleId}>
⏳ **[REMINDER] PERSIAPAN PRA-PERTANDINGAN TWI SEASON 7** ⏳

Halo **${teamName}**, pertandingan kalian akan dimulai pada pukul **${matchTime}** malam ini. 
Mohon segera menyelesaikan administrasi deck dengan memperhatikan regulasi berikut:

⚠️ **ATURAN PENGUMPULAN DECK:**
• Kesepuluh (10) deck wajib dikirimkan di channel ini selambat-lambatnya 60 menit sebelum jadwal pertandingan dimulai. Gambar screenshot deck harus yang paling terbaru dan terlihat jelas.
• **Sanksi Keterlambatan:** Pemotongan waktu kontrol tim sebanyak 2 menit per deck yang terlambat.
• **Sanksi Slot Kosong:** Jika hingga kick-off ada slot deck yang tidak dikirim, slot otomatis dinyatakan auto-loss.

🔍 **VALIDASI DATA PEMAIN & SANKSI FATAL:**
• **IGN & ID:** Ketua tim wajib memastikan ID serta In-Game Name (IGN) pemain sesuai dengan data registrasi. 
🚨 Masuk menggunakan ID/IGN akun yang salah = **Loss 2 deck/game**.
🚨 Ketahuan mengubah isi kartu dari deck yang sudah disubmit = **Loss 2 deck/game**.
• **Komposisi Archetype:** Maksimal penggunaan 1 jenis archetype yang sama dalam satu tim adalah 5 kali. Memasuki pertandingan dengan archetype yang salah = **Loss 1 deck/game**.

Silakan persiapkan line-up terbaik kalian!

🔗 **Baca regulasi selengkapnya di:** https://teamwars.web.id/rules`;
}

function buildPrepareMessage(): string {
  const { teamA, teamB, wasit, roomId } = MATCH_DATA;
  return `📢 **[MATCH BRIEFING] TWI SEASON 7** 📢

Halo Kapten <@&${teamA.roleId}> (${teamA.nama}) dan <@&${teamB.roleId}> (${teamB.nama})! Waktu pertandingan tiba.
Wasit ${wasit.mention} akan segera mengambil alih kendali. Sebelum masuk room, mohon patuhi regulasi in-game mutlak berikut:

⏰ **WAKTU KONTROL & KOMUNIKASI:**
• Waktu kontrol total: **15 menit per match** untuk masing-masing tim. 
• Waktu berjalan saat persiapan/ganti deck, dan berhenti (di-pause) saat pemain bermain atau berada di dalam lobby.

📸 **KEWAJIBAN BUKTI & TEKNIS:**
• **SS Starting Hand:** Pemain wajib mengambil screenshot (SS) full screen (menampilkan hand/field sendiri, hand/field lawan, dan jumlah kartu lawan) lalu mengirimkannya ke channel tim tiap game berakhir.
• **Sanksi SS:** Gagal melampirkan SS = Peringatan Ringan. Akumulasi 2x Peringatan Ringan dalam satu match = **Loss 1 deck**.
• **DC & Glitch:** Disconnect = Kalah otomatis di game tersebut. Laporan Glitch wajib menyertakan bukti kuat maksimal 5 menit sejak kejadian.

🎮 **ROOM MATCH:**
• ID Room: **${roomId}**
*(Dilarang menyebarkan ID room. Hanya pemain yang bertanding yang boleh berada di room dan wajib keluar setelah duel usai).*

============================================
Silakan Kapten <@&${teamA.roleId}> dan <@&${teamB.roleId}> konfirmasi kesiapannya dan sebutkan **Starter** yang akan turun ke channel tim masing masing!

🔗 **Baca regulasi selengkapnya di:** https://teamwars.web.id/rules`;
}

// Helper Log Discord Admin
async function sendAdminLog(description: string) {
  try {
    await discordAPI(`/channels/${DISCORD_CONFIG.CH_LOG}/messages`, 'POST', {
      embeds: [
        {
          title: '🤖 Cron Job Match Notifier',
          description,
          color: 3447003,
          timestamp: new Date().toISOString(),
        },
      ],
    });
  } catch (err) {
    console.error('Gagal kirim log ke Discord Admin:', err);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Dapatkan Jam & Menit WIB saat ini
    const now = new Date();
    // UTC+7 (WIB)
    const wibOffset = 7 * 60 * 60 * 1000;
    const wibDate = new Date(now.getTime() + wibOffset);
    
    const hours = wibDate.getUTCHours();
    const minutes = wibDate.getUTCMinutes();

    const kvKey = `reminders:checkpoint:${MATCH_DATA.matchId}`;
    
    // Ambil list checkpoint yang sudah pernah terkirim (contoh: ["reminder_1", "reminder_2"])
    const sentCheckpoints: string[] = (await kv.smembers(kvKey)) || [];

    // --- LOGIKA 1: JAM 18.00 WIB (REMINDER 1) ---
    if (hours === 18 && !sentCheckpoints.includes('reminder_1')) {
      // Kirim ke Channel Tim A
      await discordAPI(`/channels/${MATCH_DATA.teamA.channelId}/messages`, 'POST', {
        content: buildReminderMessage(MATCH_DATA.teamA.nama, MATCH_DATA.teamA.roleId, MATCH_DATA.matchTimeWIB),
      });

      // Kirim ke Channel Tim B
      await discordAPI(`/channels/${MATCH_DATA.teamB.channelId}/messages`, 'POST', {
        content: buildReminderMessage(MATCH_DATA.teamB.nama, MATCH_DATA.teamB.roleId, MATCH_DATA.matchTimeWIB),
      });

      await kv.sadd(kvKey, 'reminder_1');
      await sendAdminLog(`✅ **Reminder 1 (18.00 WIB)** berhasil dikirim ke channel tim ${MATCH_DATA.teamA.nama} & ${MATCH_DATA.teamB.nama}`);

      return NextResponse.json({ success: true, step: 'reminder_1_sent' });
    }

    // --- LOGIKA 2: JAM 19.00 WIB (REMINDER 2) ---
    if (hours === 19 && minutes < 45 && !sentCheckpoints.includes('reminder_2')) {
      // Kirim ke Channel Tim A
      await discordAPI(`/channels/${MATCH_DATA.teamA.channelId}/messages`, 'POST', {
        content: buildReminderMessage(MATCH_DATA.teamA.nama, MATCH_DATA.teamA.roleId, MATCH_DATA.matchTimeWIB),
      });

      // Kirim ke Channel Tim B
      await discordAPI(`/channels/${MATCH_DATA.teamB.channelId}/messages`, 'POST', {
        content: buildReminderMessage(MATCH_DATA.teamB.nama, MATCH_DATA.teamB.roleId, MATCH_DATA.matchTimeWIB),
      });

      await kv.sadd(kvKey, 'reminder_2');
      await sendAdminLog(`✅ **Reminder 2 (19.00 WIB)** berhasil dikirim ke channel tim ${MATCH_DATA.teamA.nama} & ${MATCH_DATA.teamB.nama}`);

      return NextResponse.json({ success: true, step: 'reminder_2_sent' });
    }

    // --- LOGIKA 3: JAM 19.45 WIB (PREPARE / MATCH BRIEFING) ---
    if (hours === 19 && minutes >= 45 && !sentCheckpoints.includes('prepare')) {
      // Kirim ke Channel Match
      await discordAPI(`/channels/${MATCH_DATA.matchChannelId}/messages`, 'POST', {
        content: buildPrepareMessage(),
      });

      await kv.sadd(kvKey, 'prepare');
      await sendAdminLog(`🚀 **Prepare Match Briefing (19.45 WIB)** berhasil dikirim ke Channel Match (${MATCH_DATA.matchChannelId})!`);

      return NextResponse.json({ success: true, step: 'prepare_sent' });
    }

    return NextResponse.json({
      success: true,
      message: 'Cron berjalan, tidak ada jadwal pengiriman pada menit/jam ini.',
      currentWibTime: `${hours}:${minutes < 10 ? '0' : ''}${minutes}`,
      sentCheckpoints,
    });

  } catch (error: any) {
    console.error('Error Match Notifier Cron:', error);
    await sendAdminLog(`❌ **Error Match Notifier Cron:** \`${error.message}\``);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
  
