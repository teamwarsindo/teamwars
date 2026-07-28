import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { Resend } from 'resend';
import { EMAIL_CONFIG, CLOSE_TARGET_DATE, DISCORD_CONFIG } from '@/lib/config';
import { getClosingReminderTemplate } from '@/lib/email-templates';
import { discordAPI } from '@/lib/discord/utils';

const resend = new Resend(process.env.RESEND_API_KEY);

// Helper hitung sisa waktu mundur berdasarkan CLOSE_TARGET_DATE dari lib/config
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

// Helper untuk masking/sensor email agar aman dipajang di Discord publik (m**a@gmail.com)
function maskEmail(email: string) {
  if (!email) return '••••@••••.com';
  const [name, domain] = email.split('@');
  if (!domain) return '••••@••••.com';
  const maskedName = name.length > 2 ? name.slice(0, 2) + '••••' : name[0] + '••••';
  return `${maskedName}@${domain}`;
}

// Helper untuk membuat Payload Embed Discord
function createDiscordEmbedPayload(params: {
  roleMentionId: string;
  namaTim: string;
  email: string;
  sisaWaktuText: string;
  hexWarna: string;
}) {
  const hexDecimal = parseInt(params.hexWarna.replace('#', ''), 16) || 15158332; // Default Merah jika invalid

  return {
    content: `<@&${params.roleMentionId}> ⚠️ **PEMBERITAHUAN PENTING PENUTUPAN PENDAFTARAN TWI S7**`,
    embeds: [
      {
        title: `⏳ Pendaftaran Akan Ditutup: Tim ${params.namaTim}`,
        color: hexDecimal,
        description: `Halo seluruh anggota tim **${params.namaTim}**!\n\nGerbang pendaftaran Team Wars Indonesia Season 7 akan segera dikunci. Harap pastikan seluruh susunan pemain dan data tim kalian sudah **100% valid** sebelum waktu habis.`,
        fields: [
          {
            name: "⏱️ Sisa Waktu Pendaftaran",
            value: `\`\`\`${params.sisaWaktuText}\`\`\``,
            inline: false,
          },
          {
            name: "🔍 Apa yang Harus Diperiksa?",
            value: "• Pastikan tidak ada **typo / salah ketik** IGN & Duel ID.\n• Pastikan status verifikasi Discord pemain sudah ✅.\n• Tambah / kurangi roster jika diperlukan (Maks 10 Pemain).",
            inline: false,
          },
          {
            name: "✉️ Cara Mengubah / Edit Data Tim",
            value: `Tautan (*link*) khusus untuk mengedit data tim telah kami kirimkan ke inbox email registered kalian:\n📧 **\`${maskEmail(params.email)}\`**\n\n*Periksa folder Primary, Promo, atau Spam pada email tersebut.*`,
            inline: false,
          },
          {
            name: "🆘 Tidak Menemukan Email / Ingin Ubah Identitas Utama?",
            value: "Jika email tidak ditemukan, atau ingin mengubah **Ketua / Wakil / Nama Tim / Logo**, harap segera hubungi **Admin Discord** di server TWI.",
            inline: false,
          },
        ],
        footer: {
          text: "Team Wars Indonesia Season 7 • Otomatisasi Sistem",
        },
      },
    ],
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const testEmail = searchParams.get('email'); // Mode Testing: ?email=achmadnsss20@gmail.com
    const sisaWaktuText = getRemainingTimeText();

    // ==========================================
    // 1. MODE TESTING (Kirim ke Email Test & CH_LOG Discord)
    // ==========================================
    if (testEmail) {
      // A. Kirim Email Testing
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

      // B. Kirim Embed Discord Testing ke CH_LOG & Tag ROLE_ADMIN
      const testDiscordPayload = createDiscordEmbedPayload({
        roleMentionId: DISCORD_CONFIG.ROLE_ADMIN, // Tag Role Admin saat Testing
        namaTim: 'Asashin OG (TEST)',
        email: testEmail,
        sisaWaktuText,
        hexWarna: '#7300FF',
      });

      await discordAPI(
        `/channels/${DISCORD_CONFIG.CH_LOG}/messages`, // Kirim ke Channel Log
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
        message: 'Email & Embed Discord uji coba berhasil terkirim!',
      });
    }

    // ==========================================
    // 2. MODE CRON-JOB.ORG (1 Tim per Hit)
    // ==========================================
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
        break; // Stop loop langsung begitu menemukan 1 tim!
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

    // Ekstrak data tim
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

    // B. Kirim Embed Discord ke Channel Tim & Tag Role Tim
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

    // Tandai status di Redis agar tidak terkirim dua kali
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
