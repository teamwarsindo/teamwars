import { NextResponse } from 'next/server';
import { executeAssignStaff, executeUnassignStaff } from '@/lib/discord/services/staff-assignment';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { matchId, action, unassignType, assignType, targetStaffId, scoreA, scoreB } = body;

    if (!matchId) {
      return NextResponse.json({ error: 'Match ID wajib diisi' }, { status: 400 });
    }

    if (action === 'UNASSIGN') {
      const type = unassignType || assignType || 'REFEREE';
      const result = await executeUnassignStaff({
        matchId,
        assignType: type,
        scoreA: scoreA !== undefined ? Number(scoreA) : 0,
        scoreB: scoreB !== undefined ? Number(scoreB) : 0,
      });
      return NextResponse.json({ success: true, message: `Unassign match ${matchId} berhasil!`, result });
    }

    if (action === 'ASSIGN' && targetStaffId) {
      const result = await executeAssignStaff({
        matchId,
        assignType: assignType || 'REFEREE',
        targetStaffId,
      });
      return NextResponse.json({ success: true, message: `Assign match ${matchId} berhasil!`, result });
    }

    return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 });
  } catch (error: any) {
    console.error('Error Syncing Match:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}