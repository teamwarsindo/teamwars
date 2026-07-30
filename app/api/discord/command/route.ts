import { NextResponse } from 'next/server';
import { discordAPI } from '@/lib/discord/utils';

export async function GET(req: Request) {
  const appId = process.env.DISCORD_CLIENT_ID; 
  if (!appId) return NextResponse.json({ error: 'Missing Client ID' }, { status: 500 });

  // ==========================================
  // 1. REGISTER SLASH COMMANDS (Overwrite)
  // ==========================================
  const commands = [
    {
      name: 'reminder',
      description: 'Kirim pengingat aturan submit deck di channel tim.',
    },
    {
      name: 'prepare',
      description: 'Kirim briefing in-game dan info Room ID di channel match.',
    },
    {
      name: 'info',
      description: 'Lihat informasi profil Discord kamu atau pemain lain',
      options: [
        {
          type: 6, // Type 6 adalah USER
          name: 'target',
          description: 'Pilih user yang ingin dilihat infonya (kosongkan untuk diri sendiri)',
          required: false,
        }
      ]
    },
    {
      name: 'timer',
      description: 'Tampilkan Panel Timer Kontrol Waktu Match TWI S7',
    },
    // 👇 COMMAND CEK ID BARU 👇
    {
      name: 'cek-id',
      description: 'Cek pemilik ID Game di database TWI',
      options: [
        {
          type: 3, // Type 3 = STRING (Sub-Choice)
          name: 'game',
          description: 'Pilih jenis game',
          required: true,
          choices: [
            { name: 'Duel Links', value: 'dl' },
            { name: 'Master Duel', value: 'md' },
          ],
        },
        {
          type: 3, // Type 3 = STRING (Input)
          name: 'id',
          description: 'Masukkan angka ID Game (Contoh: 305-348-162 atau 305348162)',
          required: true,
        },
      ],
    },
  ];

  const slashResult = await discordAPI(`/applications/${appId}/commands`, 'PUT', commands);

  if (slashResult) {
    return NextResponse.json({ 
      message: '✅ Setup Berhasil Dijalankan!', 
      commands: slashResult
    });
  } else {
    return NextResponse.json({ error: '❌ Gagal mendaftarkan commands' }, { status: 500 });
  }
            }
