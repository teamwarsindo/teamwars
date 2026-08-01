import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { verifySignature } from '@/lib/discord/utils';

// Slash Commands
import { handleReminder } from '@/lib/discord/commands/reminder';
import { handlePrepare } from '@/lib/discord/commands/prepare';
import { handleInfo } from '@/lib/discord/commands/info';
import { handleTimerCommand } from '@/lib/discord/commands/timer';
import { handleCekId } from '@/lib/discord/commands/cek-id-dl';
import { handleBlacklistCommand } from '@/lib/discord/commands/blacklist';
import { handleCekRoster } from '@/lib/discord/commands/cek-roster';

// Button Handlers
import { handleBtVerified } from '@/lib/discord/buttons/btVerified';
import { handleBtRole } from '@/lib/discord/buttons/btRole';
import { handleBtEditTeam } from '@/lib/discord/buttons/btEditTeam';
import { handleBtTimer } from '@/lib/discord/buttons/handleBtTimer';

// Bidding Module
import { getBidModal } from '@/lib/discord/buttons/bidding';
import { processBidSubmission, KV_BID_KEY, BidStore } from '@/lib/discord/bidding';

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

      // 🏆 Handler Tombol Bidding (Menampilkan Modal Form dengan Min Nominal Dinamis)
      if (customId.startsWith('btn_bid_')) {
        const groupTarget = customId.replace('btn_bid_', '');

        const data = (await kv.get<BidStore>(KV_BID_KEY)) || { groupA: null, groupB: null };

        const currentA = data.groupA?.amount || 0;
        const currentB = data.groupB?.amount || 0;

        const minAmountA = currentA === 0 ? 110000 : currentA + 10000;
        const minAmountB = currentB === 0 ? 110000 : currentB + 10000;

        return NextResponse.json(getBidModal(groupTarget, minAmountA, minAmountB));
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
