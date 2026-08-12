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

    // 🔴 2. UNASSIGN COMMAND
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

    // 🔄 11. TRANSFER COMMAND (Refactored Subcommands)
    {
      name: 'transfer',
      description: 'Kelola transfer, penambahan, dan pembaruan roster tim',
      options: [
        // SUBCOMMAND 1: OUT
        {
          type: 1, // SUB_COMMAND
          name: 'out',
          description: 'Keluarkan pemain dari roster tim',
          options: [
            {
              type: 3, // STRING
              name: 'team',
              description: 'Pilih tim target (Wajib diisi jika dijalankan oleh Admin)',
              required: false,
              autocomplete: true,
            },
            {
              type: 3, // STRING
              name: 'user',
              description: 'Pilih nama/IGN pemain yang ingin dikeluarkan dari tim',
              required: true,
              autocomplete: true,
            },
          ],
        },
        // SUBCOMMAND 2: ADD
        {
          type: 1, // SUB_COMMAND
          name: 'add',
          description: 'Tambahkan pemain baru ke dalam roster tim',
          options: [
            {
              type: 3, // STRING
              name: 'team',
              description: 'Pilih tim tujuan (Wajib diisi jika dijalankan oleh Admin)',
              required: false,
              autocomplete: true,
            },
            {
              type: 6, // USER (Mention)
              name: 'user',
              description: 'Tag (@mention) akun Discord pemain baru',
              required: true,
            },
            {
              type: 3, // STRING
              name: 'ign',
              description: 'Ketik In-Game Name (IGN) Duel Links pemain baru',
              required: true,
            },
            {
              type: 3, // STRING
              name: 'id_dl',
              description: 'Ketik 9 digit ID Duel Links pemain (contoh: 123456789)',
              required: true,
            },
          ],
        },
        // SUBCOMMAND 3: EDIT
        {
          type: 1, // SUB_COMMAND
          name: 'edit',
          description: 'Perbarui ID Duel Links atau Jabatan (Ketua/Wakil) pemain',
          options: [
            {
              type: 3, // STRING
              name: 'team',
              description: 'Pilih tim target (Opsional jika pemain sudah terdeteksi di tim)',
              required: false,
              autocomplete: true,
            },
            {
              type: 3, // STRING
              name: 'user',
              description: 'Pilih nama/IGN pemain yang data/jabatannya ingin diubah',
              required: true,
              autocomplete: true,
            },
            {
              type: 3, // STRING
              name: 'new_id_dl',
              description: 'Ketik ID Duel Links baru (kosongkan jika tidak mengubah ID)',
              required: false,
            },
            {
              type: 3, // STRING
              name: 'position',
              description: 'Pilih posisi baru (Ketua khusus Admin, Wakil bisa oleh Ketua)',
              required: false,
              choices: [
                { name: 'Ketua (Khusus Admin)', value: 'Ketua' },
                { name: 'Wakil Ketua', value: 'Wakil Ketua' },
              ],
            },
          ],
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