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
        ],
      },
      {
        type: 1, // SUB_COMMAND: change
        name: 'change',
        description: 'Ganti pemain lineup dengan pemain cadangan',
        options: [
          {
            type: 3,
            name: 'pemain_lama',
            description: 'Pilih pemain di lineup yang ingin diganti',
            required: true,
            autocomplete: true,
          },
          {
            type: 3,
            name: 'pemain_baru',
            description: 'Pilih pemain baru dari roster',
            required: true,
            autocomplete: true,
          },
          {
            type: 4,
            name: 'deck_count',
            description: 'Jumlah deck pemain baru (Default: 2 Deck)',
            required: false,
            choices: [
              { name: '2 Deck (Lengkap)', value: 2 },
              { name: '1 Deck (Baru 1 SS)', value: 1 },
            ],
          },
          {
            type: 3,
            name: 'deck_1',
            description: 'Nama archetype/deck ke-1 pemain baru (Opsional)',
            required: false,
            autocomplete: true,
          },
          {
            type: 3,
            name: 'skill_1',
            description: 'Nama skill ke-1 pemain baru (Opsional)',
            required: false,
            autocomplete: true,
          },
          {
            type: 3,
            name: 'ss_1',
            description: 'URL screenshot deck ke-1 pemain baru (Opsional)',
            required: false,
          },
          {
            type: 3,
            name: 'deck_2',
            description: 'Nama archetype/deck ke-2 pemain baru (Opsional)',
            required: false,
            autocomplete: true,
          },
          {
            type: 3,
            name: 'skill_2',
            description: 'Nama skill ke-2 pemain baru (Opsional)',
            required: false,
            autocomplete: true,
          },
          {
            type: 3,
            name: 'ss_2',
            description: 'URL screenshot deck ke-2 pemain baru (Opsional)',
            required: false,
          },
        ],
      },
      {
        type: 1, // SUB_COMMAND: edit
        name: 'edit',
        description: 'Input/perbarui detail deck, skill, dan SS per pemain',
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
            name: 'ss_1',
            description: 'URL link screenshot deck ke-1',
            required: false,
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
            type: 3,
            name: 'ss_2',
            description: 'URL link screenshot deck ke-2',
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
            name: 'pemenang',
            description: 'Pilih tim pemenang pada game ini',
            required: true,
            choices: [
              { name: 'Tim A', value: 'A' },
              { name: 'Tim B', value: 'B' },
            ],
          },
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
            description: 'Deck/Archetype pemain Tim A (Deck hidup)',
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
            description: 'Deck/Archetype pemain Tim B (Deck hidup)',
            required: true,
            autocomplete: true,
          },
          {
            type: 3,
            name: 'status_kalah',
            description: 'Kondisi kekalahan pemain yang kalah',
            required: false,
            choices: [
              { name: 'Regular Loss (Nyawa berkurang 1)', value: 'REGULAR' },
              { name: 'Repeat Deck (Gunakan kuota Repeat)', value: 'REPEAT' },
              { name: 'Illegal Deck / Akun (Loss 2 Deck)', value: 'PENALTY_2' },
            ],
          },
          {
            type: 3,
            name: 'catatan',
            description: 'Catatan tambahan wasit (misal: DC, replay, sanksi kartu)',
            required: false,
          },
        ],
      },
      {
        type: 1, // SUB_COMMAND: del
        name: 'del',
        description: 'Hapus dan rollback game terakhir yang baru saja diinput',
        options: [
          {
            type: 4, // INTEGER
            name: 'game_number',
            description: 'Nomor game yang ingin dihapus (Default: Game terakhir)',
            required: false,
          },
        ],
      },
    ],
  },
];
              
