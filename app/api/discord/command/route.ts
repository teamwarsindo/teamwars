import { NextResponse } from 'next/server';
import { discordAPI } from '@/lib/discord/utils';

export async function GET(req: Request) {
  const appId = process.env.DISCORD_CLIENT_ID; 
  if (!appId) return NextResponse.json({ error: 'Missing Client ID' }, { status: 500 });

  const commands = [
    // 🟢 1. ASSIGN COMMAND
    {
      name: 'assign',
      description: 'Tugaskan Referee atau Streamer ke Pertandingan (Chief/Admin)',
      options: [
        {
          type: 3,
          name: 'match',
          description: 'Pilih pertandingan pada Week Aktif',
          required: true,
          autocomplete: true,
        },
        {
          type: 3,
          name: 'type',
          description: 'Pilih peran penugasan',
          required: true,
          choices: [
            { name: '⚖️ Referee', value: 'REFEREE' },
            { name: '🎥 Streamer', value: 'STREAMER' },
          ],
        },
        {
          type: 3,
          name: 'user',
          description: 'Pilih nama staf (terfilter sesuai role)',
          required: true,
          autocomplete: true,
        },
      ],
    },

    // 🔴 2. UNASSIGN COMMAND (SKOR OPSIONAL UNTUK STREAMER)
    {
      name: 'unassign',
      description: 'Selesaikan penugasan Referee/Streamer (Chief/Admin)',
      options: [
        {
          type: 3,
          name: 'match',
          description: 'Pilih pertandingan yang selesai',
          required: true,
          autocomplete: true,
        },
        {
          type: 3,
          name: 'type',
          description: 'Pilih peran yang selesai',
          required: true,
          choices: [
            { name: '⚖️ Referee (Wajib isi Skor)', value: 'REFEREE' },
            { name: '🎥 Streamer (Opsional Skor)', value: 'STREAMER' },
          ],
        },
        {
          type: 4, // INTEGER
          name: 'score_a',
          description: 'Masukkan Skor Tim A (Wajib untuk Referee)',
          required: false,
        },
        {
          type: 4, // INTEGER
          name: 'score_b',
          description: 'Masukkan Skor Tim B (Wajib untuk Referee)',
          required: false,
        },
      ],
    },

    // 📣 3. REMINDER COMMAND
    {
      name: 'reminder',
      description: 'Kirim pengingat aturan submit deck di channel tim.',
    },

    // 📋 4. PREPARE COMMAND
    {
      name: 'prepare',
      description: 'Kirim briefing in-game dan info Room ID di channel match.',
    },

    // ℹ️ 5. INFO COMMAND
    {
      name: 'info',
      description: 'Lihat informasi profil Discord kamu atau pemain lain',
      options: [
        {
          type: 6,
          name: 'target',
          description: 'Pilih user yang ingin dilihat infonya (kosongkan untuk diri sendiri)',
          required: false,
        },
      ],
    },

    // ⏱️ 6. TIMER COMMAND
    {
      name: 'timer',
      description: 'Tampilkan Panel Timer Kontrol Waktu Match TWI S7',
    },

    // 🔍 7. CEK ID COMMAND
    {
      name: 'cek-id',
      description: 'Cek pemilik ID Game di database TWI',
      options: [
        {
          type: 3,
          name: 'game',
          description: 'Pilih jenis game',
          required: true,
          choices: [
            { name: 'Duel Links', value: 'dl' },
            { name: 'Master Duel', value: 'md' },
          ],
        },
        {
          type: 3,
          name: 'id',
          description: 'Masukkan angka ID Game',
          required: true,
        },
      ],
    },

    // ⛔ 8. BLACKLIST COMMAND
    {
      name: 'blacklist',
      description: '[ADMIN] Kelola ID Duel Links yang di-blacklist',
      options: [
        {
          type: 3,
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
          type: 3,
          name: 'id',
          description: 'Masukkan angka ID Duel Links',
          required: false,
        },
      ],
    },

    // 👥 9. CEK ROSTER COMMAND
    {
      name: 'cek-roster',
      description: '[REFEREE] Cek roster tim berdasarkan Tag Role Tim Discord (Privat)',
      options: [
        {
          type: 8,
          name: 'team1',
          description: 'Tag Role Tim Pertama',
          required: true,
        },
        {
          type: 8,
          name: 'team2',
          description: 'Tag Role Tim Kedua',
          required: false,
        },
      ],
    },

    // 🚫 10. CANCEL BID COMMAND
    {
      name: 'cancel-bid',
      description: '[ADMIN] Batal/Anulir bid tertinggi group tertentu',
      options: [
        {
          type: 3,
          name: 'group',
          description: 'Pilih Group yang ingin dibatalkan bid-nya',
          required: true,
          choices: [
            { name: 'Group A', value: 'A' },
            { name: 'Group B', value: 'B' },
          ],
        },
        {
          type: 3,
          name: 'alasan',
          description: 'Alasan pembatalan',
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
