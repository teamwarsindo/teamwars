export const rosterCommands = [
  {
    name: 'transfer',
    description: '[ROSTER] Pengelolaan bursa transfer, pendaftaran, dan mutasi pemain tim',
    options: [
      {
        type: 1,
        name: 'out',
        description: 'Keluarkan peserta dari komposisi roster tim aktif',
        options: [
          {
            type: 3,
            name: 'user',
            description: 'Pilih nama peserta yang akan dilepas dari tim',
            required: true,
            autocomplete: true,
          },
        ],
      },
      {
        type: 1,
        name: 'add',
        description: 'Daftarkan peserta baru ke dalam komposisi roster tim',
        options: [
          {
            type: 6,
            name: 'user',
            description: 'Sebut (@mention) akun Discord peserta baru',
            required: true,
          },
          {
            type: 3,
            name: 'ign',
            description: 'Nama in-game resmi (IGN Duel Links) peserta',
            required: true,
          },
          {
            type: 3,
            name: 'id_dl',
            description: 'Nomor identifikasi 9 digit Duel Links ID',
            required: true,
          },
        ],
      },
      {
        type: 1,
        name: 'edit',
        description: 'Perbarui Game ID atau struktur kepengurusan (Ketua/Wakil) pemain',
        options: [
          {
            type: 3,
            name: 'user',
            description: 'Pilih nama peserta yang datanya akan disesuaikan',
            required: true,
            autocomplete: true,
          },
          {
            type: 3,
            name: 'new_id_dl',
            description: 'Duel Links ID baru (Kosongkan jika hanya mengubah jabatan)',
            required: false,
          },
          {
            type: 3,
            name: 'position',
            description: 'Pilih penetapan jabatan struktural baru',
            required: false,
            choices: [
              { name: 'Ketua Tim (Khusus Admin)', value: 'Ketua' },
              { name: 'Wakil Ketua Tim', value: 'Wakil Ketua' },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'cek-roster',
    description: 'Periksa daftar roster tim',
    options: [
      {
        type: 8,
        name: 'team1',
        description: 'Pilih tim untuk dicek',
        required: true,
      },
      {
        type: 8,
        name: 'team2',
        description: 'Pilih tim lain untuk dicek (Opsional)',
        required: false,
      },
    ],
  },
  {
    name: 'cek-id',
    description: 'Verifikasi kepemilikan ID DL/ ID MD di database Team Wars Indonesia',
    options: [
      {
        type: 3,
        name: 'game',
        description: 'Pilih kategori game yang ingin diperiksa',
        required: true,
        choices: [
          { name: 'Yu-Gi-Oh! Duel Links', value: 'dl' },
          { name: 'Yu-Gi-Oh! Master Duel', value: 'md' },
        ],
      },
      {
        type: 3,
        name: 'id',
        description: 'Masukkan nomor ID DL/ ID MD',
        required: true,
      },
    ],
  },
  {
    name: 'info',
    description: 'Tampilkan rincian data profil peserta Team Wars Indonesia',
    options: [
      {
        type: 6,
        name: 'target',
        description: 'Pilih pemain lain (Kosongkan untuk memeriksa profil diri sendiri)',
        required: false,
      },
    ],
  },
];
