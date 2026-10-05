import { NextResponse } from 'next/server';
import { isDiscordAuthorized } from './assign/helpers';
import { executeManageStaff } from './staff/execute';

export async function handleStaffCommand(body: any) {
  try {
    if (!isDiscordAuthorized(body)) {
      return NextResponse.json({
        type: 4,
        data: { content: '❌ Akses Ditolak! Khusus Admin/Chief.', flags: 64 },
      });
    }

    const opts = body.data?.options || [];
    const action = opts.find((o: any) => o.name === 'action')?.value as 'ADD' | 'REMOVE';
    const staffType = opts.find((o: any) => o.name === 'type')?.value as 'REFEREE' | 'STREAMER';
    const targetUserId = opts.find((o: any) => o.name === 'user')?.value;
    const targetStaffId = opts.find((o: any) => o.name === 'target_staff')?.value;
    const customName = opts.find((o: any) => o.name === 'name')?.value;

    if (!action || !staffType) {
      return NextResponse.json({
        type: 4,
        data: { content: '❌ Option `action` dan `type` wajib diisi!', flags: 64 },
      });
    }

    if (action === 'ADD' && !targetUserId) {
      return NextResponse.json({
        type: 4,
        data: { content: '❌ Option `user` wajib dipilih saat menambah staf!', flags: 64 },
      });
    }

    if (action === 'REMOVE' && !targetStaffId && !targetUserId) {
      return NextResponse.json({
        type: 4,
        data: { content: '❌ Pilih staf target yang ingin dikeluarkan!', flags: 64 },
      });
    }

    const resolvedUser = targetUserId ? body.data?.resolved?.users?.[targetUserId] : undefined;
    const discordName =
      customName?.trim() ||
      resolvedUser?.global_name ||
      resolvedUser?.username ||
      'Staff Member';

    const result = await executeManageStaff({
      action,
      staffType,
      targetDiscordId: action === 'ADD' ? targetUserId : (targetStaffId || targetUserId),
      discordName,
    });

    return NextResponse.json({
      type: 4,
      data: { content: result.message, flags: 64 },
    });
  } catch (error: any) {
    console.error('Error handling /staff command:', error);
    return NextResponse.json({
      type: 4,
      data: { content: `❌ ${error.message || 'Gagal memproses manajemen staf'}`, flags: 64 },
    });
  }
      }
