export const tournamentCommands = [
  {
    name: 'reschedule',
    description: 'Perbarui jadwal (hari dan/ jam) pertandingan di channel match',
    options: [
      {
        type: 3,
        name: 'tanggal',
        description: 'Pilih tanggal bertanding (Rabu s/d Minggu)',
        required: false,
        autocomplete: true,
      },
      {
        type: 3,
        name: 'jam',
        description: 'Waktu pertandingan dalam format 24 Jam (Contoh: 20.00, 20:30, 21.00)',
        required: false,
      },
      {
        type: 5,
        name: 'update_recap',
        description: 'Perbarui rekap jadwal pertandingan',
        required: false,
      },
    ],
  },
  {
    name: 'stream',
    description: '[STREAMER] Masukkan link siaran langsung pertandingan ini dan kirim broadcast',
    options: [
      {
        type: 3,
        name: 'link',
        description: 'Masukkan URL siaran langsung (YouTube, TikTok, Twitch, dsb.)',
        required: true,
      },
    ],
  },
  {
    name: 'match-report',
    description: '[CAMP] Teruskan match report resmi ke channel camp ini',
    options: [
      {
        type: 3,
        name: 'team',
        description: 'Pilih nama tim untuk melihat daftar match report',
        required: true,
        autocomplete: true,
      },
    ],
  },
  {
    name: 'submit',
    description: '[STAFF] Rekapitulasi pengumpulan deck pemain tim di channel camp',
    options: [
      {
        type: 3,
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
        
