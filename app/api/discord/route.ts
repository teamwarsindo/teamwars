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
import { handleTransferCommand, handleTransferAutocomplete } from '@/lib/discord/commands/transfer';

// Transfer Execution Services
import { executeTransferAdd, executeTransferOut, executeTransferEditDl } from '@/lib/discord/services/transfer-service';

// Assign & Unassign Handlers
import { handleAssignAutocomplete } from '@/lib/discord/handlers/autocomplete-handler';
import { handleAssignCommand } from '@/lib/discord/handlers/assign-handler';
import { handleUnassignCommand } from '@/lib/discord/handlers/unassign-handler';

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

const BID_DEADLINE_TIMESTAMP = 1786279200;

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-signature-ed25519');
    const timestamp = req.headers.get('x-signature-timestamp');

    if (!verifySignature(rawBody, signature, timestamp)) {
      console.warn('⚠️ Request Discord ditolak: Signature Invalid!');
      return new NextResponse('Akses Ditolak', { status: 401 });
    }

    const body = JSON.parse(rawBody);

    if (body.type === 1) {
      return new NextResponse(JSON.stringify({ type: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ⚡ Slash Commands Execution (Type 2)
    if (body.type === 2) {
      const commandName = body.data.name;
      if (commandName === 'assign') return NextResponse.json(await handleAssignCommand(body));
      if (commandName === 'unassign') return NextResponse.json(await handleUnassignCommand(body));
      if (commandName === 'transfer') return NextResponse.json(await handleTransferCommand(body));
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

      // 🔄 HANDLER TOMBOL PARSE TRANSFER
      if (customId.startsWith('btn_parse_')) {
        if (customId === 'btn_parse_CANCEL') {
          return NextResponse.json({
            type: 7, // UPDATE_MESSAGE
            data: { content: '❌ **Proses Auto-Parse Transfer Dibatalkan.**', embeds: [], components: [] },
          });
        }

        const parts = customId.split('_'); // btn_parse_{ACTION}_{TEAM}_{USERID}_{IGN}_{IDDL}
        const action = parts[2] as 'ADD' | 'OUT' | 'EDIT';
        const teamSlug = parts[3];
        const targetDiscordId = parts[4];
        const rawIgn = decodeURIComponent(parts[5] || '');
        const rawIdDl = parts[6] || '';

        // Ambil Data Username Discord dari API
        const userRes = await fetch(`https://discord.com/api/v10/users/${targetDiscordId}`, {
          headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
        }).then((r) => r.json()).catch(() => ({}));

        const targetUsername = userRes.username || targetDiscordId;

        try {
          if (action === 'OUT') {
            const res = await executeTransferOut(teamSlug, targetUsername);
            return NextResponse.json({
              type: 7,
              data: {
                content: `✅ **Auto-Parse OUT Berhasil!**\nPemain **${res.removedIgn}** resmi dikeluarkan dari tim **${res.teamName}**.`,
                embeds: [],
                components: [],
              },
            });
          }

          if (action === 'EDIT') {
            if (!rawIdDl) {
              return NextResponse.json({
                type: 4,
                data: { content: '❌ **Gagal Exec Edit!** ID Duel Links Baru tidak ditemukan pada teks.', flags: 64 },
              });
            }
            const res = await executeTransferEditDl(teamSlug, targetUsername, rawIdDl);
            return NextResponse.json({
              type: 7,
              data: {
                content: `✅ **Auto-Parse EDIT DL Berhasil!**\nID Duel Links **${res.ign}** diperbarui menjadi \`${res.newDl}\` (Sisa kuota: **${2 - res.currentQuota}**)`,
                embeds: [],
                components: [],
              },
            });
          }

          // DEFAULT ACTION: ADD
          if (!rawIgn || !rawIdDl) {
            return NextResponse.json({
              type: 4,
              data: {
                content: `❌ **Gagal Exec ADD!** Data IGN (\`${rawIgn || '-'}\`) atau ID DL (\`${rawIdDl || '-'}\`) kurang lengkap. Silakan gunakan \`/transfer add\` manual.`,
                flags: 64,
              },
            });
          }

          const res = await executeTransferAdd({
            teamSlug,
            targetDiscordId,
            targetUsername,
            ign: rawIgn,
            rawIdDl,
          });

          return NextResponse.json({
            type: 7,
            data: {
              content: `✅ **Auto-Parse ADD Berhasil!**\n• Pemain: **${res.addedIgn}** (\`${rawIdDl}\`)\n• Tim: **${res.teamName}**\nℹ️ Sisa kuota transfer tim: **${2 - res.currentQuota}**`,
              embeds: [],
              components: [],
            },
          });
        } catch (err: any) {
          return NextResponse.json({
            type: 4,
            data: { content: `❌ **Gagal Eksekusi:** ${err.message || 'Terjadi kesalahan'}`, flags: 64 },
          });
        }
      }

      if (customId === 'btn_view_full_log') {
        return await handleViewFullLog();
      }

      if (customId.startsWith('btn_bid_')) {
        if (Date.now() >= BID_DEADLINE_TIMESTAMP * 1000) {
          return NextResponse.json({
            type: 4,
            data: {
              content: '❌ **Bidding telah resmi ditutup!**',
              flags: 64,
            },
          });
        }

        const groupTarget = customId.replace('btn_bid_', '');
        const data = (await kv.get<BidStore>(KV_BID_KEY)) || { groupA: null, groupB: null };

        const currentA = data.groupA?.amount || 0;
        const currentB = data.groupB?.amount || 0;

        const minAmountA = currentA === 0 ? 110000 : currentA + 10000;
        const minAmountB = currentB === 0 ? 110000 : currentB + 10000;

        const minAmount = groupTarget === 'A' ? minAmountA : minAmountB;

        return NextResponse.json(getBidModal(groupTarget, minAmount));
      }

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

      if (customId.startsWith('btn_request_reschedule_')) {
        const matchId = customId.replace('btn_request_reschedule_', '');
        const suggestedDate = new Date();
        suggestedDate.setDate(suggestedDate.getDate() + 2);
        suggestedDate.setHours(20, 0, 0, 0);
        const suggestedIso = suggestedDate.toISOString();

        const formattedSuggestedWIB = suggestedDate.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Jakarta',
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

      if (customId.startsWith('btn_reject_reschedule_')) {
        return NextResponse.json({ type: 4, data: { content: '❌ **Pengajuan Reschedule Ditolak.**' } });
      }
    }

    // 🔎 Autocomplete Interactions (Type 4)
    if (body.type === 4) {
      if (body.data?.name === 'assign' || body.data?.name === 'unassign') {
        const autocompleteResponse = await handleAssignAutocomplete(body);
        return NextResponse.json(autocompleteResponse);
      }
      if (body.data?.name === 'transfer') {
        const autocompleteResponse = await handleTransferAutocomplete(body);
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
        
