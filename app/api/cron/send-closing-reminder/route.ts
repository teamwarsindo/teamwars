import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { Resend } from 'resend';
import { EMAIL_CONFIG, CLOSE_TARGET_DATE, DISCORD_CONFIG } from '@/lib/config';
import { getClosingReminderTemplate } from '@/lib/email-templates';
import { createClosingReminderEmbed } from '@/lib/discord/messages/closingReminderEmbed';
import { discordAPI } from '@/lib/discord/utils';

const resend = new Resend(process.env.RESEND_API_KEY);

function getRemainingTimeText(): string {
  const now = new Date();
  const targetClosing = new Date(CLOSE_TARGET_DATE);
  const diffMs = targetClosing.getTime() - now.getTime();

  if (diffMs <= 0) return 'PENDAFTARAN TELAH DITUTUP!';

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  let text = '';
  if (days > 0) text += `${days} Hari `;
  if (hours > 0) text += `${hours} Jam `;
  text += `${minutes} Menit`;

  return text;
}

// Helper untuk kirim log aktivitas ke Channel CCTV / Log Discord
async function sendDiscordLog(title: string, description: string, color = 3447003) {
  try {
    await discordAPI(`/channels/${DISCORD_CONFIG.CH_LOG}/messages`, 'POST', {
      embeds: [
        {
          title,
          description,
          color,
          timestamp: new Date().toISOString(),
          footer: { text: 'System Cron Reminder • TWI S7' },
        },
      ],
    });
  } catch (err) {
    console.error('Gagal kirim log ke Discord CH_LOG:', err);
  }
}

export async function GET(request: NextRequest) {
  try {
    const sisaWaktuText = getRemainingTimeText();
    const teamKeys = await kv.keys('teams:*');

    if (!teamKeys || teamKeys.length === 0) {
      return NextResponse.json({ message: 'Tidak ada data tim di Redis.' });
    }

    let targetTeamKey: string | null = null;
    let targetTeamData: any = null;

    // Cari 1 tim pertama yang BELUM dikirim reminder (reminderSent != 'true')
    for (const key of teamKeys) {
      const teamData: any = await kv.hgetall(key);
      if (teamData && teamData.email && teamData.reminderSent !== 'true') {
        targetTeamKey = key;
        targetTeamData = teamData;
        break;
      }
    }

    // Jika seluruh tim sudah terkirim
    if (!targetTeamKey || !targetTeamData) {
      return NextResponse.json({
        success: true,
        completed: true,
        message: 'Seluruh tim terdaftar sudah berhasil menerima email & pemberitahuan Discord!',
      });
    }

    let parsedPlayers = [];
    try {
      parsedPlayers = typeof targetTeamData.players === 'string'
        ? JSON.parse(targetTeamData.players)
        : targetTeamData.players || [];
    } catch (e) {
      parsedPlayers = [];
    }

    const ketuaTim = parsedPlayers.find((p: any) => p.role === 'Ketua') ||
      targetTeamData.ketua || { namaLengkap: 'Kapten' };
    const teamName = targetTeamData.namaTim || 'Tim';

    // 1. Kirim Email via Resend
    const emailHtml = getClosingReminderTemplate({
      namaTim: teamName,
      namaKetua: ketuaTim.namaLengkap,
      warna: targetTeamData.warna || '#4CAF50',
      editToken: targetTeamData.editToken || '',
      sisaWaktuText,
    });

    await resend.emails.send({
      from: EMAIL_CONFIG.sender,
      to: targetTeamData.email,
      subject: `⚠️ Pendaftaran Akan Ditutup: Cek Data Tim ${teamName} [Team Wars S7]`,
      html: emailHtml,
    });

    // 2. Kirim Embed Discord ke Channel Tim
    const channelId = targetTeamData.discordChannelId;
    const roleId = targetTeamData.discordRoleId || targetTeamData.roleId;

    if (channelId && roleId) {
      const discordPayload = createClosingReminderEmbed({
        roleMentionId: roleId,
        namaTim: teamName,
        email: targetTeamData.email,
        sisaWaktuText,
        hexWarna: targetTeamData.warna || '#4CAF50',
      });

      await discordAPI(
        `/channels/${channelId}/messages`,
        'POST',
        discordPayload
      ).catch((err) => console.error(`Gagal kirim reminder Discord ke tim ${teamName}:`, err));
    }

    // 3. Tandai status di Redis
    await kv.hset(targetTeamKey, { reminderSent: 'true' });

    // 4. Send CCTV / System Log ke Channel Log Discord Admin
    await sendDiscordLog(
      `📢 Reminder Terkirim: Tim ${teamName}`,
      `• **Email Registered:** \`${targetTeamData.email}\`\n• **Channel DC:** <#${channelId || 'N/A'}>\n• **Sisa Waktu:** ${sisaWaktuText}\n• **Status:** ✅ Terkirim via Resend & Discord`,
      3066993 // Warna Hijau Success
    );

    return NextResponse.json({
      success: true,
      sentToTeam: teamName,
      email: targetTeamData.email,
      discordChannelId: channelId || 'Tidak ada Channel ID',
      sisaWaktu: sisaWaktuText,
      message: `Berhasil mengirim email & notifikasi Discord ke ${teamName}!`,
    });

  } catch (error: any) {
    console.error('Error Cron Job Reminder:', error);

    // Kirim Error Log ke Channel Log Discord
    await sendDiscordLog(
      `❌ Error Cron Job Reminder`,
      `**Pesan Error:** \`${error.message || 'Unknown Error'}\``,
      15158332 // Warna Merah Error
    );

    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
  
