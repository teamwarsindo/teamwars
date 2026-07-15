import { NextResponse } from 'next/server';
import { discordAPI } from '@/lib/discord/utils';

export async function GET(req: Request) {
  // Opsi: Tambahkan secret query params biar ga bisa diakses sembarang orang
  // const { searchParams } = new URL(req.url);
  // if (searchParams.get('secret') !== 'passwordrahasia123') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const appId = process.env.DISCORD_CLIENT_ID; // Pastikan ini ada di .env (Application ID)
  if (!appId) return NextResponse.json({ error: 'Missing Client ID' }, { status: 500 });

  const commands = [
    {
      name: 'check',
      description: 'Mengecek status dan daftar roster tim di database TWI',
    },
    {
      name: 'reminder',
      description: 'Mengatur pengingat jadwal pertandingan',
    },
    {
      name: 'prepare',
      description: 'Mempersiapkan line-up dan strategi pertandingan',
    }
  ];

  // Gunakan metode PUT untuk overwrite (Replace seluruh command)
  const result = await discordAPI(`/applications/${appId}/commands`, 'PUT', commands);

  if (result) {
    return NextResponse.json({ message: '✅ Slash Commands berhasil diregister!', commands: result });
  } else {
    return NextResponse.json({ error: '❌ Gagal mendaftarkan commands' }, { status: 500 });
  }
}
