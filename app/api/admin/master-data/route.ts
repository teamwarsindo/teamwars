import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { hasAdminPermission } from '@/lib/auth-rbac';
import { MasterData, AdminUser } from '@/lib/types/tournament';

const KV_KEY_MASTER = 'twi:master_data';
const KV_KEY_ADMINS = 'twi:admin_users';

const DEFAULT_MASTER: MasterData = {
  referees: ['vG®D WHY', 'Levi Ghost', 'Xenon', 'Rexia'],
  streamers: ['Alroy_Yuan', 'TWI Official Stream'],
  decks: ['Blue-Eyes', 'Mayakashi', 'Tenyi', 'Shaddoll', 'Yubel', 'Constellar', 'Shiranui', 'Rokket', 'S-force', 'Photon', 'LiveTwin', 'Altergeist'],
  skills: ['TSM', 'BC', 'TLOTH', 'L5R', 'EB', 'PDA', 'SWP', 'CU', 'SSS', 'MOP', 'MS', 'BL'],
  streamPlatforms: ['Youtube', 'Twitch', 'TikTok'],
};

export async function GET() {
  try {
    const masterData = (await kv.get<MasterData>(KV_KEY_MASTER)) || DEFAULT_MASTER;
    const isSuperAdmin = await hasAdminPermission(['SUPER_ADMIN']);
    const adminUsers = isSuperAdmin ? (await kv.get<AdminUser[]>(KV_KEY_ADMINS)) || [] : [];

    return NextResponse.json({ success: true, masterData, adminUsers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const canMutate = await hasAdminPermission(['SUPER_ADMIN']);
    if (!canMutate) {
      return NextResponse.json({ error: 'Akses ditolak. Khusus Super Admin.' }, { status: 403 });
    }

    const { type, masterData, adminUser, deleteUsername } = await req.json();

    if (type === 'UPDATE_MASTER') {
      await kv.set(KV_KEY_MASTER, masterData);
      return NextResponse.json({ success: true, masterData });
    }

    if (type === 'ADD_ADMIN') {
      const admins = (await kv.get<AdminUser[]>(KV_KEY_ADMINS)) || [];
      const updated = [...admins.filter((u) => u.username !== adminUser.username), adminUser];
      await kv.set(KV_KEY_ADMINS, updated);
      return NextResponse.json({ success: true, adminUsers: updated });
    }

    if (type === 'REMOVE_ADMIN') {
      const admins = (await kv.get<AdminUser[]>(KV_KEY_ADMINS)) || [];
      const updated = admins.filter((u) => u.username !== deleteUsername);
      await kv.set(KV_KEY_ADMINS, updated);
      return NextResponse.json({ success: true, adminUsers: updated });
    }

    return NextResponse.json({ error: 'Tipe perintah tidak dikenali.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
