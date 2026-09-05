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
    description: '[STAFF] Kelola lineup dan verifikasi deck tim di camp',
    options: [
      {
        type: 1, // SUB_COMMAND: add
        name: 'add',
        description: 'Tambah pemain ke lineup (1 s/d 5 pemain)',
        options: [
          {
            type: 3,
            name: 'pemain_1',
            description: 'Pemain ke-1',
            required: true,
            autocomplete: true,
          },
          {
            type: 4, // INTEGER
            name: 'deck_count_1',
            description: 'Jumlah deck pemain ke-1 (Default: 2 Deck)',
            required: false,
            choices: [
              { name: '2 Deck (Lengkap)', value: 2 },
              { name: '1 Deck (Baru 1 SS)', value: 1 },
            ],
          },
          {
            type: 3,
            name: 'pemain_2',
            description: 'Pemain ke-2 (Opsional)',
            required: false,
            autocomplete: true,
          },
          {
            type: 4,
            name: 'deck_count_2',
            description: 'Jumlah deck pemain ke-2 (Default: 2 Deck)',
            required: false,
            choices: [
              { name: '2 Deck (Lengkap)', value: 2 },
              { name: '1 Deck (Baru 1 SS)', value: 1 },
            ],
          },
          {
            type: 3,
            name: 'pemain_3',
            description: 'Pemain ke-3 (Opsional)',
            required: false,
            autocomplete: true,
          },
          {
            type: 4,
            name: 'deck_count_3',
            description: 'Jumlah deck pemain ke-3 (Default: 2 Deck)',
            required: false,
            choices: [
              { name: '2 Deck (Lengkap)', value: 2 },
              { name: '1 Deck (Baru 1 SS)', value: 1 },
            ],
          },
          {
            type: 3,
            name: 'pemain_4',
            description: 'Pemain ke-4 (Opsional)',
            required: false,
            autocomplete: true,
          },
          {
            type: 4,
            name: 'deck_count_4',
            description: 'Jumlah deck pemain ke-4 (Default: 2 Deck)',
            required: false,
            choices: [
              { name: '2 Deck (Lengkap)', value: 2 },
              { name: '1 Deck (Baru 1 SS)', value: 1 },
            ],
          },
          {
            type: 3,
            name: 'pemain_5',
            description: 'Pemain ke-5 (Opsional)',
            required: false,
            autocomplete: true,
          },
          {
            type: 4,
            name: 'deck_count_5',
            description: 'Jumlah deck pemain ke-5 (Default: 2 Deck)',
            required: false,
            choices: [
              { name: '2 Deck (Lengkap)', value: 2 },
              { name: '1 Deck (Baru 1 SS)', value: 1 },
            ],
          },
          {
            type: 5, // BOOLEAN
            name: 'publish',
            description: 'Kirim ulang tracker ke paling bawah chat? (Default: False / Edit di tempat)',
            required: false,
          },
        ],
      },
      {
        type: 1, // SUB_COMMAND: del
        name: 'del',
        description: 'Hapus 1 s/d 5 pemain dari lineup (hanya jika belum bertanding)',
        options: [
          {
            type: 3,
            name: 'pemain_1',
            description: 'Pemain ke-1 yang ingin dihapus',
            required: true,
            autocomplete: true,
          },
          {
            type: 3,
            name: 'pemain_2',
            description: 'Pemain ke-2 yang ingin dihapus (Opsional)',
            required: false,
            autocomplete: true,
          },
          {
            type: 3,
            name: 'pemain_3',
            description: 'Pemain ke-3 yang ingin dihapus (Opsional)',
            required: false,
            autocomplete: true,
          },
          {
            type: 3,
            name: 'pemain_4',
            description: 'Pemain ke-4 yang ingin dihapus (Opsional)',
            required: false,
            autocomplete: true,
          },
          {
            type: 3,
            name: 'pemain_5',
            description: 'Pemain ke-5 yang ingin dihapus (Opsional)',
            required: false,
            autocomplete: true,
          },
          {
            type: 5, // BOOLEAN
            name: 'publish',
            description: 'Kirim ulang tracker ke paling bawah chat? (Default: False / Edit di tempat)',
            required: false,
          },
        ],
      },
      {
        type: 1, // SUB_COMMAND: edit
        name: 'edit',
        description: 'Input/perbarui detail deck dan skill per pemain',
        options: [
          {
            type: 3,
            name: 'pemain',
            description: 'Pilih pemain di lineup yang akan diedit',
            required: true,
            autocomplete: true,
          },
          {
            type: 3,
            name: 'deck_1',
            description: 'Nama archetype/deck ke-1',
            required: false,
            autocomplete: true,
          },
          {
            type: 3,
            name: 'skill_1',
            description: 'Nama skill ke-1',
            required: false,
            autocomplete: true,
          },
          {
            type: 3,
            name: 'deck_2',
            description: 'Nama archetype/deck ke-2',
            required: false,
            autocomplete: true,
          },
          {
            type: 3,
            name: 'skill_2',
            description: 'Nama skill ke-2',
            required: false,
            autocomplete: true,
          },
          {
            type: 5, // BOOLEAN
            name: 'publish',
            description: 'Kirim ulang tracker ke paling bawah chat? (Default: False / Edit di tempat)',
            required: false,
          },
        ],
      },
    ],
  },
  {
    name: 'game',
    description: '[WASIT] Kelola input hasil duel game pertandingan',
    options: [
      {
        type: 1, // SUB_COMMAND: add
        name: 'add',
        description: 'Catat hasil game baru yang baru saja selesai',
        options: [
          {
            type: 3,
            name: 'pemain_a',
            description: 'Pemain dari Tim A yang bertanding',
            required: true,
            autocomplete: true,
          },
          {
            type: 3,
            name: 'deck_a',
            description: 'Pilih deck hidup pemain Tim A',
            required: true,
            autocomplete: true,
          },
          {
            type: 3,
            name: 'pemain_b',
            description: 'Pemain dari Tim B yang bertanding',
            required: true,
            autocomplete: true,
          },
          {
            type: 3,
            name: 'deck_b',
            description: 'Pilih deck hidup pemain Tim B',
            required: true,
            autocomplete: true,
          },
          {
            type: 3,
            name: 'pemenang',
            description: 'Pilih tim pemenang pada game ini',
            required: true,
            autocomplete: true,
          },
          {
            type: 5, // BOOLEAN
            name: 'ss_hand_a',
            description: 'Apakah Tim A mengirimkan SS starting hand? (Default: True)',
            required: false,
          },
          {
            type: 5, // BOOLEAN
            name: 'ss_hand_b',
            description: 'Apakah Tim B mengirimkan SS starting hand? (Default: True)',
            required: false,
          },
          {
            type: 3,
            name: 'catatan',
            description: 'Catatan tambahan wasit (misal: DC, salah bawa skill, dll.)',
            required: false,
          },
        ],
      },
      {
        type: 1, // SUB_COMMAND: del
        name: 'del',
        description: 'Hapus dan rollback game terakhir yang baru saja diinput',
      },
    ],
  },
];
        
