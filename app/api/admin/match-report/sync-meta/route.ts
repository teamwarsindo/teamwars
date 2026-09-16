import { NextRequest, NextResponse } from 'next/server';
import { syncCustomDeckAndSkillToMaster } from '@/lib/discord/commands/submit/master-sync';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { deck, skill } = await req.json();
    const result = await syncCustomDeckAndSkillToMaster(deck, skill);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
                             }
