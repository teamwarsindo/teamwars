import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { discordAPI } from '@/lib/discord/utils';
import { StaffItem } from '@/lib/discord/commands/assign/types';

export const dynamic = 'force-dynamic';

interface PayrollActionBody {
  requestId: string;
  refereeDiscordId: string;
  action: 'APPROVE' | 'DECLINE';
  proofUrl?: string;
  declineReason?: string;
  adminName?: string;
}

export async function POST(req: Request) {
  try {
    const body: PayrollActionBody = await req.json();
    const { requestId, refereeDiscordId, action, proofUrl, declineReason, adminName } = body;

    if (!requestId || !refereeDiscordId || !action) {
      return NextResponse.json(
        { success: false, message: 'Parameter requestId, refereeDiscordId, dan action wajib disertakan.' },
        { status: 400 }
      );
    }

    if (action === 'APPROVE' && !proofUrl?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Bukti transfer (proofUrl) wajib disertakan untuk menyetujui pencairan.' },
        { status: 400 }
      );
    }

    if (action === 'DECLINE' && !declineReason?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Alasan penolakan (declineReason) wajib diisi saat menolak permohonan.' },
        { status: 400 }
      );
    }

    // 1. Ambil data wasit dari master staff:referees
    const referees = (await kv.get<StaffItem[]>('staff:referees')) || [];
    const idx = referees.findIndex((r) => r.discordId === refereeDiscordId);

    if (idx === -1) {
      return NextResponse.json(
        { success: false, message: 'Data wasit tidak ditemukan di sistem.' },
        { status: 404 }
      );
    }

    const currentReferee = referees[idx];
    const payrollRequests: any[] = (currentReferee as any).payrollRequests || [];
    const reqIndex = payrollRequests.findIndex((r) => r.requestId === requestId);

    if (reqIndex === -1) {
      return NextResponse.json(
        { success: false, message: 'Tiket pengajuan honor tidak ditemukan pada wasit terkait.' },
        { status: 404 }
      );
    }

    const targetRequest = payrollRequests[reqIndex];
    if (targetRequest.status !== 'PENDING') {
      return NextResponse.json(
        {
          success: false,
          message: `Tiket ini sudah diproses sebelumnya dengan status ${targetRequest.status}.`,
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const executorName = adminName?.trim() || 'Admin Team Wars';

    // 2. Eksekusi status tiket berdasarkan action
    if (action === 'APPROVE') {
      targetRequest.status = 'APPROVED';
      targetRequest.proofUrl = proofUrl?.trim();
      targetRequest.processedAt = now.toISOString();
      targetRequest.processedBy = executorName;
    } else {
      targetRequest.status = 'REJECTED';
      targetRequest.declineReason = declineReason?.trim();
      targetRequest.processedAt = now.toISOString();
      targetRequest.processedBy = executorName;
      // Catatan: Dengan status REJECTED, kuota bulan berjalan dan matchId otomatis terbuka kembali
    }

    payrollRequests[reqIndex] = targetRequest;
    (currentReferee as any).payrollRequests = payrollRequests;
    referees[idx] = currentReferee;

    await kv.set('staff:referees', referees);

    // 3. Format nominal untuk notifikasi
    const formattedTotal = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(targetRequest.totalAmount || 0);

    // 4. Kirim notifikasi Direct Message (DM) Discord ke wasit terkait
    let dmDelivered = false;
    try {
      const dmChannel: any = await discordAPI('/users/@me/channels', 'POST', {
        recipient_id: refereeDiscordId,
      });

      if (dmChannel?.id) {
        const isApproved = action === 'APPROVE';
        const dmPayload = {
          embeds: [
            {
              title: isApproved
                ? '✅ Honor Pertandingan Berhasil Dicairkan'
                : '❌ Pengajuan Pencairan Honor Ditolak',
              color: isApproved ? 0x22c55e : 0xef4444,
              description: isApproved
                ? `Halo **${currentReferee.discordName}**, permohonan pencairan honor Anda telah disetujui dan ditransfer oleh panitia.`
                : `Halo **${currentReferee.discordName}**, permohonan pencairan honor Anda belum dapat disetujui. Silakan periksa alasan penolakan dan Anda dapat mengajukan ulang.`,
              fields: [
                { name: 'Periode', value: targetRequest.monthKey, inline: true },
                { name: 'Total Honor', value: `**${formattedTotal}**`, inline: true },
                { name: 'Total Pertandingan', value: `${targetRequest.matchIds?.length || 0} Match`, inline: true },
                ...(isApproved && targetRequest.proofUrl
                  ? [{ name: 'Bukti Transfer', value: `[Lihat Bukti Transfer](${targetRequest.proofUrl})`, inline: false }]
                  : []),
                ...(!isApproved && targetRequest.declineReason
                  ? [{ name: 'Alasan Penolakan', value: `> ${targetRequest.declineReason}`, inline: false }]
                  : []),
              ],
              ...(isApproved && targetRequest.proofUrl?.startsWith('http')
                ? { image: { url: targetRequest.proofUrl } }
                : {}),
              footer: { text: `Diproses oleh ${executorName} • Request ID: ${requestId}` },
              timestamp: now.toISOString(),
            },
          ],
        };

        await discordAPI(`/channels/${dmChannel.id}/messages`, 'POST', dmPayload);
        dmDelivered = true;
      }
    } catch (dmErr: any) {
      console.warn(`[DM NOTIFICATION FAILED]: User ${refereeDiscordId} may have DMs closed.`, dmErr);
    }

    // 5. Kirim log aktivitas admin ke CH_LOG
    if (DISCORD_CONFIG.CH_LOG) {
      const logStatusDesc =
        action === 'APPROVE'
          ? `Telah **MENYETUJUI** pencairan honor wasit **${currentReferee.discordName}** (<@${refereeDiscordId}>).`
          : `Telah **MENOLAK** pengajuan honor wasit **${currentReferee.discordName}** (<@${refereeDiscordId}>).`;

      const logEmbed = {
        embeds: [
          {
            title: `⚖️ Audit Payroll Action: ${action}`,
            color: action === 'APPROVE' ? 0x22c55e : 0xef4444,
            description: `${executorName}${logStatusDesc}`,
            fields: [
              { name: 'Request ID', value: `\`${requestId}\``, inline: true },
              { name: 'Nominal', value: formattedTotal, inline: true },
              { name: 'Status DM Wasit', value: dmDelivered ? '✅ Terkirim' : '⚠️ Gagal (DM Privat Ditutup)', inline: true },
              ...(action === 'APPROVE' && proofUrl
                ? [{ name: 'Bukti Transfer', value: `[Tautan Bukti](${proofUrl})`, inline: false }]
                : []),
              ...(action === 'DECLINE' && declineReason
                ? [{ name: 'Alasan Penolakan', value: declineReason, inline: false }]
                : []),
            ],
            timestamp: now.toISOString(),
          },
        ],
      };

      await discordAPI(`/channels/${DISCORD_CONFIG.CH_LOG}/messages`, 'POST', logEmbed).catch(() => null);
    }

    return NextResponse.json({
      success: true,
      message: `Pengajuan honor berhasil di-${action.toLowerCase()}.`,
      dmDelivered,
      requestId,
      status: targetRequest.status,
    });
  } catch (error: any) {
    console.error('[PAYROLL ACTION ROUTE ERROR]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Terjadi kesalahan sistem saat memproses tindakan payroll.' },
      { status: 500 }
    );
  }
}
