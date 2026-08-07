import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { verifySignature } from '@/lib/discord/utils';
import { DISCORD_CONFIG } from '@/lib/discord/config';
import { createMatchDiscordChannel } from '@/lib/discord/channels';
import { revalidatePath } from 'next/cache';

// Slash Commands Handlers
import { handleReminder } from '@/lib/discord/commands/reminder';
import { handlePrepare } from '@/lib/discord/commands/prepare';
import { handleInfo } from '@/lib/discord/commands/info';
import { handleTimerCommand } from '@/lib/discord/commands/timer';
import { handleCekId } from '@/lib/discord/commands/cek-id-dl';
import { handleBlacklistCommand } from '@/lib/discord/commands/blacklist';
import { handleCekRoster } from '@/lib/discord/commands/cek-roster';
import { handleCancelBid } from '@/lib/discord/commands/cancel-bid';

// Staff System Handlers
import { handleStaffCommand } from '@/lib/discord/handlers/staff-handler';
import { handleAutocomplete } from '@/lib/discord/handlers/autocomplete-handler';

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

    // 1. Verifikasi Signature Discord
    if (!verifySignature(rawBody, signature, timestamp)) {
      console.warn('⚠️ Request Discord ditolak: Signature Invalid!');
      return new NextResponse('Akses Ditolak', { status: 401 });
    }

    const body = JSON.parse(rawBody);

    // 2. PING TEST DARI DISCORD PORTAL (Type 1)
    if (body.type === 1) {
      return new NextResponse(JSON.stringify({ type: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ⚡ Slash Commands Execution (Type 2)
    if (body.type === 2) {
      const commandName = body.data.name;
      if (commandName === 'staff') return NextResponse.json(await handleStaffCommand(body));
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
      const customId: string = body.data?.custom_id || '';
      const userId: string = body.member?.user?.id || '';
      const userRoles: string[] = body.member?.roles || [];
      const isAdmin = userRoles.includes(DISCORD_CONFIG.ROLE_ADMIN);

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

      // 🏆 Tombol Bid Group A / B
      if (customId.startsWith('btn_bid_')) {
        const groupTarget = customId.replace('btn_bid_', '');

        const data = (await kv.get<BidStore>(KV_BID_KEY)) || { groupA: null, groupB: null };

        const currentA = data.groupA?.amount || 0;
        const currentB = data.groupB?.amount || 0;

        const minAmountA = currentA === 0 ? 110000 : currentA + 10000;
        const minAmountB = currentB === 0 ? 110000 : currentB + 10000;

        const minAmount = groupTarget === 'A' ? minAmountA : minAmountB;

        return NextResponse.json(getBidModal(groupTarget, minAmount));
      }

      // 📝 EDIT MATCH REPORT
      if (customId.startsWith('btn_edit_match_')) {
        const matchId = customId.replace('btn_edit_match_', '');
        const schedules = (await kv.get<any[]>('twi:schedules')) || [];
        const match = schedules.find((m) => m.id === matchId);

        if (!match) {
          return NextResponse.json({ type: 4, data: { content: '❌ Data match tidak ditemukan.', flags: 64 } });
        }

        const isReferee = match.refereeDiscordId && match.refereeDiscordId === userId;
        if (!isAdmin && !isReferee) {
          return NextResponse.json({ type: 4, data: { content: '⚠️ Akses ditolak! Khusus Wasit bertugas atau Admin.', flags: 64 } });
        }

        const token = match.refereeToken || '';
        const hostUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.teamwars.web.id';
        const magicUrl = `${hostUrl}/tournament/match-input/${matchId}?token=${token}`;

        return NextResponse.json({
          type: 4,
          data: { content: `🔒 **Akses Match Report Console**\n🔗 ${magicUrl}`, flags: 64 },
        });
      }

      // 📢 REQUEST RESCHEDULE
      if (customId.startsWith('btn_request_reschedule_')) {
        const matchId = customId.replace('btn_request_reschedule_', '');
        const suggestedDate = new Date();
        suggestedDate.setDate(suggestedDate.getDate() + 2);
        suggestedDate.setHours(20, 0, 0, 0);
        const suggestedIso = suggestedDate.toISOString();

        const formattedSuggestedWIB = suggestedDate.toLocaleDateString('id-ID', {
          weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
        });

        return NextResponse.json({
          type: 4,
          data: {
            content: `📢 **PENGAJUAN RESCHEDULE MATCH**\n\nUsulan waktu baru:\n📅 **${formattedSuggestedWIB} WIB**\n\n*Konfirmasi dari Kapten Tim Lawan atau Admin:*`,
            components: [
              {
                type: 1,
                components: [
                  { type: 2, style: 3, label: 'Setujui Reschedule', custom_id: `btn_confirm_reschedule_${matchId}_${suggestedIso}`, emoji: { name: '✅' } },
                  { type: 2, style: 4, label: 'Tolak', custom_id: `btn_reject_reschedule_${matchId}`, emoji: { name: '❌' } },
                ],
              },
            ],
          },
        });
      }

      // ✅ CONFIRM RESCHEDULE
      if (customId.startsWith('btn_confirm_reschedule_')) {
        const [, , matchId, newDateIso] = customId.split('_');
        const schedules = (await kv.get<any[]>('twi:schedules')) || [];
        const matchIndex = schedules.findIndex((m) => m.id === matchId);

        if (matchIndex !== -1) {
          schedules[matchIndex].matchDate = newDateIso;
          await kv.set('twi:schedules', schedules);

          revalidatePath('/tournament');
          revalidatePath('/admin/dashboard');

          const match = schedules[matchIndex];
          await createMatchDiscordChannel({
            matchId: match.id,
            teamAName: match.teamAName,
            teamBName: match.teamBName,
            weekName: `Week ${match.calculatedWeekNumber || 1}`,
            matchDateIso: match.matchDate,
            refereeName: match.referee,
            refereeDiscordId: match.refereeDiscordId,
            streamerName: match.streamer,
            streamerDiscordId: match.caster,
            streamLink: match.streamLink,
          });

          return NextResponse.json({
            type: 4,
            data: { content: `🎉 **Reschedule Disetujui & Resmi Berubah!**` },
          });
        }
      }

      // ❌ REJECT RESCHEDULE
      if (customId.startsWith('btn_reject_reschedule_')) {
        return NextResponse.json({ type: 4, data: { content: '❌ **Pengajuan Reschedule Ditolak.**' } });
      }
    }

    // 🔎 Autocomplete Interactions (Type 4)
    if (body.type === 4) {
      if (body.data?.name === 'staff') {
        const autocompleteResponse = await handleAutocomplete(body);
        return NextResponse.json(autocompleteResponse);
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