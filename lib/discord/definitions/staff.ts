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
    description: 'Konfirmasi penyelesaian tugas Referee (rekap skor) atau pembatalan Streamer',
    options: [
      {
        type: 3,
        name: 'match',
        description: 'Pilih pertandingan terkait',
        required: true,
        autocomplete: true,
      },
      {
        type: 3,
        name: 'type',
        description: 'Pilih peran staf yang akan di-unassign',
        required: true,
        choices: [
          { name: '⚖️ Referee (Selesaikan Match & Wajib Input Skor)', value: 'REFEREE' },
          { name: '🎥 Streamer (Batal Siaran Langsung)', value: 'STREAMER' },
        ],
      },
      {
        type: 4,
        name: 'score_a',
        description: 'Skor akhir Tim Kiri (Wajib diisi jika peran Referee)',
        required: false,
      },
      {
        type: 4,
        name: 'score_b',
        description: 'Skor akhir Tim Kanan (Wajib diisi jika peran Referee)',
        required: false,
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
];
