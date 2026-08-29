export const adminCommands = [
  {
    name: 'blacklist',
    description: 'Kelola basis data larangan bermain (Blacklist Game ID)',
    options: [
      {
        type: 3,
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
        type: 3,
        name: 'id',
        description: 'Masukkan Duel Links ID (Diperlukan untuk opsi Add / Remove)',
        required: false,
      },
    ],
  },
  {
    name: 'cancel-bid',
    description: '[ADMIN] Anulir penawaran (bid) tertinggi pada divisi tertentu',
    options: [
      {
        type: 3,
        name: 'group',
        description: 'Pilih divisi sasaran',
        required: true,
        choices: [
          { name: 'Divisi Group A', value: 'A' },
          { name: 'Divisi Group B', value: 'B' },
        ],
      },
      {
        type: 3,
        name: 'alasan',
        description: 'Uraikan dasar pembatalan penawaran',
        required: false,
      },
    ],
  },
];
