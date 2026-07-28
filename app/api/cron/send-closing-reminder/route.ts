import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { Resend } from 'resend';
import { EMAIL_CONFIG, CLOSE_TARGET_DATE } from '@/lib/config';
import { getClosingReminderTemplate } from '@/lib/email-templates';

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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const testEmail = searchParams.get('email'); // Uji coba: ?email=emailku@gmail.com
    const sisaWaktuText = getRemainingTimeText();

    // ==========================================
    // 1. MODE TESTING (Uji Coba Kirim 1 Email)
    // ==========================================
    if (testEmail) {
      const emailHtml = getClosingReminderTemplate({
        namaTim: 'Asashin OG',
        namaKetua: 'Izzat Najmie',
        warna: '#7300FF',
        editToken: 'sample-test-token-123',
        sisaWaktuText,
      });

      await resend.emails.send({
        from: EMAIL_CONFIG.sender,
        to: testEmail,
        subject: `⚠️ Pendaftaran Akan Ditutup: Cek Data Tim Asashin OG [Team Wars S7]`,
        html: emailHtml,
      });

      return NextResponse.json({
        success: true,
        mode: 'TESTING',
        sentTo: testEmail,
        sisaWaktu: sisaWaktuText,
        message: 'Email pengingat uji coba berhasil terkirim!',
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
        break; // Langsung stop loop begitu dapat 1 tim!
      }
    }

    // Jika seluruh tim sudah terkirim
    if (!targetTeamKey || !targetTeamData) {
      return NextResponse.json({
        success: true,
        completed: true,
        message: 'Seluruh tim terdaftar sudah berhasil menerima email pengingat!',
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

    const emailHtml = getClosingReminderTemplate({
      namaTim: teamName,
      namaKetua: ketuaTim.namaLengkap,
      warna: targetTeamData.warna || '#4CAF50',
      editToken: targetTeamData.editToken || '',
      sisaWaktuText,
    });

    // Kirim email via Resend
    await resend.emails.send({
      from: EMAIL_CONFIG.sender,
      to: targetTeamData.email,
      subject: `⚠️ Pendaftaran Akan Ditutup: Cek Data Tim ${teamName} [Team Wars S7]`,
      html: emailHtml,
    });

    // Tandai status di Redis agar tidak terkirim dua kali saat Cron-Job.org menembak lagi
    await kv.hset(targetTeamKey, { reminderSent: 'true' });

    return NextResponse.json({
      success: true,
      sentToTeam: teamName,
      email: targetTeamData.email,
      sisaWaktu: sisaWaktuText,
      message: `Berhasil mengirim email pengingat ke ${teamName}!`,
    });

  } catch (error: any) {
    console.error('Error Cron Job Reminder:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
      }
