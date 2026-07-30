import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { discordAPI, hexToDecimal } from '@/lib/discord/utils';

// Target Deadline Edit Team
const EDIT_DEADLINE = new Date('2026-07-31T21:23:00+07:00').getTime();

// Helper pengereman (sleep) 200ms per tim agar 100% aman dari rate limit
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

// Helper Sensor Email (ab****@gmail.com)
function maskEmail(email: string) {
  if (!email || !email.includes('@')) return 'e****@gmail.com';
  const [name, domain] = email.split('@');
  if (name.length <= 2) return `${name}****@${domain}`;
  return `${name.slice(0, 2)}****@${domain}`;
}

// Helper Format Waktu Footer Terkini (Realtime saat Cron berjalan)
function getCurrentFormattedTime() {
  const dateObj = new Date();
  
  const dateStr = dateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta'
  }); // Hasil: "30 Jul 2026"

  const timeStr = dateObj.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta'
  }).replace('.', ':'); // Hasil: "23:57"

  return `Sistem Registrasi • Sent on ${dateStr} at ${timeStr} WIB`;
}

export async function GET(req: Request) {
  try {
    // 🛡️ Security Check Header Cron Vercel / External Cron
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allTeamKeys = await kv.keys('teams:*');
    if (allTeamKeys.length === 0) {
      return NextResponse.json({ message: 'Tidak ada tim di database' });
    }

    const remainingText = getRemainingTimeText(EDIT_DEADLINE);
    const isExpired = Date.now() >= EDIT_DEADLINE;
    const currentFooterText = getCurrentFormattedTime(); // Waktu realtime saat ini

    let updatedCount = 0;

    // Loop semua tim secara berurutan
    for (const key of allTeamKeys) {
      const teamData: any = await kv.hgetall(key);
      if (!teamData) continue;

      const channelId = teamData.discordChannelId;
      const roleId = teamData.discordRoleId;
      const savedMsgId = teamData.editReminderMsgId;
      const namaTim = teamData.namaTim || 'TEAM';
      const colorHex = teamData.warna || '#e91e63';
      const maskedEmail = maskEmail(teamData.email || '');

      // Skip jika tidak ada channelId ATAU belum punya Message ID
      if (!channelId || !savedMsgId) continue;

      // 🎯 Embed Payload
      const embedPayload = {
        title: '⌛ Pengingat Batas Akhir Edit Team!',
        color: hexToDecimal(colorHex),
        description: `Pendaftaran baru telah **ditutup**. Segera periksa dan kunci data roster tim **${namaTim}** sebelum waktu perbaikan berakhir!\n\n` +
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
          text: currentFooterText // Date & Time terkini
        }
      };

      // 🔘 Component Button
      const components = [
        {
          type: 1, // ACTION_ROW
          components: [
            {
              type: 2, // BUTTON
              style: 1, // PRIMARY (BLUE)
              label: isExpired ? '🔒 Edit Team Terkunci' : '✏️ Edit Team',
              custom_id: 'btn_edit_team',
              disabled: isExpired,
            }
          ]
        }
      ];

      const mentionContent = roleId ? `<@&${roleId}>` : `@${namaTim}`;

      // 🔄 MURNI EDIT PESAN YANG SUDAH ADA (PATCH ONLY)
      try {
        await discordAPI(`/channels/${channelId}/messages/${savedMsgId}`, 'PATCH', {
          content: mentionContent,
          embeds: [embedPayload],
          components
        });
        
        updatedCount++;
      } catch (e) {
        console.error(`Gagal edit reminder tim ${namaTim} (MsgID: ${savedMsgId}):`, e);
      }

      // ⏱️ Pengereman 200ms per channel agar AMAN dari Rate Limit Discord
      await sleep(200);
    }

    return NextResponse.json({
      success: true,
      message: `Timer 16 tim berhasil di-update secara realtime!`,
      totalTimDiproses: updatedCount,
      sisaWaktu: remainingText,
      lastUpdated: currentFooterText
    });

  } catch (error) {
    console.error('Error running update-timer cron:', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
    }
    
