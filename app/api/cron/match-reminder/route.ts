import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI, hexToDecimal } from '@/lib/discord/utils';

// Konfigurasi Target Channel & Role ID
const CHANNELS_CONFIG = [
  {
    channelId: '1532352873113849938', // CH_STAR
    roleId: '1532352873113849938',
    kvKey: 'msg_reminder:ch_star',
    type: 'reminder',
  },
  {
    channelId: '1524245016552144978', // CH_CHAM
    roleId: '1524245016552144978',
    kvKey: 'msg_reminder:ch_cham',
    type: 'reminder',
  },
  {
    channelId: '1532353687450685522', // CH_EXHI / Match Channel
    roleId: null,
    kvKey: 'msg_reminder:ch_match',
    type: 'match_info',
  },
];

const REFEREE_ID = '675203924072071191';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const forceRun = searchParams.get('force') === 'true'; 
    const forceType = searchParams.get('type'); 

    // 🕒 Cek Waktu WIB Saat Ini
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Jakarta', weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: false };
    const formatter = new Intl.DateTimeFormat('id-ID', options);
    const parts = formatter.formatToParts(now);
    
    let day = '';
    let hour = 0;

    parts.forEach(p => {
      if (p.type === 'weekday') day = p.value; 
      if (p.type === 'hour') hour = parseInt(p.value, 10);
    });

    // 🔍 Tentukan Jenis Eksekusi Berdasarkan Jam & Hari
    let isScheduledTime = false;
    let isClosingTime = false;

    if (forceRun) {
      isScheduledTime = true;
      if (forceType === 'close') isClosingTime = true;
    } else {
      // Pengecekan Jadwal Otomatis (Cron Job Tiap 1 Jam):
      // 1. Sabtu jam 16 (4 Sore)
      if (day === 'Sabtu' && hour === 16) isScheduledTime = true;

      // 2. Minggu jam 16 (4 Sore)
      if (day === 'Minggu' && hour === 16) isScheduledTime = true;

      // 3. Senin jam 16 (4 Sore) & jam 18 (6 Sore) -> Reminder Biasa
      if (day === 'Senin' && (hour === 16 || hour === 18)) isScheduledTime = true;

      // 4. Senin jam 19 (7 Malam) -> Reminder Close
      if (day === 'Senin' && hour === 19) {
        isScheduledTime = true;
        isClosingTime = true;
      }
    }

    if (!isScheduledTime) {
      return NextResponse.json({
        skipped: true,
        message: `Bukan jadwal kirim reminder (${day}, Jam ${hour}:00 WIB). Di-skip otomatis.`,
        tip: 'Gunakan ?force=true pada URL jika ingin memaksa jalan sekarang.'
      });
    }

    const results = [];

    for (const target of CHANNELS_CONFIG) {
      // =========================================================================
      // A. JIKA TARGET ADALAH CHANNEL MATCH INFO (1532353687450685522)
      // =========================================================================
      if (target.type === 'match_info') {
        // Cek apakah info match sudah pernah dikirim sebelumnya
        const existingMatchMsgId = await kv.get<string>(target.kvKey);

        if (existingMatchMsgId && !forceRun) {
          results.push({ 
            channel: target.channelId, 
            status: 'Skipped', 
            reason: 'Pesan match info sudah pernah dikirim sebelumnya (Hanya dikirim 1x).',
            msgId: existingMatchMsgId 
          });
          continue; // Lewati, jangan kirim lagi
        }

        // Jika forceRun dan sudah ada pesan lama, hapus pesan lamanya terlebih dahulu
        if (existingMatchMsgId && forceRun) {
          await discordAPI(`/channels/${target.channelId}/messages/${existingMatchMsgId}`, 'DELETE').catch(() => null);
          await kv.del(target.kvKey);
        }

        const matchPayload = {
          embeds: [
            {
              title: '⚔️ TWI Season 7 - Exhibition Match',
              color: hexToDecimal('#FFD700'), // Emas / Gold
              description: 
                `📅 **Hari / Tanggal:** Senin, 3 Agustus 2026\n` +
                `⏰ **Waktu Kick-Off:** 20:00 WIB\n\n` +
                `⚔️ **TIM BERTANDING:**\n` +
                `• <@&1532352873113849938> **VS** <@&1524245016552144978>`,
              fields: [
                {
                  name: '🎮 DETAIL ROOM & STREAMING',
                  value: 
                    '• **Room ID:** Menyusul\n' +
                    '• **Streaming:** Streamer (Link Menyusul)',
                  inline: false,
                },
                {
                  name: '⏱️ TIMELINE & REFEREE',
                  value: 
                    '• **19:00 WIB:** Batas Akhir Pengumpulan 10 Deck\n' +
                    '• **19:30 WIB:** Pengecekan Deck dan Persiapan oleh Referee\n' +
                    '• **20:00 WIB:** Match Kick-Off\n\n' +
                    `• **Referee Bertugas:** <@${REFEREE_ID}>`,
                  inline: false,
                }
              ],
              footer: {
                text: 'Team Wars Indonesia Season 7',
              },
              timestamp: new Date().toISOString(),
            }
          ],
          allowed_mentions: {
            roles: ['1532352873113849938', '1524245016552144978'],
            users: [REFEREE_ID],
          }
        };

        const resMatch = await discordAPI(`/channels/${target.channelId}/messages`, 'POST', matchPayload);

        if (resMatch?.id) {
          // PIN Pesan di Discord
          await discordAPI(`/channels/${target.channelId}/pins/${resMatch.id}`, 'PUT', {}).catch(() => null);
          // Simpan ID Pesan Permanen di Redis KV
          await kv.set(target.kvKey, resMatch.id);
          results.push({ channel: target.channelId, status: 'Success', msgId: resMatch.id, pinned: true, type: 'match_info' });
        }
        continue;
      }

      // =========================================================================
      // B. JIKA TARGET ADALAH CHANNEL REMINDER TIM (CH_STAR & CH_CHAM)
      // =========================================================================
      
      // Hapus pesan reminder lama dari Discord & KV Redis
      const oldMsgId = await kv.get<string>(target.kvKey);
      if (oldMsgId) {
        await discordAPI(`/channels/${target.channelId}/messages/${oldMsgId}`, 'DELETE').catch(() => null);
        await kv.del(target.kvKey);
      }

      let payload: any = {};

      if (isClosingTime) {
        // 🚨 EMBED CLOSING (Senin 19:00 WIB)
        payload = {
          content: `<@&${target.roleId}>`,
          embeds: [
            {
              title: '🚨 BATAS WAKTU MEDECK DITUTUP — TWI SEASON 7',
              color: hexToDecimal('#FF0000'), 
              description: 
                `Batas waktu pengumpulan deck untuk match **Senin, 3 Agustus 2026** telah **RESMI DITUTUP** per pukul **19:00 WIB**.\n\n` +
                `Sesuai regulasi, pengumpulan deck setelah waktu ini atau slot yang belum terisi dikenakan sanksi tegas!`,
              fields: [
                {
                  name: '⚠️ SANKSI KETERLAMBATAN & AUTO-LOSS',
                  value: 
                    '• **Deck Terlambat (> 19:00 WIB):** Pemotongan waktu kontrol **2 menit per deck** yang terlambat.\n' +
                    '• **Slot Kosong (s/d 20:00 WIB):** Slot otomatis dinyatakan **AUTO-LOSS** pada kick-off.',
                  inline: false,
                },
                {
                  name: '❓ BANTUAN WASIT',
                  value: `Jika terdapat kendala teknis mendesak, segera hubungi Wasit: <@${REFEREE_ID}>`,
                  inline: false,
                }
              ],
              footer: {
                text: 'Team Wars Indonesia • Closed at 19:00 WIB',
              },
              timestamp: new Date().toISOString(),
            }
          ],
          allowed_mentions: {
            roles: target.roleId ? [target.roleId] : [],
            users: [REFEREE_ID],
          }
        };
      } else {
        // ⏳ EMBED REMINDER BIASA
        payload = {
          content: `<@&${target.roleId}>`,
          embeds: [
            {
              title: '📢 PERSIAPAN MATCH & REGULASI PENGUMPULAN DECK',
              color: hexToDecimal('#00FFFF'), 
              description: 
                `Halo <@&${target.roleId}>, pertandingan kalian di **TWI Season 7** dijadwalkan pada:\n\n` +
                `📅 **Hari / Tanggal:** Senin, 3 Agustus 2026\n` +
                `⏰ **Waktu Match:** 20:00 WIB (Kick-Off)\n\n` +
                `Mohon segera mempersiapkan lineup & medeck dengan memperhatikan aturan di bawah ini:`,
              fields: [
                {
                  name: '⚠️ ATURAN PENGUMPULAN DECK',
                  value: 
                    '• **10 Deck/Tim:** Wajib dikirim di channel ini paling lambat **Senin, 3 Agustus 2026 — Pukul 19:00 WIB**.\n' +
                    '• **2 Deck/Pemain:** Setiap pemain (total 5 orang) wajib membawa 2 deck dengan archetype utama yang berbeda.\n' +
                    '• **Limit Archetype (Max 5x):** Batas penggunaan 1 jenis archetype yang sama adalah maksimal 5x dalam 1 tim.\n' +
                    '  *(Contoh: Gabungan Stardust-Centurion dihitung akumulatif max 5x untuk total seluruh tim)*.\n' +
                    '• **Definisi Archetype:** Kelompok min. 3 kartu dengan kesamaan nama (contoh: *Branded In Red* & *Branded Fusion* = Archetype *Branded*). Jika kurang dari 3 kartu, diklasifikasikan sebagai **"Deck Khusus"** (misal: Dino, Stun).',
                  inline: false,
                },
                {
                  name: '❌ SANKSIS',
                  value: 
                    '• **Keterlambatan (> 19:00 WIB):** Pemotongan waktu kontrol **2 menit per deck** yang terlambat.\n' +
                    '• **Slot Kosong (s/d 20:00 WIB):** Slot otomatis dinyatakan **AUTO-LOSS**.',
                  inline: false,
                },
                {
                  name: '❓ BANTUAN & BACA RULES',
                  value: `Ada pertanyaan seputar deck/regulasi? Hubungi Wasit: <@${REFEREE_ID}>\n🔗 **Rules Selengkapnya:** https://teamwars.web.id/rules`,
                  inline: false,
                }
              ],
              footer: {
                text: 'Team Wars Indonesia • Reminder Auto-System',
              },
              timestamp: new Date().toISOString(),
            }
          ],
          allowed_mentions: {
            roles: target.roleId ? [target.roleId] : [],
            users: [REFEREE_ID],
          }
        };
      }

      // Kirim Embed Reminder Baru
      const res = await discordAPI(`/channels/${target.channelId}/messages`, 'POST', payload);

      if (res?.id) {
        // PIN Pesan di Discord
        await discordAPI(`/channels/${target.channelId}/pins/${res.id}`, 'PUT', {}).catch(() => null);
        // Simpan ID Pesan Baru ke KV Redis
        await kv.set(target.kvKey, res.id);
        results.push({ channel: target.channelId, status: 'Success', msgId: res.id, pinned: true, type: target.type });
      }
    }

    return NextResponse.json({
      success: true,
      executedAt: `${day}, Jam ${hour}:00 WIB`,
      results
    });

  } catch (error) {
    console.error('Error Cron Match Reminder:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
