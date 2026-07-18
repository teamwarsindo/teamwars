import { NextRequest, NextResponse } from 'next/server';
import { verifySignature } from '@/lib/discord/utils';

// Import Commands
import { handleCheck } from '@/lib/discord/commands/check';
import { handleReminder } from '@/lib/discord/commands/reminder';
import { handlePrepare } from '@/lib/discord/commands/prepare';

// Import Buttons
import { handleBtVerified } from '@/lib/discord/buttons/btVerified';
import { handleBtRole } from '@/lib/discord/buttons/btRole';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-signature-ed25519');
    const timestamp = req.headers.get('x-signature-timestamp');

    // 1. Verifikasi Keamanan
    if (!verifySignature(rawBody, signature, timestamp)) {
      return new NextResponse('Akses Ditolak', { status: 401 });
    }

    const body = JSON.parse(rawBody);

    // 2. Ping dari Discord (Setup)
    if (body.type === 1) return NextResponse.json({ type: 1 });

    // 3. Routing Slash Commands (Type 2)
    if (body.type === 2) {
      const commandName = body.data.name;
      if (commandName === 'check') return await handleCheck(body);
      if (commandName === 'reminder') return await handleReminder(body);
      if (commandName === 'prepare') return await handlePrepare(body);
    }

    // 4. Routing Button Clicks (Type 3)
    if (body.type === 3) {
      const customId = body.data.custom_id;
      if (customId === 'bt_verified') return await handleBtVerified(body);
      if (customId === 'bt_role') return await handleBtRole(body);
    }

    return new NextResponse('Unknown Interaction', { status: 400 });
  } catch (error) {
    console.error('Error Webhook DC:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
