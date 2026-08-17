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
      description: '[PANITIA] Tugaskan Referee atau Streamer ke jadwal pertandingan aktif',
      options: [
        {
          type: 3, // STRING
          name: 'match',
          description: 'Pilih pertandingan pada minggu aktif',
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
            { name: '🎥 Streamer (Kreator / Caster)', value: 'STREAMER' },
          ],
        },
        {
          type: 3, // STRING
          name: 'user',
          description: 'Pilih staf bertugas sesuai ketersediaan role',
          required: true,
          autocomplete: true,
        },
      ],
    },

    // 🔴 2. UNASSIGN COMMAND (MATCH SELESAI)
    {
      name: 'unassign',
      description: '[PANITIA] Konfirmasi penyelesaian tugas staf dan rekap hasil pertandingan',
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
            { name: '⚖️ Referee (Wajib menyertakan skor akhir)', value: 'REFEREE' },
            { name: '🎥 Streamer (Wajib menyertakan tautan stream/VOD)', value: 'STREAMER' },
          ],
        },
        {
          type: 4, // INTEGER
          name: 'score_a',
          description: 'Skor akhir Tim A (Wajib diisi jika peran Referee)',
          required: false,
        },
        {
          type: 4, // INTEGER
          name: 'score_b',
          description: 'Skor akhir Tim B (Wajib diisi jika peran Referee)',
          required: false,
        },
        {
          type: 3, // STRING
          name: 'stream_link',
          description: 'Tautan siaran langsung / VOD (Wajib diisi jika peran Streamer)',
          required: false,
        },
      ],
    },

    // ❌ 3. CANCEL ASSIGN COMMAND
    {
      name: 'cancel-assign',
      description: '[PANITIA] Batalkan penugasan staf pertandingan yang berhalangan hadir',
      options: [
        {
          type: 3, // STRING
          name: 'match',
          description: 'Pilih pertandingan target',
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
          description: 'Uraikan alasan pembatalan penugasan tugas secara jelas',
          required: true,
        },
      ],
    },

    // 📅 4. RESCHEDULE COMMAND
    {
      name: 'reschedule',
      description: '[ADMIN] Perbarui jadwal (hari/jam) pertandingan di channel match ini',
      options: [
        {
          type: 3, // STRING
          name: 'tanggal',
          description: 'Pilih slot tanggal bertanding (Rabu s/d Minggu pada minggu berjalan)',
          required: false,
          autocomplete: true,
        },
        {
          type: 3, // STRING
          name: 'jam',
          description: 'Waktu pertandingan baru dalam format WIB (Contoh: 20.00, 20:30, 21.00)',
          required: false,
        },
        {
          type: 5, // BOOLEAN
          name: 'update_recap',
          description: 'Perbarui pesan jadwal dan rekap di #jadwal-pertandingan (Default: Benar)',
          required: false,
        },
      ],
    },

    // 👥 5. CEK ROSTER COMMAND
    {
      name: 'cek-roster',
      description: '[REFEREE] Periksa daftar roster resmi tim berdasarkan role Discord',
      options: [
        {
          type: 8, // ROLE
          name: 'team1',
          description: 'Pilih role Discord untuk Tim Pertama',
          required: true,
        },
        {
          type: 8, // ROLE
          name: 'team2',
          description: 'Pilih role Discord untuk Tim Kedua (Opsional)',
          required: false,
        },
      ],
    },

    // 🔍 6. CEK ID COMMAND
    {
      name: 'cek-id',
      description: '[UMUM] Verifikasi kepemilikan Game ID di database resmi Team Wars',
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
          description: 'Masukkan nomor Game ID target',
          required: true,
        },
      ],
    },

    // ℹ️ 7. INFO COMMAND
    {
      name: 'info',
      description: '[UMUM] Tampilkan rincian data profil peserta turnamen',
      options: [
        {
          type: 6, // USER
          name: 'target',
          description: 'Pilih akun peserta (Kosongkan untuk memeriksa profil diri sendiri)',
          required: false,
        },
      ],
    },

    // ⛔ 8. BLACKLIST COMMAND
    {
      name: 'blacklist',
      description: '[ADMIN] Kelola basis data larangan bermain (Blacklist Game ID)',
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
