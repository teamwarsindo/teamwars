export type RuleItem = {
  id: string
  title: string
  content: string
}

export type RuleCategory = {
  /** anchor id used for jump navigation */
  id: string
  /** short label shown in the sticky nav pill */
  navLabel: string
  /** full card heading, e.g. "A. Peraturan Pendaftaran & Struktur Tim" */
  heading: string
  items: RuleItem[]
}

export const ruleCategories: RuleCategory[] = [
  {
    id: 'registration',
    navLabel: 'Registration',
    heading: 'A. Peraturan Pendaftaran & Struktur Tim',
    items: [
      {
        id: 'syarat-sah-pendaftaran',
        title: '1. Syarat Sah Pendaftaran',
        content: 'a. Tim wajib melakukan pendaftaran melalui tautan resmi yang disediakan oleh penyelenggara.\n\nb. Tim wajib melunasi biaya pendaftaran sesuai instruksi pada tautan pendaftaran.',
      },
      {
        id: 'komposisi-tim',
        title: '2. Komposisi & Keanggotaan Tim',
        content: 'a. Setiap tim terdiri dari minimal 5 anggota dan maksimal 10 anggota.\n\nb. Struktur keanggotaan wajib memiliki 1 (satu) ketua tim dan 1 (satu) wakil ketua. Ketua dan wakil ketua terhitung sebagai anggota tim.\n\nc. Setiap pemain hanya diperbolehkan terdaftar di 1 (satu) tim pada waktu yang bersamaan.',
      },
      {
        id: 'tata-kelola-kepemimpinan',
        title: '3. Tata Kelola Tim & Kepemimpinan',
        content: 'a. Hanya ketua atau wakil ketua yang memiliki hak untuk mewakili tim dalam voting resmi penyelenggara dan mengajukan Transfer/Substitute pemain.\n\nb. Ketua atau wakil ketua yang tidak menggunakan hak vote ketika diminta oleh penyelenggara, akan kehilangan hak suaranya untuk sesi tersebut.\n\nc. Ketua atau wakil ketua yang ingin keluar dari tim wajib memindahkan posisinya kepada anggota lain terlebih dahulu. Pergantian posisi ketua hanya bisa dilakukan oleh ketua.\n\nd. Apabila ketua tidak aktif selama 7 hari (168 jam) dan terdapat pengaduan dari anggota, posisi ketua akan dialihkan kepada perwakilan yang ditunjuk oleh pelapor/ anggota.',
      },
    ],
  },
  {
    id: 'format',
    navLabel: 'Format',
    heading: 'B. Format Turnamen & Sistem Poin',
    items: [
      {
        id: 'sistem-klasemen',
        title: '1. Sistem Klasemen & Format Pertandingan',
        content: 'a. Team Wars Indonesia Season 7 akan menggunakan format round robin atau swiss system, serta mekanisme kelolosan menuju babak playoffs yang akan disesuaikan dengan jumlah total pendaftar. Keputusan final mengenai format fase grup ini akan diumumkan resmi oleh panitia sebelum turnamen dimulai.\n\nb. Setiap pertandingan (match) mempertemukan 5 pemain dari masing-masing tim, di mana setiap pemain wajib membawa 2 deck (total 10 deck per tim).\n\nc. Sistem pertandingan menggunakan format 1v1 elimination. Deck yang kalah akan langsung tereliminasi dari match. Pemain yang menang akan terus bertanding menggunakan deck yang sama sampai deck tersebut kalah.\n\nd. Pertandingan resmi berakhir ketika salah satu tim berhasil mengeliminasi seluruh (10) deck milik tim lawan (mencapai 10 kemenangan).',
      },
      {
        id: 'perhitungan-poin',
        title: '2. Perhitungan Poin Klasemen',
        content: 'a. Menang match: Mendapatkan 3 Poin.\n\nb. Kalah match: Mendapatkan 0 Poin.\n\nc. Menang W.O (walkover): Mendapatkan 3 poin dan 10 points scored (skor match otomatis dianggap 10-0).\n\nd. Kalah W.O (walkover): Mendapatkan 0 poin dan 0 points scored (skor match otomatis dianggap 0-10, tim yang kalah tidak berhak mendapatkan poin kemenangan deck).',
      },
      {
        id: 'ketentuan-tiebreakers',
        title: '3. Ketentuan Tiebreakers (Penentuan Peringkat Klasemen)',
        content: 'Apabila terdapat dua tim atau lebih yang memiliki total poin klasemen yang sama di akhir fase, peringkat final akan ditentukan secara berurutan oleh sistem otomatis platform challonge berdasarkan kriteria berikut:\n\na. Match Wins: Jumlah total kemenangan pertandingan (match) yang diraih oleh tim sepanjang musim\n\nb. Indikator Efisiensi Fase (Sesuai Format Fase Grup):\ni. Jika menggunakan round robin: Ditentukan berdasarkan points difference.\nii. Jika menggunakan swiss system: Ditentukan berdasarkan median-buchholz system.\n\nc. Points Scored: Total akumulasi poin kemenangan deck/ game yang berhasil dikumpulkan oleh tim sepanjang musim.\n\nd. Head-to-Head (H2H)\n\ne. Tiebreaker Match: Jika masih seri setelah 3 kriteria di atas, diadakan laga ekstra. Masing-masing tim mengirim 3 pemain dengan 2 deck (total 6 deck), menggunakan aturan TWI Season 7 yang berlaku.',
      },
    ],
  },
  {
    id: 'schedule',
    navLabel: 'Schedule',
    heading: 'C. Jadwal Pertandingan & Penjadwalan Ulang (Reschedule)',
    items: [
      {
        id: 'jadwal-resmi',
        title: '1. Jadwal Resmi (Default Schedule)',
        content: 'Penyelenggara akan merilis jadwal pertandingan resmi untuk setiap matchweek. Seluruh tim wajib mematuhi jam tanding yang telah ditetapkan kecuali mengajukan reschedule.',
      },
      {
        id: 'kapasitas-pertandingan',
        title: '2. Kapasitas Pertandingan',
        content: 'Demi kelancaran operasional turnamen, panitia menetapkan batas maksimal pengawasan pertandingan sebanyak 3 (tiga) match per hari.',
      },
      {
        id: 'prosedur-reschedule',
        title: '3. Prosedur Reschedule',
        content: 'a. Permintaan reschedule wajib diajukan oleh ketua/wakil ketua kepada tim lawan dan dikonfirmasi kepada wasit selambat-lambatnya 24 jam sebelum jadwal resmi dimulai.\n\nb. Reschedule hanya sah jika memenuhi dua syarat:\ni. Kedua belah pihak tim mencapai kesepakatan waktu yang baru\nii. Jadwal pada hari yang dituju belum memenuhi kuota maksimal (3 match per hari).\n\nc. Jika tidak ada kesepakatan waktu yang baru antar tim, atau slot di hari yang dituju sudah penuh, maka jadwal pertandingan akan dikembalikan ke jadwal resmi (default). Tim yang tidak hadir pada jadwal resmi tersebut akan dikenakan sanksi W.O.',
      },
    ],
  },
  {
    id: 'legality',
    navLabel: 'Legality',
    heading: 'D. Legalitas Kartu, Skill, & Banlist',
    items: [
      {
        id: 'kartu-box',
        title: '1. Kartu & BOX',
        content: 'Semua kartu dari main box, mini box, selection box, structure decks, event cards, character drops, dan level-up rewards berstatus LEGAL sejak hari rilis resmi di dalam game.',
      },
      {
        id: 'skill-legality',
        title: '2. Skill',
        content: 'Semua skill legal sejak dirilis.',
      },
      {
        id: 'banlist',
        title: '3. Forbidden/Limited List (Banlist)',
        content: 'Aturan banlist TWI akan langsung diterapkan setelah daftar resmi diumumkan, meskipun Banlist tersebut belum aktif/diimplementasikan di dalam game.',
      },
      {
        id: 'bug-glitches',
        title: '4. Bug/Glitches',
        content: 'Legalitas kartu atau skill yang terbukti mengalami bug akan ditangguhkan dan dibahas per kasus oleh pihak penyelenggara.',
      },
    ],
  },
  {
    id: 'pre-match',
    navLabel: 'Pre-Match',
    heading: 'E. Peraturan Pra-Pertandingan (Pembuatan & Pengiriman Deck)',
    items: [
      {
        id: 'id-nama-pemain',
        title: '1. ID & Nama Pemain (In-Game Name/IGN)',
        content: 'a. Ketua tim wajib memperbarui dan memastikan ID serta in-game name pemain sesuai dengan data registrasi sebelum pertandingan.\n\nb. Dilarang keras menggunakan ID yang sama dengan pemain lain. ID dan nama yang digunakan saat bertanding wajib sama dengan yang terdaftar. Kesalahan penggunaan ID akan berakibat pada sanksi loss deck.',
      },
      {
        id: 'komposisi-deck-archetype',
        title: '2. Aturan Komposisi Deck & Archetype',
        content: 'a. Setiap pemain dari total 5 pemain yang diturunkan wajib menggunakan 2 (dua) deck dengan archetype utama yang saling berbeda.\n\nb. Limit archetype tim: Dalam satu tim, batas maksimal penggunaan untuk 1 (satu) jenis archetype yang sama adalah 5 (lima) kali penggunaan.\n\nc. Definisi archetype: Kelompok yang terdiri dari minimal 3 (tiga) kartu dengan kesamaan kata/nama pada kartu tersebut (Contoh: Branded In Red, Branded Fusion dihitung 1 archetype Branded). Jika tidak memenuhi syarat 3 kartu, deck diklasifikasikan sebagai "Deck Khusus" (misal: Dino, Stun).\n\nd. Aturan deck gabungan (Mixed Deck): Apabila terdapat dua atau lebih archetype yang digabungkan dalam permainan (contoh: Stardust-Centurion), maka perhitungan batas maksimal 5 (lima) penggunaan tersebut diberlakukan secara akumulatif untuk seluruh archetype yang saling bersinggungan tersebut. Artinya, total penggunaan seluruh unsur Stardust ditambah total penggunaan seluruh unsur Centurion di dalam satu tim secara kolektif tidak boleh melebihi 5 kali penggunaan.',
      },
      {
        id: 'submit-deck',
        title: '3. Pengiriman Deck (Submit Deck)',
        content: 'a. Kesepuluh deck wajib dikirimkan di channel masing-masing tim selambat-lambatnya 60 menit sebelum jadwal pertandingan dimulai. Gambar screenshot deck harus yang paling terbaru.\n\nb. Keterlambatan pengiriman maksimal adalah hingga waktu kick-off pertandingan. Setiap keterlambatan pengiriman akan dipenalti dengan pemotongan waktu kontrol tim sebanyak 2 menit per deck yang terlambat.\n\nc. Jika hingga pertandingan dimulai ada slot deck yang kosong/tidak dikirim, maka slot deck tersebut otomatis dinyatakan auto-loss dan langsung menjadi poin kemenangan bagi lawan.',
      },
    ],
  },
  {
    id: 'in-game-rules',
    navLabel: 'In-Game Rules',
    heading: 'F. Aturan Pertandingan (In-Game Rules)',
    items: [
      {
        id: 'waktu-kontrol',
        title: '1. Waktu Kontrol (Control Time)',
        content: 'a. Setiap tim diberikan waktu kontrol total selama 15 menit per match.\n\nb. Penghitungan dan pengawasan waktu kontrol sepenuhnya dipegang oleh wasit yang bertugas menggunakan alat ukur resmi. Keputusan wasit mengenai sisa waktu mutlak dan tidak dapat diganggu gugat.\n\nc. Waktu berjalan ketika pemain melakukan persiapan, mengganti deck, terjadi pergantian pemain, atau pemain tidak merespons panggilan tanpa alasan jelas. Waktu berhenti (di-pause) saat pemain berada di dalam lobby/bermain.\n\nd. Jika waktu kontrol habis (00:00), tim tersebut mendapat penalti loss 1 deck, lalu diberikan tambahan waktu 3 menit. Jika 3 menit habis, terkena loss deck lagi, dan seterusnya.',
      },
      {
        id: 'ss-starting-hand',
        title: '2. Tangkapan Layar (Screenshot) Starting Hand',
        content: 'a. Pemain yang sedang bertanding wajib mengambil tangkapan layar (SS) starting hand di setiap game. SS wajib full screen menampilkan: hand/field sendiri, hand/field lawan, dan jumlah kartu main/extra deck lawan.\n\nb. SS wajib dikirim ke channel tim sesaat setelah game berakhir. Kegagalan melampirkan SS akan dikenakan peringatan ringan (pelanggaran 1) dan loss 1 deck (pelanggaran 2).',
      },
      {
        id: 'pemain-cadangan',
        title: '3. Pemain Cadangan (Substitute Saat Pertandingan)',
        content: 'a. Jika pemain utama tidak bisa bertanding saat hari-H, ia bisa digantikan oleh anggota aktif tim lainnya (pemain cadangan) dengan izin wasit. Pergantian ini hanya diizinkan maksimal 1 (satu) kali per pertandingan.\n\nb. Pemain cadangan wajib menggunakan 2 deck yang sama persis dengan yang sudah didaftarkan/dikirimkan oleh pemain yang digantikannya.\n\nc. Apabila pemain cadangan hanya memiliki 1 dari 2 deck tersebut, maka tim otomatis mendapat kekalahan (auto-loss) pada slot deck yang tidak dimiliki. Wasit wajib memberitahu pihak lawan mengenai kekalahan ini sebelum duel dimulai. Pemain Cadangan dalam kondisi ini tidak diperbolehkan menggunakan hak pengulangan (repeat).',
      },
      {
        id: 'repeat-deck',
        title: '4. Pengulangan Deck (Repeat Deck)',
        content: 'a. Tim memiliki kuota 2x repeat deck per match.\n\nb. Repeat hanya boleh dilakukan jika pemain kalah di game pertama tanpa sempat meraih kemenangan dengan deck pertamanya.\n\nc. Deck yang diulang akan menghapus/menggantikan slot deck kedua milik pemain tersebut. Hak pengulangan harus dideklarasikan ke wasit dan tim lawan sebelum pertandingan selanjutnya dimulai dan tidak bisa ditarik kembali.',
      },
      {
        id: 'room-komunikasi',
        title: '5. Ruang Pertandingan (Room) & Komunikasi',
        content: 'a. Room dibuat khusus oleh wasit. Dilarang keras menyebarkan ID room. Hanya pemain yang sedang bertanding yang boleh berada di room. Semua pihak (menang/kalah) wajib segera keluar room setelah duel usai.\n\nb. Seluruh pemain yang didaftarkan wajib masuk ke voice chat (VC) discord TWI. Wasit akan melakukan inspeksi berkala. Terindikasi membicarakan cheat/mod/bug di VC akan berujung diskualifikasi instan. Layar (screen share) hanya boleh dilakukan oleh pemain yang sedang bertanding.',
      },
      {
        id: 'dc-glitches',
        title: '6. Disconnects (DC) & Glitches',
        content: 'a. Disconnect: Jika DC terjadi, pemain otomatis kalah di game tersebut. Wasit akan memutuskan validitas DC berdasarkan layar hasil sistem game atau kemunculan "Simbol Disconnect" pada SS/Video bukti yang diberikan.\n\nb. Glitches/Bug: Jika pemain mengklaim terkena glitch, ia wajib menjelaskan dan menyertakan bukti kuat (video/SS) kepada wasit selambat-lambatnya 5 menit sejak glitch terjadi.\n\nc. Apabila bukti diserahkan melewati 5 menit, laporan diabaikan dan hasil game dianggap sah. Jika bukti valid dan posisi duel imbang, rematch dapat dilakukan. Jika satu pemain sudah jelas dalam posisi "pasti menang" (lethal) sebelum glitch, wasit dapat memberikan kemenangan langsung tanpa rematch.',
      },
      {
        id: 'pertandingan-seri',
        title: '7. Pertandingan Seri (Draw)',
        content: 'a. Jika sistem game mencatatkan "Draw", kedua belah pihak dianggap kehilangan (loss) deck yang sedang dipakai.\n\nb. Jika "Draw" terjadi di partai puncak (skor 9-9), diadakan 1 game tambahan (tiebreaker duel) di mana tiap tim bebas memilih 1 pemain & 1 deck untuk bertanding ulang.',
      },
    ],
  },
  {
    id: 'penalties',
    navLabel: 'Penalties',
    heading: 'G. Kode Etik, Pelanggaran & Sanksi',
    items: [
      {
        id: 'ketentuan-sanksi',
        title: 'Ketentuan Umum Sanksi',
        content: 'Semua sanksi bersifat akumulatif dan diputuskan secara mutlak oleh wasit/ ketua wasit/ presiden TWI.',
      },
      {
        id: 'peringatan-ringan',
        title: '1. Peringatan Ringan (Minor Warning)',
        content: 'a. Diberikan atas pelanggaran administratif/teknis, seperti: telat meninggalkan room, SS starting hand tidak valid/terpotong, nama tidak sesuai, menunda waktu secara sengaja.\n\nb. Sanksi: Akumulasi 2x peringatan ringan dalam satu match = tim mendapat hukuman kekalahan (loss) 1 deck/game. Peringatan ringan berikutnya akan langsung berakibat loss deck tanpa perlu akumulasi.',
      },
      {
        id: 'pelanggaran-deck-id',
        title: '2. Pelanggaran Deck & ID (Diskualifikasi Deck)',
        content: 'a. Masuk menggunakan ID/Nama akun yang salah: loss 2 deck/game.\n\nb. Ketahuan mengubah isi kartu dari deck yang sudah disubmit: loss 2 deck/game.\n\nc. Memasuki pertandingan dengan jenis/archetype deck yang salah: loss 1 deck/game.',
      },
      {
        id: 'peringatan-berat',
        title: '3. Peringatan Berat (Major Warning) & Skorsing',
        content: 'Diberikan atas tindakan fatal seperti: tidak sportif, berkata kasar/ pelecehan kepada wasit/lawan, kolusi, penggunaan cheat/mod.\n\na. Sanksi: Pemain yang terbukti bersalah dapat didiskualifikasi (skorsing/banned) dari turnamen secara individu.\n\nb. Apabila sebuah tim mengumpulkan 2x peringatan berat dalam satu musim, tim tersebut akan didiskualifikasi dari TWI Season 7 secara permanen, poin dicabut, dan seluruh hasil pertandingannya dianulir.',
      },
      {
        id: 'wo-kolusi',
        title: '4. W.O, Pengunduran Diri & Kolusi',
        content: 'a. Tim yang gagal menghadirkan minimal 3 pemain & 6 deck saat jam tanding dinyatakan kalah W.O. Tim pemenang mendapat skor (10-0), tim kalah mendapat skor (0-10).\n\nb. Jika WO dicurigai sengaja dilakukan demi mengatur klasemen (kolusi/match-fixing), investigasi mendalam akan dilakukan. Tim yang terbukti berkolusi akan di-ban permanen dari seluruh kompetisi TWI.',
      },
    ],
  },
  {
    id: 'transfer',
    navLabel: 'Transfer',
    heading: 'H. Aturan Bursa Transfer (Roster & Off-Season)',
    items: [
      {
        id: 'transfer-request',
        title: 'Pusat Permintaan Transfer',
        content: 'Permintaan keluar/masuk anggota wajib melalui channel #transfer-request di Discord TWI.',
      },
      {
        id: 'off-season',
        title: '1. Off-Season',
        content: 'Akhir musim - minggu ke-1: Transfer bebas tanpa batasan jumlah.',
      },
      {
        id: 'season-transfer',
        title: '2. Season Transfer',
        content: 'Minggu ke-1 - akhir regular season:\n\na. Tim bebas merekrut "Free Agent" (pemain yang belum terdaftar di tim manapun).\n\nb. Tim maksimal hanya boleh merekrut 2 (dua) pemain perpindahan dari tim lain.\n\nc. Seorang pemain maksimal hanya boleh membela 2 tim berbeda dalam satu musim yang sama.\n\nd. Batas waktu pemrosesan transfer adalah 1x24 jam.',
      },
      {
        id: 'playoffs-transfer',
        title: '3. Playoffs Transfer',
        content: 'Minggu terakhir - akhir playoffs: Roster di-lock. Tim dilarang mengambil pemain dari tim lain, dan hanya diizinkan merekrut Free Agent.',
      },
      {
        id: 'kuota-tim',
        title: '4. Ketentuan Kuota Tim',
        content: 'PENTING. Syarat kuota tim (min 5, max 10) tetap berlaku setiap kali transfer terjadi.',
      },
    ],
  },
  {
    id: 'committee',
    navLabel: 'Committee',
    heading: 'I. Struktur Organisasi Team Wars Indonesia Season 7',
    items: [
      {
        id: 'susunan-panitia',
        title: 'Susunan Panitia',
        content: '1. Presiden: Adriansyah Pratama Putra\n2. Administrator: Achmad Nuruddin\n3. Head of Finance: Victor Widiaputra\n4. Head of Competition: Agung Mahendra\n5. Chief Referee: Xenon Yanu\n6. Lead Data Analyst: Fajar Haikal\n7. Head Of Creative: Nazz Rill',
      },
    ],
  },
]

/** Extra nav targets shown as pills even without a full card on this page. */
export const navItems = [
  { id: 'registration', label: 'Registration' },
  { id: 'format', label: 'Format' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'legality', label: 'Legality' },
  { id: 'pre-match', label: 'Pre-Match' },
  { id: 'in-game-rules', label: 'In-Game Rules' },
  { id: 'penalties', label: 'Penalties' },
  { id: 'transfer', label: 'Transfer' },
  { id: 'committee', label: 'Committee' },
]
