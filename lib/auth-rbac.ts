import { cookies } from 'next/headers';
import { kv } from '@vercel/kv';
import { AdminRole, AdminUser } from '@/lib/types/tournament';

const KV_KEY_ADMINS = 'twi:admin_users';

export async function getCurrentAdminRole(): Promise<AdminRole | null> {
  const cookieStore = await cookies();
  const sessionUser = cookieStore.get('admin_session')?.value;

  if (!sessionUser) return null;

  // 1. Fallback untuk ENV Basic Auth Super Admin
  const envSuperUser = (process.env.BASIC_AUTH_USER || 'admin').toLowerCase().trim();
  if (sessionUser.toLowerCase().trim() === envSuperUser || sessionUser === 'authenticated') {
    return 'SUPER_ADMIN';
  }

  // 2. Cek di daftar Admin DB
  const admins = (await kv.get<AdminUser[]>(KV_KEY_ADMINS)) || [];
  const found = admins.find((u) => u.username.toLowerCase() === sessionUser.toLowerCase());

  return found ? found.role : null;
}

export async function hasAdminPermission(requiredRoles: AdminRole[]): Promise<boolean> {
  const currentRole = await getCurrentAdminRole();
  if (!currentRole) return false;
  if (currentRole === 'SUPER_ADMIN') return true; // Super Admin memiliki akses penuh
  return requiredRoles.includes(currentRole);
}
