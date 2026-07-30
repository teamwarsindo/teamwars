import { NextRequest, NextResponse } from 'next/server';
import { verifySignature } from '@/lib/discord/utils';

// Import Slash Commands
import { handleReminder } from '@/lib/discord/commands/reminder';
import { handlePrepare } from '@/lib/discord/commands/prepare';
import { handleInfo } from '@/lib/discord/commands/info';
import { handleTimerCommand } from '@/lib/discord/commands/timer';
import { handleCekId } from '@/lib/discord/commands/cek-id-dl';
import { handleBlacklistCommand } from '@/lib/discord/commands/blacklist';
import { handleCekRoster } from '@/lib/discord/commands/cek-roster';

// Import Button Handlers
import { handleBtVerified } from '@/lib/discord/buttons/btVerified';
import { handleBtRole } from '@/lib/discord/buttons/btRole';
import { handleBtEditTeam } from '@/lib/discord/buttons/btEditTeam';
import { handleBtTimer } from '@/lib/discord/buttons/handleBtTimer';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-signature-ed25519');
    const timestamp = req.headers.get('x-signature-timestamp');

    // 🛡️ 1. Verifikasi Signature Discord
    if (!verifySignature(rawBody, signature, timestamp)) {
      return new NextResponse('Akses Ditolak', { status: 401 });
    }

    const body = JSON.parse(rawBody);

    // 🏓 2. Ping Interaction (Type 1)
    if (body.type === 1) {
      return NextResponse.json({ type: 1 });
    }

    // ⚡ 3. Routing Slash Commands (Type 2)
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

    // 🔘 4. Routing Button Interactions (Type 3)
    if (body.type === 3) {
      const customId = body.data.custom_id;

      if (customId === 'bt_verified') return await handleBtVerified(body);
      if (customId === 'bt_role') return await handleBtRole(body);
      if (customId === 'btn_edit_team') return await handleBtEditTeam(body);
      
      if (customId === 'toggle_timer_teamA' || customId === 'toggle_timer_teamB') {
        return await handleBtTimer(body);
      }
    }

    return new NextResponse('Unknown Interaction', { status: 400 });

  } catch (error) {
    console.error('Error Webhook DC:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
  
