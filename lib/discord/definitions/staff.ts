export const staffCommands = [
  {
    name: 'assign',
    description: 'Tugaskan atau ganti Referee / Streamer pada jadwal pertandingan',
    options: [
      {
        type: 3,
        name: 'match',
        description: 'Pilih pertandingan',
        required: true,
        autocomplete: true,
      },
      {
        type: 3,
        name: 'type',
        description: 'Pilih peran penugasan staf',
        required: true,
        choices: [
          { name: '⚖️ Referee (Wasit Pertandingan)', value: 'REFEREE' },
          { name: '🎥 Streamer (Kreator)', value: 'STREAMER' },
        ],
      },
      {
        type: 3,
        name: 'user',
        description: 'Pilih staf yang ditugaskan / pengganti',
        required: true,
        autocomplete: true,
      },
    ],
  },
  {
    name: 'unassign',
    description: 'Cabut penugasan Referee atau Streamer dari pertandingan',
    options: [
      {
        type: 3,
        name: 'type',
        description: 'Pilih peran staf yang akan dicabut penugasannya',
        required: true,
        choices: [
          { name: '⚖️ Referee (Wasit Pertandingan)', value: 'REFEREE' },
          { name: '🎥 Streamer (Kreator / Siaran)', value: 'STREAMER' },
        ],
      },
      {
        type: 3,
        name: 'match',
        description: 'Pilih pertandingan terkait',
        required: true,
        autocomplete: true,
      },
    ],
  },
  {
    name: 'swap-assign',
    description: 'Tukar penugasan Wasit atau Streamer antara 2 match aktif secara instan',
    options: [
      {
        type: 3,
        name: 'type',
        description: 'Pilih tipe peran staf yang ingin ditukar',
        required: true,
        choices: [
          { name: '⚖️ Referee (Wasit Pertandingan)', value: 'REFEREE' },
          { name: '🎥 Streamer (Kreator)', value: 'STREAMER' },
        ],
      },
      {
        type: 3,
        name: 'match_a',
        description: 'Pilih Match Pertama',
        required: true,
        autocomplete: true,
      },
      {
        type: 3,
        name: 'match_b',
        description: 'Pilih Match Kedua',
        required: true,
        autocomplete: true,
      },
    ],
  },
  {
    name: 'staff',
    description: 'Kelola penambahan staf baru atau keluarkan staf aktif',
    options: [
      {
        type: 3,
        name: 'action',
        description: 'Pilih aksi yang diinginkan',
        required: true,
        choices: [
          { name: '➕ Tambah / Aktifkan Staf', value: 'ADD' },
          { name: '⛔ Keluarkan Staf (Hapus Akses)', value: 'REMOVE' },
        ],
      },
      {
        type: 3,
        name: 'type',
        description: 'Pilih divisi peran staf',
        required: true,
        choices: [
          { name: '⚖️ Referee (Wasit)', value: 'REFEREE' },
          { name: '🎥 Streamer (Penyiar)', value: 'STREAMER' },
        ],
      },
      {
        type: 6,
        name: 'user',
        description: 'Pilih akun Discord staf (Wajib saat Tambah Staf)',
        required: false,
      },
      {
        type: 3,
        name: 'target_staff',
        description: 'Pilih staf yang akan dikeluarkan (Wajib saat Keluarkan Staf)',
        required: false,
        autocomplete: true,
      },
      {
        type: 3,
        name: 'name',
        description: 'Nama / Alias tampilan turnamen (Opsional untuk Tambah Staf)',
        required: false,
      },
    ],
  },
];
