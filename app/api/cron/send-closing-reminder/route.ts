export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { Resend } from 'resend';
import { EMAIL_CONFIG, CLOSE_TARGET_DATE, DISCORD_CONFIG } from '@/lib/config';
import { getClosingReminderTemplate } from '@/lib/email-templates';
import { createClosingReminderEmbed } from '@/lib/discord/messages/closingReminderEmbed';
import { discordAPI } from '@/lib/discord/utils';

const resend = new Resend(process.env.RESEND_API_KEY);

// Helper format tanggal & jam: "29 Jul 2026 at 14:30 WIB"
function getFormattedDateTime(): string {
  const d = new Date();

  const dateStr = d.toLocaleDateString('en-GB', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const timeStr = d.toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return `${dateStr} at ${timeStr} WIB`;
}

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

// Helper kirim log ke Channel CH_LOG Admin
async function sendDiscordLog(title: string, description: string, color = 3447003) {
  try {
    const formattedDateTime = getFormattedDateTime();

    await discordAPI(`/channels/${DISCORD_CONFIG.CH_LOG}/messages`, 'POST', {
      embeds: [
        {
          title,
          description,
          color,
          timestamp: new Date().toISOString(),
          footer: {
            text: `Sistem Registrasi • Sent on ${formattedDateTime}`,
          },
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
    const formattedDateTime = getFormattedDateTime();

    // 1. Ambil daftar SLUG dari SET 'global:teams'
    const allTeamSlugs: string[] = (await kv.smembers('global:teams')) || [];

    if (!allTeamSlugs || allTeamSlugs.length === 0) {
      return NextResponse.json({ message: 'Tidak ada data tim di global:teams Redis.' });
    }

    // 2. Ambil daftar SLUG yang SUDAH dikirim dari SET 'reminders:sent'
    const sentSlugs: string[] = (await kv.smembers('reminders:sent')) || [];

    let targetSlug: string | null = null;
    let targetTeamData: any = null;

    // 3. Cari 1 slug tim yang BELUM ada di 'reminders:sent'
    for (const slug of allTeamSlugs) {
      if (sentSlugs.includes(slug)) {
        continue;
      }

      const teamData: any = await kv.hgetall(`teams:${slug}`);

      if (teamData && teamData.email) {
        targetSlug = slug;
        targetTeamData = teamData;
        break;
      } else {
        await kv.sadd('reminders:sent', slug);
      }
    }

    if (!targetSlug || !targetTeamData) {
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

    // A. Kirim Email via Resend
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

    // B. Kirim Embed Discord Ke Channel Tim & OTOMATIS PIN
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

      // 💡 FOOTER DISCORD SESUAI REQUEST
      if (discordPayload.embeds && discordPayload.embeds.length > 0) {
        discordPayload.embeds[0].footer = {
          text: `Sistem Registrasi • Sent on ${formattedDateTime}`,
        };
      }

      try {
        // 1. Kirim Pesan Embed
        const sentMessage: any = await discordAPI(
          `/channels/${channelId}/messages`,
          'POST',
          discordPayload
        );

        // 2. PIN PESAN di channel tim
        if (sentMessage && sentMessage.id) {
          await discordAPI(
            `/channels/${channelId}/pins/${sentMessage.id}`,
            'PUT'
          );
        }
      } catch (err) {
        console.error(`Gagal kirim / pin reminder Discord ke tim ${teamName}:`, err);
      }
    }

    // C. Tulis SLUG yang berhasil dikirim ke SET 'reminders:sent'
    await kv.sadd('reminders:sent', targetSlug);

    // D. Kirim Log Ke Channel Admin Discord
    await sendDiscordLog(
      `📢 Reminder Terkirim: Tim ${teamName}`,
      `• **Slug:** \`${targetSlug}\`\n• **Email Registered:** \`${targetTeamData.email}\`\n• **Channel DC:** <#${channelId || 'N/A'}>\n• **Sisa Waktu:** ${sisaWaktuText}\n• **Status:** ✅ Terkirim via Resend, Logged & Auto-Pinned`,
      3066993
    );

    return NextResponse.json({
      success: true,
      sentToTeam: teamName,
      slug: targetSlug,
      email: targetTeamData.email,
      discordChannelId: channelId || 'Tidak ada Channel ID',
      sisaWaktu: sisaWaktuText,
      message: `Berhasil mengirim email & notifikasi Discord (Auto-Pinned) ke ${teamName}!`,
    });

  } catch (error: any) {
    console.error('Error Cron Job Reminder:', error);

    await sendDiscordLog(
      `❌ Error Cron Job Reminder`,
      `**Pesan Error:** \`${error.message || 'Unknown Error'}\``,
      15158332
    );

    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
