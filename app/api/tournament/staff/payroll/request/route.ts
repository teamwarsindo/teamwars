import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI } from '@/lib/discord/utils';
import { REFEREE_PAYROLL_CONFIG } from '@/app/tournament/_library/constants';
import { verifyRefereeToken } from '@/app/tournament/_library/referee-token';
import { StaffItem } from '@/lib/discord/commands/assign/types';

export const dynamic = 'force-dynamic';

interface PayrollRequestBody {
  token: string;
  matchIds: string[];
  bankInfo: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
}

export async function POST(req: Request) {
  try {
    const body: PayrollRequestBody = await req.json();
    const { token, matchIds, bankInfo } = body;

    if (!token || !Array.isArray(matchIds) || matchIds.length === 0 || !bankInfo) {
      return NextResponse.json(
        { success: false, message: 'Data permohonan tidak lengkap.' },
        { status: 400 }
      );
    }

    if (!bankInfo.bankName?.trim() || !bankInfo.accountNumber?.trim() || !bankInfo.accountHolder?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Detail informasi rekening wajib diisi lengkap.' },
        { status: 400 }
      );
    }

    // 1. Verifikasi token HMAC wasit
    const discordId = await verifyRefereeToken(token);
    if (!discordId) {
      return NextResponse.json(
        { success: false, message: 'Akses tidak sah atau token wasit telah kedaluwarsa.' },
        { status: 401 }
      );
    }

    // 2. Ambil data wasit dari master staff:referees
    const referees = (await kv.get<StaffItem[]>('staff:referees')) || [];
    const idx = referees.findIndex((r) => r.discordId === discordId);
    if (idx === -1) {
      return NextResponse.json(
        { success: false, message: 'Data wasit tidak ditemukan di sistem.' },
        { status: 404 }
      );
    }

    const currentReferee = referees[idx];
    const historyMatches = (currentReferee as any).historyMatch || [];
    const payrollRequests: any[] = (currentReferee as any).payrollRequests || [];

    // 3. Validasi pembatasan 1x sebulan (berdasarkan bulan berjalan)
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const activeRequestThisMonth = payrollRequests.find(
      (r) => r.monthKey === monthKey && (r.status === 'PENDING' || r.status === 'APPROVED')
    );

    if (activeRequestThisMonth) {
      return NextResponse.json(
        {
          success: false,
          message: `Anda sudah memiliki pengajuan honor untuk periode bulan ini (${monthKey}) dengan status${activeRequestThisMonth.status}.`,
        },
        { status: 400 }
      );
    }

    // 4. Verifikasi bahwa match yang diajukan benar-benar milik wasit dan belum diklaim
    const activeClaimedMatchIds = new Set<string>();
    payrollRequests.forEach((req) => {
      if (req.status === 'PENDING' || req.status === 'APPROVED') {
        req.matchIds?.forEach((mId: string) => activeClaimedMatchIds.add(mId));
      }
    });

    for (const mId of matchIds) {
      if (!historyMatches.includes(mId)) {
        return NextResponse.json(
          { success: false, message: `Match ID ${mId} tidak ada di riwayat pertandingan sah Anda.` },
          { status: 400 }
        );
      }
      if (activeClaimedMatchIds.has(mId)) {
        return NextResponse.json(
          { success: false, message: `Match ID ${mId} sedang dalam status pengajuan atau sudah dicairkan.` },
          { status: 400 }
        );
      }
    }

    // 5. Kalkulasi total nominal honor (Fee per match dalam satuan ribuan rupiah)
    const totalAmount = matchIds.length * REFEREE_PAYROLL_CONFIG.FEE_PER_MATCH * 1000;
    const requestId = `req-${discordId}-${Date.now().toString(36)}`;

    const newRequest = {
      requestId,
      monthKey,
      matchIds,
      totalAmount,
      status: 'PENDING',
      createdAt: now.toISOString(),
    };

    // 6. Simpan rekening dan tiket pengajuan ke objek wasit
    (currentReferee as any).bankInfo = {
      bankName: bankInfo.bankName.trim(),
      accountNumber: bankInfo.accountNumber.trim(),
      accountHolder: bankInfo.accountHolder.trim(),
    };
    (currentReferee as any).payrollRequests = [newRequest, ...payrollRequests];

    referees[idx] = currentReferee;
    await kv.set('staff:referees', referees);

    // 7. Kirim notifikasi embed ke Discord CH_LOG dengan tag ROLE_ADMIN
    if (DISCORD_CONFIG.CH_LOG) {
      const mentionRole = DISCORD_CONFIG.ROLE_ADMIN ? `<@&${DISCORD_CONFIG.ROLE_ADMIN}>` : '@Admin';
      const formattedTotal = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }).format(totalAmount);

      const embedPayload = {
        content: `🔔 ${mentionRole} Permohonan pencairan honor wasit baru telah diajukan!`,
        embeds: [
          {
            title: '📄 Pengajuan Honor Wasit (Payroll Request)',
            color: 0xaa1348,
            fields: [
              { name: 'Wasit', value: `${currentReferee.discordName} (<@${discordId}>)`, inline: true },
              { name: 'Periode', value: monthKey, inline: true },
              { name: 'Total Match', value: `${matchIds.length} Pertandingan`, inline: true },
              { name: 'Total Honor', value: `**${formattedTotal}**`, inline: true },
              {
                name: 'Detail Rekening',
                value: `**Bank:** ${bankInfo.bankName}\n**No. Rek:** ${bankInfo.accountNumber}\n**A/N:** ${bankInfo.accountHolder}`,
                inline: false,
              },
              {
                name: 'Daftar Match ID',
                value: matchIds.map((id) => `\`${id}\``).join(', '),
                inline: false,
              },
            ],
            footer: { text: `Request ID: ${requestId}` },
            timestamp: now.toISOString(),
          },
        ],
      };

      await discordAPI(`/channels/${DISCORD_CONFIG.CH_LOG}/messages`, 'POST', embedPayload).catch((err) => {
        console.error('[PAYROLL NOTIF DISCORD ERROR]:', err);
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Pengajuan honor berhasil dikirim dan menunggu verifikasi admin.',
      requestId,
      totalAmount,
    });
  } catch (error: any) {
    console.error('[PAYROLL REQUEST ROUTE ERROR]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Terjadi kesalahan sistem saat memproses pengajuan honor.' },
      { status: 500 }
    );
  }
}
