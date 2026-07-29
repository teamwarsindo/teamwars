export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/config';
import { discordAPI } from '@/lib/discord/utils';

// Data Match
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
    mention: '<@377669305283641345>',
  },
  roomId: '568646',
};

// 1. Generator Embed REMINDER
function buildReminderEmbed(teamName: string, roleId: string, matchTime: string, wasitMention: string) {
  return {
    content: `<@&${roleId}>`, // Mention ditaruh di luar embed agar role tetap ter-ping Notification
    embeds: [
      {
        title: '⏳ REMINDER MATCH — TWI SEASON 7',
        description: `Halo **${teamName}**, pertandingan kalian akan dimulai malam ini!`,
        color: 15844367, // Warna Gold / Warning
        fields: [
          {
            name: '⏰ Jadwal Krusial',
            value: `• **Kick-off:** \`${matchTime}\`\n• **Batas Pengumpulan Deck:** 60 Menit sebelum Kick-off`,
            inline: false,
          },
          {
            name: '⚠️ Aturan Deck (10 Deck)',
            value: `• Kirim SS terbaru & jelas di channel ini.\n• **Telat:** Potong waktu kontrol 2 menit/deck.\n• **Slot Kosong saat Kick-off:** Auto-Loss.`,
            inline: false,
          },
          {
            name: '🚨 Sanksi Fatal',
            value: `• **Salah ID/IGN & Ubah Deck:** \`Loss 2 Deck/Game\`\n• **Archetype > 5x / Salah Archetype:** \`Loss 1 Deck/Game\``,
            inline: false,
          },
          {
            name: '❓ Butuh Bantuan & Regulasi',
            value: `Tanya Wasit: ${wasitMention}\n[Baca Rules Lengkap](https://teamwars.web.id/rules)`,
            inline: false,
          },
        ],
        footer: { text: 'Team Wars Indonesia • Season 7' },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

// 2. Generator Embed PREPARE
function buildPrepareEmbed() {
  const { teamA, teamB, wasit, roomId } = MATCH_DATA;
  return {
    content: `📢 **Kapten <@&${teamA.roleId}> (${teamA.nama}) & <@&${teamB.roleId}> (${teamB.nama})!**`,
    embeds: [
      {
        title: '⚔️ MATCH BRIEFING & ROOM MATCH',
        description: `Match dipimpin oleh Wasit ${wasit.mention}. Waktu tanding telah tiba!`,
        color: 3066993, // Warna Hijau / Ready
        fields: [
          {
            name: '🎮 Room Match',
            value: `**ID Room:** \`${roomId}\`\n*(Privat! Hanya pemain tanding yang boleh masuk)*`,
            inline: false,
          },
          {
            name: '⏱️ Waktu Kontrol',
            value: `\`15 Menit / Match\` (Jalan saat ganti deck, pause saat di dalam game/lobby).`,
            inline: true,
          },
          {
            name: '📸 SS Starting Hand',
            value: `Wajib SS tiap game. Akumulasi 2x Peringatan SS = \`Loss 1 Deck\`.`,
            inline: true,
          },
          {
            name: '⚠️ DC & Glitch',
            value: `Disconnect = Kalah Otomatis game tersebut.`,
            inline: false,
          },
          {
            name: '📢 INSTRUKSI KAPTEN',
            value: `> Silakan konfirmasi kesiapan dan sebutkan **STARTER** yang turun di channel tim masing-masing!`,
            inline: false,
          },
        ],
        footer: { text: 'Team Wars Indonesia • Season 7' },
        timestamp: new Date().toISOString(),
      },
    ],
  };
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
    const wibOffset = 7 * 60 * 60 * 1000;
    const wibDate = new Date(now.getTime() + wibOffset);
    
    const hours = wibDate.getUTCHours();
    const minutes = wibDate.getUTCMinutes();

    const kvKey = `reminders:checkpoint:${MATCH_DATA.matchId}`;
    
    // Ambil list checkpoint yang sudah pernah terkirim
    const sentCheckpoints: string[] = (await kv.smembers(kvKey)) || [];

    // --- LOGIKA 1: JAM 18.00 WIB (REMINDER 1) ---
    if (hours === 18 && !sentCheckpoints.includes('reminder_1')) {
      await discordAPI(`/channels/${MATCH_DATA.teamA.channelId}/messages`, 'POST', {
        content: buildReminderMessage(MATCH_DATA.teamA.nama, MATCH_DATA.teamA.roleId, MATCH_DATA.matchTimeWIB),
      });

      await discordAPI(`/channels/${MATCH_DATA.teamB.channelId}/messages`, 'POST', {
        content: buildReminderMessage(MATCH_DATA.teamB.nama, MATCH_DATA.teamB.roleId, MATCH_DATA.matchTimeWIB),
      });

      await kv.sadd(kvKey, 'reminder_1');
      await sendAdminLog(`✅ **Reminder 1 (18.00 WIB)** berhasil dikirim ke channel tim ${MATCH_DATA.teamA.nama} & ${MATCH_DATA.teamB.nama}`);

      return NextResponse.json({ success: true, step: 'reminder_1_sent' });
    }

    // --- LOGIKA 2: JAM 19.00 WIB (REMINDER 2) ---
    if (hours === 19 && minutes < 45 && !sentCheckpoints.includes('reminder_2')) {
      await discordAPI(`/channels/${MATCH_DATA.teamA.channelId}/messages`, 'POST', {
        content: buildReminderMessage(MATCH_DATA.teamA.nama, MATCH_DATA.teamA.roleId, MATCH_DATA.matchTimeWIB),
      });

      await discordAPI(`/channels/${MATCH_DATA.teamB.channelId}/messages`, 'POST', {
        content: buildReminderMessage(MATCH_DATA.teamB.nama, MATCH_DATA.teamB.roleId, MATCH_DATA.matchTimeWIB),
      });

      await kv.sadd(kvKey, 'reminder_2');
      await sendAdminLog(`✅ **Reminder 2 (19.00 WIB)** berhasil dikirim ke channel tim ${MATCH_DATA.teamA.nama} & ${MATCH_DATA.teamB.nama}`);

      return NextResponse.json({ success: true, step: 'reminder_2_sent' });
    }

    // --- LOGIKA 3: JAM 19.45 WIB (PREPARE / MATCH BRIEFING) ---
    if (hours === 19 && minutes >= 45 && !sentCheckpoints.includes('prepare')) {
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
