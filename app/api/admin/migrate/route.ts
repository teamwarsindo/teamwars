import { NextResponse } from 'next/server';
import { migrateDiscordAccount } from '@/lib/discord/migrate-member';

export async function GET() {
  const OLD_ID = '296917520655581184';
  const NEW_ID = '1551180553984671820';

  const result = await migrateDiscordAccount(OLD_ID, NEW_ID);

  if (!result.success) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result, { status: 200 });
}
