// Sisipkan di bagian handling Button Interactions (body.type === 3) pada app/api/discord/route.ts:

if (customId.startsWith('btn_edit_match_')) {import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { verifySignature } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';

// Slash Commands
import { handleReminder } from '@/lib/discord/commands/reminder';
import { handlePrepare } from '@/lib/discord/commands/prepare';
import { handleInfo } from '@/lib/discord/commands/info';
import { handleTimerCommand } from '@/lib/discord/commands/timer';
import { handleCekId } from '@/lib/discord/commands/cek-id-dl';
import { handleBlacklistCommand } from '@/lib/discord/commands/blacklist';
import { handleCekRoster } from '@/lib/discord/commands/cek-roster';
import { handleCancelBid } from '@/lib/discord/commands/cancel-bid';

// Button Handlers
import { handleBtVerified } from '@/lib/discord/buttons/btVerified';
import { handleBtRole } from '@/lib/discord/buttons/btRole';
import { handleBtEditTeam } from '@/lib/discord/buttons/btEditTeam';
import { handleBtTimer } from '@/lib/discord/buttons/handleBtTimer';

// Bidding Module
import { getBidModal } from '@/lib/discord/buttons/bidding';
import { processBidSubmission, handleViewFullLog, KV_BID_KEY, BidStore } from '@/lib/discord/bidding';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-signature-ed25519');
    const timestamp = req.headers.get('x-signature-timestamp');

    if (!verifySignature(rawBody, signature, timestamp)) {
      return new NextResponse('Akses Ditolak', { status: 401 });
    }

    const body = JSON.parse(rawBody);

    // ⚡ Ping Interaction (Type 1)
    if (body.type === 1) return NextResponse.json({ type: 1 });

    // ⚡ Slash Commands (Type 2)
    if (body.type === 2) {
      const commandName = body.data.name;
      if (commandName === 'reminder') return await handleReminder(body);
      if (commandName === 'prepare') return await handlePrepare(body);
      if (commandName === 'info') return await handleInfo(body); 
      if (commandName === 'timer') return await handleTimerCommand(body);
      if (commandName === 'cek-id') return await handleCekId(body);
      if (commandName === 'blacklist') return await handleBlacklistCommand(body);
      if (commandName === 'cek-roster') return await handleCekRoster(body);
      if (commandName === 'cancel-bid') return await handleCancelBid(body);
    }

    // 🔘 Button Interactions (Type 3)
    if (body.type === 3) {
      const customId = body.data.custom_id;

      if (customId === 'bt_verified') return await handleBtVerified(body);
      if (customId === 'bt_role') return await handleBtRole(body);
      if (customId === 'btn_edit_team') return await handleBtEditTeam(body);
      if (customId === 'toggle_timer_teamA' || customId === 'toggle_timer_teamB') {
        return await handleBtTimer(body);
      }

      // 📜 Tombol Lihat Seluruh Log
      if (customId === 'btn_view_full_log') {
        return await handleViewFullLog();
      }

      // 📝 Tombol "Edit Match Report" di Channel Match Discord
      if (customId.startsWith('btn_edit_match_')) {
        const matchId = customId.replace('btn_edit_match_', '');
        const userId = body.member?.user?.id;
        const userRoles: string[] = body.member?.roles || [];

        // Ambil data jadwal dari KV Redis
        const schedules = (await kv.get<any[]>('twi:schedules')) || [];
        const match = schedules.find((m) => m.id === matchId);

        if (!match) {
          return NextResponse.json({
            type: 4,
            data: {
              content: '❌ Data pertandingan tidak ditemukan di database.',
              flags: 64, // Ephemeral (Hanya terlihat oleh user penekan tombol)
            },
          });
        }

        const isAdmin = userRoles.includes(DISCORD_CONFIG.ROLE_ADMIN);
        const isAssignedReferee = match.refereeDiscordId && match.refereeDiscordId === userId;

        // 🛡️ VERIFIKASI HAK AKSES (HANYA ADMIN / WASIT TERDAFTAR ON MATCH)
        if (!isAdmin && !isAssignedReferee) {
          return NextResponse.json({
            type: 4,
            data: {
              content: '⚠️ **Akses Ditolak!** Tombol ini hanya dapat diakses oleh Wasit yang bertugas di match ini atau Admin Tournament.',
              flags: 64, // Ephemeral
            },
          });
        }

        // 🔑 JIKA VERIFIKASI BERHASIL -> KIRIM MAGIC LINK PERTANDINGAN
        const hostUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://teamwars.web.id';
        const magicUrl = `${hostUrl}/tournament/match-input/${match.id}?token=${match.refereeToken || ''}`;

        return NextResponse.json({
          type: 4,
          data: {
            content: `🔒 **Akses Referee Console Diberikan**\n\nMatch: **${match.teamAName} vs ${match.teamBName}**\nSilakan klik link berikut untuk membuka halaman input laporan pertandingan:\n🔗 ${magicUrl}\n\n*(Sifat link ini rahasia, jangan bagikan kepada pemain/orang lain)*`,
            flags: 64, // Ephemeral
          },
        });
      }

      // 🏆 Tombol Bid Group A / B
      if (customId.startsWith('btn_bid_')) {
        const groupTarget = customId.replace('btn_bid_', '');

        const data = (await kv.get<BidStore>(KV_BID_KEY)) || { groupA: null, groupB: null };

        const currentA = data.groupA?.amount || 0;
        const currentB = data.groupB?.amount || 0;

        const minAmountA = currentA === 0 ? 110000 : currentA + 10000;
        const minAmountB = currentB === 0 ? 110000 : currentB + 10000;

        const minAmount = groupTarget === "A" ? minAmountA : minAmountB;

        return NextResponse.json(getBidModal(groupTarget, minAmount));
      }
    }

    // 📝 Modal Submit Interactions (Type 5)
    if (body.type === 5) {
      const customId = body.data.custom_id;

      if (customId.startsWith('modal_bid_')) {
        return await processBidSubmission(body);
      }
    }

    return new NextResponse('Unknown Interaction', { status: 400 });

  } catch (error) {
    console.error('Error Webhook DC:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
      }
                                             
  const matchId = customId.replace('btn_edit_match_', '');
  const userId = body.member?.user?.id;
  const userRoles: string[] = body.member?.roles || [];

  // Fetch data match dari KV untuk cek Wasit terdaftar
  const schedules = (await kv.get<any[]>('twi:schedules')) || [];
  const match = schedules.find((m) => m.id === matchId);

  if (!match) {
    return NextResponse.json({
      type: 4,
      data: { content: '❌ Data match tidak ditemukan.', flags: 64 },
    });
  }

  const isAdmin = userRoles.includes(DISCORD_CONFIG.ROLE_ADMIN);
  const isAssignedReferee = match.refereeDiscordId && match.refereeDiscordId === userId;

  // VERIFIKASI KEAMANAN (HANYA ADMIN / WASIT MATCH TERKAIT)
  if (!isAdmin && !isAssignedReferee) {
    return NextResponse.json({
      type: 4,
      data: {
        content: '⚠️ **Akses Ditolak!** Tombol ini hanya bisa diakses oleh Wasit yang bertugas di match ini atau Admin Tournament.',
        flags: 64, // Ephemeral (Hanya terlihat oleh pemicu)
      },
    });
  }

  // JIKA VALID -> KIRIMKAN MAGIC LINK EPHEMERAL
  const hostUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://teamwars.web.id';
  const magicUrl = `${hostUrl}/tournament/match-input/${match.id}?token=${match.refereeToken || ''}`;

  return NextResponse.json({
    type: 4,
    data: {
      content: `🔒 **Akses Input Match Diberikan**\nSilakan klik link berikut untuk membuka Referee Console:\n🔗 ${magicUrl}\n\n*(Jangan bagikan link ini kepada orang lain!)*`,
      flags: 64,
    },
  });
}
