import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI, hexToDecimal } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';

// Target Deadline Edit Team (Jumat, 31 Juli 2026, 21:23 WIB)
const EDIT_DEADLINE = new Date('2026-07-31T21:23:00+07:00').getTime();

// Helper pengereman (sleep) ms per request agar aman dari rate limit
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper Hitung Sisa Waktu Format (X Jam Y Menit)
function getRemainingTimeText(deadlineTime: number) {
  const now = Date.now();
  const diffMs = deadlineTime - now;

  if (diffMs <= 0) return '⏳ Waktu Telah Habis';

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours} Jam ${minutes} Menit`;
  }
  return `${minutes} Menit`;
}

// Helper Sensor Email
function maskEmail(email: string) {
  if (!email || !email.includes('@')) return 'e****@gmail.com';
  const [name, domain] = email.split('@');
  if (name.length <= 2) return `${name}****@${domain}`;
  return `${name.slice(0, 2)}****@${domain}`;
}

// Helper Format Waktu Footer Terkini
function getCurrentFormattedTime() {
  const dateObj = new Date();

  const dateStr = dateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });

  const timeStr = dateObj
    .toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jakarta',
    })
    .replace('.', ':');

  return `Sistem Registrasi • Sent on ${dateStr} at ${timeStr} WIB`;
}

export async function GET(req: Request) {
  try {
    // 🛡️ Security Check Header Cron Vercel / External Cron
    const authHeader = req.headers.get('authorization');
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allTeamKeys = await kv.keys('teams:*');
    if (allTeamKeys.length === 0) {
      return NextResponse.json({ message: 'Tidak ada tim di database' });
    }

    const now = Date.now();
    const remainingMs = EDIT_DEADLINE - now;
    const remainingText = getRemainingTimeText(EDIT_DEADLINE);
    const isExpired = remainingMs <= 0;

    // ⏱️ PEMICU RESEND: Sisa Waktu <= 30 Menit (dan belum expired)
    const is30MinTrigger = remainingMs <= 30 * 60 * 1000 && remainingMs > 0;
    const currentFooterText = getCurrentFormattedTime();

    let updatedCount = 0;
    const collectedRoles: string[] = [];

    // Loop semua tim secara berurutan
    for (const key of allTeamKeys) {
      const teamData: any = await kv.hgetall(key);
      if (!teamData) continue;

      const channelId = teamData.discordChannelId;
      const roleId = teamData.discordRoleId;
      let savedMsgId = teamData.editReminderMsgId;
      const namaTim = teamData.namaTim || 'TEAM';
      const colorHex = teamData.warna || '#e91e63';
      const maskedEmail = maskEmail(teamData.email || '');

      // Kumpulkan Role ID untuk dimasukkan ke dalam embed news
      if (roleId) {
        collectedRoles.push(`<@&${roleId}>`);
      }

      if (!channelId) continue;

      // Cek apakah resend 30 menit sudah pernah dijalankan (Cast ke boolean aman)
      const hasSent30m = teamData.reminder30mSent === true || teamData.reminder30mSent === 'true';

      // 🎯 Embed Payload untuk Channel Tim
      const embedPayload = {
        title: isExpired
          ? '🔒 Akses Edit Team Telah Ditutup!'
          : '⌛ Pengingat Batas Akhir Edit Team!',
        color: hexToDecimal(isExpired ? '#f44336' : colorHex),
        description: isExpired
          ? `Sesi perbaikan dan pembaruan data roster untuk tim **${namaTim}** resmi **ditutup**.\n\n` +
            `Seluruh data roster telah dikunci untuk penataan jadwal pertandingan.`
          : `Pendaftaran baru telah **ditutup**. Segera periksa dan kunci data roster tim **${namaTim}** sebelum waktu perbaikan berakhir!\n\n` +
            `⏰ **Sisa Waktu Edit Data**\n\`\`\`\n${remainingText}\n\`\`\`\n\n` +
            `🔍 **Poin Penting Perbaikan Roster**\n` +
            `• Pastikan tidak ada typo pada **IGN In-Game & Duel ID**.\n` +
            `• Pastikan seluruh anggota tim sudah **Terverifikasi Discord**.\n` +
            `• Atur susunan pemain utama dan cadangan (Maks. 10 Pemain).\n\n` +
            `📝 **Cara Memperbarui Data Tim**\n` +
            `Klik tombol **Edit Team** di bawah ini atau buka tautan verifikasi yang dikirim ke email registered:\n` +
            `📧 \`${maskedEmail}\`\n\n` +
            `_Catatan: Setelah waktu habis, data roster akan terkunci secara otomatis dan tidak bisa diubah._`,
        footer: {
          text: currentFooterText,
        },
      };

      // 🔘 Component Button
      const components = [
        {
          type: 1, // ACTION_ROW
          components: [
            {
              type: 2, // BUTTON
              style: isExpired ? 2 : 1, // SECONDARY (GRAY) / PRIMARY (BLUE)
              label: isExpired ? '🔒 Edit Team Terkunci' : '✏️ Edit Team',
              custom_id: 'btn_edit_team',
              disabled: isExpired,
            },
          ],
        },
      ];

      const mentionContent = roleId ? `<@&${roleId}>` : `@${namaTim}`;

      try {
        // 🔄 LOGIKA 1: Sisa <= 30 Menit & BELUM pernah kirim ulang -> Send Message Baru (1x saja per tim)
        if (is30MinTrigger && !hasSent30m && !isExpired) {
          // Hapus pesan lama jika ada
          if (savedMsgId) {
            try {
              await discordAPI(
                `/channels/${channelId}/messages/${savedMsgId}`,
                'DELETE'
              );
            } catch (err) {
              console.log(`Log: Pesan lama tidak ada/gagal hapus (${namaTim})`);
            }
          }

          // Kirim pesan baru di posisi paling bawah
          const newMsg: any = await discordAPI(
            `/channels/${channelId}/messages`,
            'POST',
            {
              content: mentionContent,
              embeds: [embedPayload],
              components,
            }
          );

          // Simpan MsgID baru & pasang penanda reminder30mSent ke KV
          if (newMsg && newMsg.id) {
            await kv.hset(key, { 
              editReminderMsgId: newMsg.id,
              reminder30mSent: true 
            });
          }
        }
        // 🔄 LOGIKA 2: Update Rutin Biasa / Status Ditutup -> Pakai PATCH pada pesan yang ada
        else if (savedMsgId) {
          await discordAPI(
            `/channels/${channelId}/messages/${savedMsgId}`,
            'PATCH',
            {
              content: mentionContent,
              embeds: [embedPayload],
              components,
            }
          );
        }

        updatedCount++;
      } catch (e) {
        console.error(
          `Gagal memproses timer tim ${namaTim} (MsgID: ${savedMsgId}):`,
          e
        );
      }

      await sleep(200);
    }

    // 📢 LOGIKA 3: Kirim Pengumuman ke Channel News Saat Waktu Habis (1x Saja)
    if (isExpired && DISCORD_CONFIG?.CH_NEWS) {
      const hasAnnounced = await kv.get('team_edit_closed_announced');

      if (!hasAnnounced) {
        const rolesText =
          collectedRoles.length > 0 ? collectedRoles.join(' ') : 'Semua Tim';

        const newsEmbed = {
          title: '🎉 Selamat Bergabung di Turnamen!',
          color: hexToDecimal('#2ecc71'),
          description:
            `Batas waktu perbaikan data roster tim resmi **DITUTUP**! 🔒\n\n` +
            `Selamat bertanding dan selamat bergabung kepada seluruh tim terdaftar:\n` +
            `${rolesText}\n\n` +
            `📌 **Informasi Selanjutnya:**\n` +
            `• 📋 **Technical Meeting:** Minggu, 2 Agustus 2026 pukul 20:00 WIB\n` +
            `• ⚔️ **Match Exhibition:** Senin, 3 Agustus 2026 (Jam pelaksanaan menyusul)\n` +
            `• 📊 **Info Jadwal & Bagan:** Menyusul\n\n` +
            `_Catatan: Seluruh data roster tim telah **dikunci** dan tidak dapat diubah kembali._\n\n` +
            `Good luck and have fun! 🔥`,
          footer: {
            text: currentFooterText,
          },
        };

        try {
          await discordAPI(
            `/channels/${DISCORD_CONFIG.CH_NEWS}/messages`,
            'POST',
            {
              content: '@everyone',
              embeds: [newsEmbed],
            }
          );

          await kv.set('team_edit_closed_announced', true);
        } catch (newsErr) {
          console.error('Gagal mengirim pengumuman ke channel news:', newsErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: isExpired
        ? 'Waktu habis, data tim terkunci dan pengumuman news terkirim.'
        : 'Timer berhasil diperbarui!',
      totalTimDiproses: updatedCount,
      sisaWaktu: remainingText,
      lastUpdated: currentFooterText,
    });
  } catch (error) {
    console.error('Error running update-timer cron:', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
            }
