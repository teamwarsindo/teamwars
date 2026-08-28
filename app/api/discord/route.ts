import { NextResponse } from 'next/server';
import { discordAPI } from '@/lib/discord/utils';

export async function GET(req: Request) {
  const appId = process.env.DISCORD_CLIENT_ID;
  if (!appId) {
    return NextResponse.json(
      { error: 'Missing Client ID in Environment Variables' },
      { status: 500 }
    );
  }

  const commands = [
    // 🟢 1. ASSIGN COMMAND
    {
      name: 'assign',
      description: 'Tugaskan Referee atau Streamer ke jadwal pertandingan',
      options: [
        {
          type: 3, // STRING
          name: 'match',
          description: 'Pilih pertandingan',
          required: true,
          autocomplete: true,
        },
        {
          type: 3, // STRING
          name: 'type',
          description: 'Pilih peran penugasan staf',
          required: true,
          choices: [
            { name: '⚖️ Referee (Wasit Pertandingan)', value: 'REFEREE' },
            { name: '🎥 Streamer (Kreator)', value: 'STREAMER' },
          ],
        },
        {
          type: 3, // STRING
          name: 'user',
          description: 'Pilih staf yang ditugaskan',
          required: true,
          autocomplete: true,
        },
      ],
    },

    // 🔴 2. UNASSIGN COMMAND (MATCH SELESAI)
    {
      name: 'unassign',
      description: 'Konfirmasi penyelesaian tugas staf dan rekap hasil pertandingan',
      options: [
        {
          type: 3, // STRING
          name: 'match',
          description: 'Pilih pertandingan yang telah selesai',
          required: true,
          autocomplete: true,
        },
        {
          type: 3, // STRING
          name: 'type',
          description: 'Pilih peran staf yang menyelesaikan tugas',
          required: true,
          choices: [
            { name: '⚖️ Referee (Wajib menyertakan hasil pertandingan)', value: 'REFEREE' },
            { name: '🎥 Streamer', value: 'STREAMER' },
          ],
        },
        {
          type: 4, // INTEGER
          name: 'score_a',
          description: 'Skor akhir Tim Kiri (Wajib diisi jika peran Referee)',
          required: false,
        },
        {
          type: 4, // INTEGER
          name: 'score_b',
          description: 'Skor akhir Tim Kanan (Wajib diisi jika peran Referee)',
          required: false,
        },
      ],
    },

    // ❌ 3. CANCEL ASSIGN COMMAND
    {
      name: 'cancel-assign',
      description: 'Batalkan penugasan staf pertandingan yang berhalangan hadir',
      options: [
        {
          type: 3, // STRING
          name: 'match',
          description: 'Pilih pertandingan',
          required: true,
          autocomplete: true,
        },
        {
          type: 3, // STRING
          name: 'type',
          description: 'Pilih peran penugasan yang dibatalkan',
          required: true,
          choices: [
            { name: '⚖️ Referee', value: 'REFEREE' },
            { name: '🎥 Streamer', value: 'STREAMER' },
          ],
        },
        {
          type: 3, // STRING
          name: 'reason',
          description: 'Alasan pembatalan penugasan secara jelas',
          required: true,
        },
      ],
    },

    // 📅 4. RESCHEDULE COMMAND
    {
      name: 'reschedule',
      description: 'Perbarui jadwal (hari dan/ jam) pertandingan di channel match',
      options: [
        {
          type: 3, // STRING
          name: 'tanggal',
          description: 'Pilih tanggal bertanding (Rabu s/d Minggu)',
          required: false,
          autocomplete: true,
        },
        {
          type: 3, // STRING
          name: 'jam',
          description: 'Waktu pertandingan dalam format 24 Jam (Contoh: 20.00, 20:30, 21.00)',
          required: false,
        },
        {
          type: 5, // BOOLEAN
          name: 'update_recap',
          description: 'Perbarui rekap jadwal pertandingan',
          required: false,
        },
      ],
    },

    // 👥 5. CEK ROSTER COMMAND
    {
      name: 'cek-roster',
      description: 'Periksa daftar roster tim',
      options: [
        {
          type: 8, // ROLE
          name: 'team1',
          description: 'Pilih tim untuk dicek',
          required: true,
        },
        {
          type: 8, // ROLE
          name: 'team2',
          description: 'Pilih tim lain untuk dicek (Opsional)',
          required: false,
        },
      ],
    },

    // 🔍 6. CEK ID COMMAND
    {
      name: 'cek-id',
      description: 'Verifikasi kepemilikan ID DL/ ID MD di database Team Wars Indonesia',
      options: [
        {
          type: 3, // STRING
          name: 'game',
          description: 'Pilih kategori game yang ingin diperiksa',
          required: true,
          choices: [
            { name: 'Yu-Gi-Oh! Duel Links', value: 'dl' },
            { name: 'Yu-Gi-Oh! Master Duel', value: 'md' },
          ],
        },
        {
          type: 3, // STRING
          name: 'id',
          description: 'Masukkan nomor ID DL/ ID MD',
          required: true,
        },
      ],
    },

    // ℹ️ 7. INFO COMMAND
    {
      name: 'info',
      description: 'Tampilkan rincian data profil peserta Team Wars Indonesia',
      options: [
        {
          type: 6, // USER
          name: 'target',
          description: 'Pilih pemain lain (Kosongkan untuk memeriksa profil diri sendiri)',
          required: false,
        },
      ],
    },

    // ⛔ 8. BLACKLIST COMMAND
    {
      name: 'blacklist',
      description: 'Kelola basis data larangan bermain (Blacklist Game ID)',
      options: [
        {
          type: 3, // STRING
          name: 'action',
          description: 'Pilih operasi pengelolaan blacklist',
          required: true,
          choices: [
            { name: '➕ Tambah ke Blacklist (Add)', value: 'add' },
            { name: '➖ Hapus dari Blacklist (Remove)', value: 'remove' },
            { name: '📋 Tampilkan Seluruh Blacklist (List)', value: 'list' },
          ],
        },
        {
          type: 3, // STRING
          name: 'id',
          description: 'Masukkan Duel Links ID (Diperlukan untuk opsi Add / Remove)',
          required: false,
        },
      ],
    },

    // 🚫 9. CANCEL BID COMMAND
    {
      name: 'cancel-bid',
      description: '[ADMIN] Anulir penawaran (bid) tertinggi pada divisi tertentu',
      options: [
        {
          type: 3, // STRING
          name: 'group',
          description: 'Pilih divisi sasaran',
          required: true,
          choices: [
            { name: 'Divisi Group A', value: 'A' },
            { name: 'Divisi Group B', value: 'B' },
          ],
        },
        {
          type: 3, // STRING
          name: 'alasan',
          description: 'Uraikan dasar pembatalan penawaran',
          required: false,
        },
      ],
    },

    // 🔄 10. TRANSFER COMMAND
    {
      name: 'transfer',
      description: '[ROSTER] Pengelolaan bursa transfer, pendaftaran, dan mutasi pemain tim',
      options: [
        {
          type: 1, // SUB_COMMAND
          name: 'out',
          description: 'Keluarkan peserta dari komposisi roster tim aktif',
          options: [
            {
              type: 3, // STRING
              name: 'user',
              description: 'Pilih nama peserta yang akan dilepas dari tim',
              required: true,
              autocomplete: true,
            },
            {
              type: 3, // STRING
              name: 'team',
              description: 'Pilih nama tim target (Wajib ditentukan oleh Admin)',
              required: false,
              autocomplete: true,
            },
          ],
        },
        {
          type: 1, // SUB_COMMAND
          name: 'add',
          description: 'Daftarkan peserta baru ke dalam komposisi roster tim',
          options: [
            {
              type: 6, // USER
              name: 'user',
              description: 'Sebut (@mention) akun Discord peserta baru',
              required: true,
            },
            {
              type: 3, // STRING
              name: 'ign',
              description: 'Nama in-game resmi (IGN Duel Links) peserta',
              required: true,
            },
            {
              type: 3, // STRING
              name: 'id_dl',
              description: 'Nomor identifikasi 9 digit Duel Links ID',
              required: true,
            },
            {
              type: 3, // STRING
              name: 'team',
              description: 'Pilih tim tujuan registrasi (Wajib ditentukan oleh Admin)',
              required: false,
              autocomplete: true,
            },
          ],
        },
        {
          type: 1, // SUB_COMMAND
          name: 'edit',
          description: 'Perbarui Game ID atau struktur kepengurusan (Ketua/Wakil) pemain',
          options: [
            {
              type: 3, // STRING
              name: 'user',
              description: 'Pilih nama peserta yang datanya akan disesuaikan',
              required: true,
              autocomplete: true,
            },
            {
              type: 3, // STRING
              name: 'new_id_dl',
              description: 'Duel Links ID baru (Kosongkan jika hanya mengubah jabatan)',
              required: false,
            },
            {
              type: 3, // STRING
              name: 'position',
              description: 'Pilih penetapan jabatan struktural baru',
              required: false,
              choices: [
                { name: 'Ketua Tim (Khusus Admin)', value: 'Ketua' },
                { name: 'Wakil Ketua Tim', value: 'Wakil Ketua' },
              ],
            },
            {
              type: 3, // STRING
              name: 'team',
              description: 'Pilih tim peserta terkait (Opsional jika data tim terdeteksi)',
              required: false,
              autocomplete: true,
            },
          ],
        },
        {
          type: 1, // SUB_COMMAND
          name: 'parse',
          description: '[ADMIN] Pemrosesan otomatis berdasarkan salinan format pesan registrasi',
          options: [
            {
              type: 3, // STRING
              name: 'text',
              description: 'Tempelkan seluruh isi pesan permohonan transfer',
              required: true,
            },
            {
              type: 6, // USER
              name: 'user',
              description: 'Sebut (@mention) akun Discord peserta target',
              required: true,
            },
            {
              type: 3, // STRING
              name: 'team',
              description: 'Pilih tim target yang bersangkutan',
              required: false,
              autocomplete: true,
            },
          ],
        },
      ],
    },

    // 📊 11. MATCH REPORT FORWARD COMMAND
    {
      name: 'match-report',
      description: '[CAMP] Teruskan match report resmi ke channel camp ini',
      options: [
        {
          type: 3, // STRING
          name: 'team',
          description: 'Pilih nama tim untuk melihat daftar match report',
          required: true,
          autocomplete: true,
        },
      ],
    },

    // 🎥 12. STREAM COMMAND
    {
      name: 'stream',
      description: '[STREAMER] Masukkan link siaran langsung pertandingan ini dan kirim broadcast',
      options: [
        {
          type: 3, // STRING
          name: 'link',
          description: 'Masukkan URL siaran langsung (YouTube, TikTok, Twitch, dsb.)',
          required: true,
        },
      ],
    },

    // 🗃️ 13. SUBMIT COMMAND (REVISI BARU)
    {
      name: 'submit',
      description: '[STAFF] Rekapitulasi pengumpulan deck pemain tim di channel camp',
      options: [
        {
          type: 3, // STRING
          name: 'pemain_1',
          description: 'Pilih nama pemain ke-1 yang telah mengumpulkan deck',
          required: true,
          autocomplete: true,
        },
        {
          type: 3,
          name: 'pemain_2',
          description: 'Pilih nama pemain ke-2 (Opsional)',
          required: false,
          autocomplete: true,
        },
        {
          type: 3,
          name: 'pemain_3',
          description: 'Pilih nama pemain ke-3 (Opsional)',
          required: false,
          autocomplete: true,
        },
        {
          type: 3,
          name: 'pemain_4',
          description: 'Pilih nama pemain ke-4 (Opsional)',
          required: false,
          autocomplete: true,
        },
        {
          type: 3,
          name: 'pemain_5',
          description: 'Pilih nama pemain ke-5 (Opsional)',
          required: false,
          autocomplete: true,
        },
      ],
    },
  ];

  const slashResult = await discordAPI(`/applications/${appId}/commands`, 'PUT', commands);

  if (slashResult && !slashResult.error) {
    return NextResponse.json({
      message: '✅ Setup Slash Commands Berhasil Dijalankan!',
      commands: slashResult,
    });
  } else {
    return NextResponse.json(
      {
        error: '❌ Gagal mendaftarkan commands',
        details: slashResult || 'Discord API mengembalikan null.',
      },
      { status: 500 }
    );
  }
}