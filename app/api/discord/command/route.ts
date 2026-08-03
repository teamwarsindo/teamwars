import { NextResponse } from 'next/server';
import { discordAPI } from '@/lib/discord/utils';

export async function GET(req: Request) {
  const appId = process.env.DISCORD_CLIENT_ID; 
  if (!appId) return NextResponse.json({ error: 'Missing Client ID' }, { status: 500 });

  // ==========================================
  // REGISTER SLASH COMMANDS (PUT Overwrite)
  // ==========================================
  const commands = [
    {
      name: 'reminder',
      description: 'Kirim pengingat aturan submit deck di channel tim.',
    },
    {
      name: 'info',
      description: 'Lihat informasi profil Discord kamu atau pemain lain',
      options: [
        {
          type: 6, // USER
          name: 'target',
          description: 'Pilih user yang ingin dilihat infonya (kosongkan untuk diri sendiri)',
          required: false,
        }
      ]
    },
    {
      name: 'cek-id',
      description: 'Cek pemilik ID Game di database TWI',
      options: [
        {
          type: 3, // STRING Choice
          name: 'game',
          description: 'Pilih jenis game',
          required: true,
          choices: [
            { name: 'Duel Links', value: 'dl' },
            { name: 'Master Duel', value: 'md' },
          ],
        },
        {
          type: 3, // STRING Input
          name: 'id',
          description: 'Masukkan angka ID Game (Contoh: 168-256-618 atau 168256618)',
          required: true,
        },
      ],
    },
    {
      name: 'blacklist',
      description: '[ADMIN] Kelola ID Duel Links yang di-blacklist',
      options: [
        {
          type: 3, // STRING Choice
          name: 'action',
          description: 'Pilih aksi yang ingin dilakukan',
          required: true,
          choices: [
            { name: 'Tambah ke Blacklist (Add)', value: 'add' },
            { name: 'Hapus dari Blacklist (Remove)', value: 'remove' },
            { name: 'Lihat Semua Blacklist (List)', value: 'list' },
          ],
        },
        {
          type: 3, // STRING Input
          name: 'id',
          description: 'Masukkan angka ID Duel Links (Wajib untuk Add/Remove)',
          required: false,
        },
      ],
    },
    {
      name: 'cek-roster',
      description: '[REFEREE] Cek roster tim berdasarkan Tag Role Tim Discord (Privat)',
      options: [
        {
          type: 8, // ROLE
          name: 'team1',
          description: 'Tag Role Tim Pertama (Contoh: @Team A)',
          required: true,
        },
        {
          type: 8, // ROLE
          name: 'team2',
          description: 'Tag Role Tim Kedua (Opsional)',
          required: false,
        },
      ],
    },
    {
      name: 'cancel-bid',
      description: '[ADMIN] Batal/Anulir bid tertinggi group tertentu',
      options: [
        {
          type: 3, // STRING Choice
          name: 'group',
          description: 'Pilih Group yang ingin dibatalkan bid-nya',
          required: true,
          choices: [
            { name: 'Group A', value: 'A' },
            { name: 'Group B', value: 'B' },
          ],
        },
        {
          type: 3, // STRING Input
          name: 'alasan',
          description: 'Alasan pembatalan (Contoh: Nama SARA / Bid Tidak Wajar)',
          required: false,
        },
      ],
    },
  ];

  const slashResult = await discordAPI(`/applications/${appId}/commands`, 'PUT', commands);

  if (slashResult) {
    return NextResponse.json({ 
      message: '✅ Setup Slash Commands Berhasil Dijalankan!', 
      commands: slashResult
    });
  } else {
    return NextResponse.json({ error: '❌ Gagal mendaftarkan commands' }, { status: 500 });
  }
}
