import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { Resend } from 'resend';
import { EMAIL_CONFIG, CLOSE_TARGET_DATE, DISCORD_CONFIG } from '@/lib/config';
import { getClosingReminderTemplate } from '@/lib/email-templates';
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

function maskEmail(email: string) {
  if (!email) return '••••@••••.com';
  const [name, domain] = email.split('@');
  if (!domain) return '••••@••••.com';
  const maskedName = name.length > 2 ? name.slice(0, 2) + '••••' : name[0] + '••••';
  return `${maskedName}@${domain}`;
}

function getFormattedFooterTime() {
  const d = new Date();
  const dateStr = d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });
  const timeStr = d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).replace('.', ':');

  return `${dateStr} at ${timeStr} WIB`;
}

// Payload Discord Embed dengan Custom Interactive Button
function createDiscordEmbedPayload(params: {
  roleMentionId: string;
  namaTim: string;
  email: string;
  sisaWaktuText: string;
  hexWarna: string;
}) {
  const hexDecimal = parseInt(params.hexWarna.replace('#', ''), 16) || 15158332;

  return {
    content: `<@&${params.roleMentionId}>`,
    embeds: [
      {
        title: "⏳ Pendaftaran Segera Ditutup!",
        color: hexDecimal,
        description: `Periksa kembali data roster tim **${params.namaTim}** sebelum waktu pendaftaran berakhir.`,
        fields: [
          {
            name: "⏱️ Sisa Waktu",
            value: `\`\`\`${params.sisaWaktuText}\`\`\``,
            inline: false,
          },
          {
            name: "🔍 Hal yang Wajib Dicek",
            value: "• Typo pada **IGN** & **Duel ID**.\n• Status verifikasi Discord pemain.\n• Tambah / kurangi anggota roster (Maks 10).",
            inline: false,
          },
          {
            name: "📝 Cara Edit Data Tim",
            value: `Klik tombol **Edit Team** di bawah atau gunakan tautan yang dikirim ke email registered:\n📧 \`${maskEmail(params.email)}\`\n\n*Gagal/Email tidak ketemu? Hubungi Admin Discord.*`,
            inline: false,
          },
        ],
        footer: {
          text: getFormattedFooterTime(),
        },
      },
    ],
    // 👇 Menggunakan Custom ID agar memicu Interaction Event Bot 👇
    components: [
      {
        type: 1, // Action Row
        components: [
          {
            type: 2, // Button Component
            style: 1, // Primary (Blurple) Button
            custom_id: "btn_edit_team",
            label: "Edit Team",
            emoji: { name: "✏️" }
          }
        ]
      }
    ]
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const testEmail = searchParams.get('email');
    const sisaWaktuText = getRemainingTimeText();

    if (testEmail) {
      const emailHtml = getClosingReminderTemplate({
        namaTim: 'Asashin OG (TEST)',
        namaKetua: 'Izzat Najmie',
        warna: '#7300FF',
        editToken: 'sample-test-token-123',
        sisaWaktuText,
      });

      await resend.emails.send({
        from: EMAIL_CONFIG.sender,
        to: testEmail,
        subject: `⚠️ [TESTING] Pendaftaran Akan Ditutup: Cek Data Tim Asashin OG [Team Wars S7]`,
        html: emailHtml,
      });

      const testDiscordPayload = createDiscordEmbedPayload({
        roleMentionId: DISCORD_CONFIG.ROLE_ADMIN,
        namaTim: 'Asashin OG (TEST)',
        email: testEmail,
        sisaWaktuText,
        hexWarna: '#7300FF',
      });

      await discordAPI(
        `/channels/${DISCORD_CONFIG.CH_LOG}/messages`,
        'POST',
        testDiscordPayload
      ).catch((err) => console.error('Gagal kirim testing embed Discord:', err));

      return NextResponse.json({
        success: true,
        mode: 'TESTING',
        sentToEmail: testEmail,
        sentToDiscordChannel: `CH_LOG (${DISCORD_CONFIG.CH_LOG})`,
        taggedRole: `ROLE_ADMIN (${DISCORD_CONFIG.ROLE_ADMIN})`,
        sisaWaktu: sisaWaktuText,
        message: 'Email & Embed Discord interactive button uji coba berhasil terkirim!',
      });
    }

    // MODE CRON BATCH
    const teamKeys = await kv.keys('teams:*');

    if (!teamKeys || teamKeys.length === 0) {
      return NextResponse.json({ message: 'Tidak ada data tim di Redis.' });
    }

    let targetTeamKey: string | null = null;
    let targetTeamData: any = null;

    for (const key of teamKeys) {
      const teamData: any = await kv.hgetall(key);
      if (teamData && teamData.email && teamData.reminderSent !== 'true') {
        targetTeamKey = key;
        targetTeamData = teamData;
        break;
      }
    }

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

    const channelId = targetTeamData.discordChannelId;
    const roleId = targetTeamData.discordRoleId || targetTeamData.roleId;

    if (channelId && roleId) {
      const discordPayload = createDiscordEmbedPayload({
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

    await kv.hset(targetTeamKey, { reminderSent: 'true' });

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
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
  }
        
