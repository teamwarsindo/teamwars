export type RulePoint = string | { text: string; subPoints: string[] };

export interface RuleSection {
  title: string;
  points: RulePoint[];
}

export interface RuleCategory {
  id: string;
  title: string;
  rules: RuleSection[];
}

export const ruleCategories: RuleCategory[] = [
  {
    id: "A",
    title: "Peraturan Pendaftaran & Struktur Tim",
    rules: [
      {
        title: "1. Syarat Sah Pendaftaran",
        points: [
          "a. Tim wajib melakukan pendaftaran melalui tautan resmi yang disediakan oleh penyelenggara.",
          "b. Tim wajib melunasi biaya pendaftaran sesuai instruksi pada tautan pendaftaran."
        ]
      },
      {
        title: "2. Komposisi & Keanggotaan Tim",
        points: [
          "a. Setiap tim terdiri dari minimal 5 anggota dan maksimal 10 anggota.",
          "b. Struktur keanggotaan wajib memiliki 1 (satu) ketua tim dan 1 (satu) wakil ketua. Ketua dan wakil ketua terhitung sebagai anggota tim.",
          "c. Setiap pemain hanya diperbolehkan terdaftar di 1 (satu) tim pada waktu yang bersamaan."
        ]
      },
      {
        title: "3. Tata Kelola Tim & Kepemimpinan",
        points: [
          "a. Hanya ketua atau wakil ketua yang memiliki hak untuk mewakili tim dalam voting resmi penyelenggara dan mengajukan Transfer/Substitute pemain.",
          "b. Ketua atau wakil ketua yang tidak menggunakan hak vote ketika diminta oleh penyelenggara, akan kehilangan hak suaranya untuk sesi tersebut.",
          "c. Ketua atau wakil ketua yang ingin keluar dari tim wajib memindahkan posisinya kepada anggota lain terlebih dahulu. Pergantian posisi ketua hanya bisa dilakukan oleh ketua.",
          "d. Apabila ketua tidak aktif selama 7 hari (168 jam) dan terdapat pengaduan dari anggota, posisi ketua akan dialihkan kepada perwakilan yang ditunjuk oleh pelapor/ anggota."
        ]
      }
    ]
  },
  {
    id: "B",
    title: "Format Turnamen & Sistem Poin",
    rules: [
      {
        title: "1. Sistem Klasemen & Format Pertandingan",
        points: [
          "a. Team Wars Indonesia Season 7 akan menggunakan format round robin atau swiss system, serta mekanisme kelolosan menuju babak playoffs yang akan disesuaikan dengan jumlah total pendaftar. Keputusan final mengenai format fase grup ini akan diumumkan resmi oleh panitia sebelum turnamen dimulai.",
          "b. Setiap pertandingan (match) mempertemukan 5 pemain dari masing-masing tim, di mana setiap pemain wajib membawa 2 deck (total 10 deck per tim).",
          "c. Sistem pertandingan menggunakan format 1v1 elimination. Deck yang kalah akan langsung tereliminasi dari match. Pemain yang menang akan terus bertanding menggunakan deck yang sama sampai deck tersebut kalah.",
          "d. Pertandingan resmi berakhir ketika salah satu tim berhasil mengeliminasi seluruh (10) deck milik tim lawan (mencapai 10 kemenangan)."
        ]
      },
      {
        title: "2. Perhitungan Poin Klasemen",
        points: [
          "a. Menang match: Mendapatkan 1 poin kemenangan (1-0).",
          "b. Kalah match: Mendapatkan 1 poin kekalahan (0-1).",
          "c. Menang W.O (walkover): Mendapatkan 1 poin kemenangan dan 10 points scored win (1-0, +10).",
          "d. Kalah W.O (walkover): Mendapatkan 1 poin kekalahan dan 10 points scored lose (0-1, -10)."
        ]
      },
      {
        title: "3. Ketentuan Tiebreakers (Penentuan Peringkat Klasemen)",
        points: [
          "Apabila terdapat dua tim atau lebih yang memiliki rekor Match W-L yang sama di akhir fase, peringkat final akan ditentukan secara berurutan berdasarkan kriteria berikut:",
          "a. Points Difference (Pts Diff): Selisih antara total points scored win dengan points scored lose.",
          "b. Points Scored (Scored): Total akumulasi kemenangan deck/game yang dikumpulkan sepanjang musim.",
          "c. Head-to-Head (H2H): Hasil pertandingan langsung antara tim yang bersangkutan.",
          "d. Tiebreaker Match: Jika masih seri setelah kriteria di atas, diadakan laga ekstra. Masing-masing tim mengirim 3 pemain dengan 2 deck (total 6 deck), menggunakan aturan TWI Season 7 yang berlaku."
        ]
      }
    ]
  },
  {
    id: "C",
    title: "Jadwal Pertandingan & Penjadwalan Ulang (Reschedule)",
    rules: [
      {
        title: "1. Jadwal Resmi (Default Schedule)",
        points: [
          "Penyelenggara akan merilis jadwal pertandingan resmi untuk setiap matchweek. Seluruh tim wajib mematuhi jam tanding yang telah ditetapkan kecuali mengajukan reschedule."
        ]
      },
      {
        title: "2. Kapasitas Pertandingan",
        points: [
          "Demi kelancaran operasional turnamen, panitia menetapkan batas maksimal pengawasan pertandingan sebanyak 3 (tiga) match per hari."
        ]
      },
      {
        title: "3. Prosedur Reschedule",
        points: [
          "a. Permintaan reschedule wajib diajukan oleh ketua/wakil ketua kepada tim lawan dan dikonfirmasi kepada wasit selambat-lambatnya 24 jam sebelum jadwal resmi dimulai.",
          {
            text: "b. Reschedule hanya sah jika memenuhi dua syarat:",
            subPoints: [
              "i. Kedua belah pihak tim mencapai kesepakatan waktu yang baru",
              "ii. Jadwal pada hari yang dituju belum memenuhi kuota maksimal (3 match per hari)."
            ]
          },
          "c. Jika tidak ada kesepakatan waktu yang baru antar tim, atau slot di hari yang dituju sudah penuh, maka jadwal pertandingan akan dikembalikan ke jadwal resmi (default). Tim yang tidak hadir pada jadwal resmi tersebut akan dikenakan sanksi W.O."
        ]
      }
    ]
  },
  {
    id: "D",
    title: "Legalitas Kartu, Skill, & Banlist",
    rules: [
      {
        title: "Ketentuan Legalitas",
        points: [
          "a. Kartu & BOX: Semua kartu dari main box, mini box, selection box, structure decks, event cards, character drops, dan level-up rewards berstatus LEGAL sejak hari rilis resmi di dalam game.",
          "b. Skill: Semua skill legal sejak dirilis.",
          "c. Forbidden/Limited List (Banlist): Aturan banlist TWI akan langsung diterapkan setelah daftar resmi diumumkan, meskipun Banlist tersebut belum aktif/diimplementasikan di dalam game.",
          "d. Bug/Glitches: Legalitas kartu atau skill yang terbukti mengalami bug akan ditangguhkan dan dibahas per kasus oleh pihak penyelenggara."
        ]
      }
    ]
  },
  {
    id: "E",
    title: "Peraturan Pra-Pertandingan (Pembuatan & Pengiriman Deck)",
    rules: [
      {
        title: "1. ID & Nama Pemain (In-Game Name/IGN)",
        points: [
          "a. Ketua tim wajib memperbarui dan memastikan ID serta in-game name pemain sesuai dengan data registrasi sebelum pertandingan.",
          "b. Dilarang keras menggunakan ID yang sama dengan pemain lain. ID dan nama yang digunakan saat bertanding wajib sama dengan yang terdaftar. Kesalahan penggunaan ID akan berakibat pada sanksi loss deck."
        ]
      },
      {
        title: "2. Aturan Komposisi Deck & Archetype",
        points: [
          "a. Setiap pemain dari total 5 pemain yang diturunkan wajib menggunakan 2 (dua) deck dengan archetype utama yang saling berbeda.",
          "b. Limit archetype tim: Dalam satu tim, batas maksimal penggunaan untuk 1 (satu) jenis archetype yang sama adalah 5 (lima) kali penggunaan.",
          "c. Definisi archetype: Kelompok yang terdiri dari minimal 3 (tiga) kartu dengan kesamaan kata/nama pada kartu tersebut (Contoh: Branded In Red, Branded Fusion dihitung 1 archetype Branded). Jika tidak memenuhi syarat 3 kartu, deck diklasifikasikan sebagai \"Deck Khusus\" (misal: Dino, Stun).",
          "d. Aturan deck gabungan (Mixed Deck): Apabila terdapat dua atau lebih archetype yang digabungkan dalam permainan (contoh: Stardust-Centurion), maka perhitungan batas maksimal 5 (lima) penggunaan tersebut diberlakukan secara akumulatif untuk seluruh archetype yang saling bersinggungan tersebut. Artinya, total penggunaan seluruh unsur Stardust ditambah total penggunaan seluruh unsur Centurion di dalam satu tim secara kolektif tidak boleh melebihi 5 kali penggunaan.",
          "CONTOH LINE-UP (LEGAL/ILEGAL)",
          {
            text: "Kasus 1: Maksimal Kuota Legal",
            subPoints: [
              "Player A: Stardust & Dhero",
              "Player B: Stardust & Vaalmonica",
              "Player C: Stardust & Therion",
              "Player D: Stardust & Branded",
              "Player E: Stardust & Centurion",
              "Keterangan Wasit: LEGAL. Tim mencatatkan tepat 5 kali penggunaan archetype Stardust, sesuai dengan batas maksimal."
            ]
          },
          {
            text: "Kasus 2: Bentrok Archetype Individu",
            subPoints: [
              "Player A: Stardust-Centurion (Mixed) & Stardust",
              "Player B: Stardust-Centurion (Mixed) & Traptrix",
              "Player C: Stardust & Swordsoul",
              "Player D: Live Twin & Branded",
              "Player E: Dracotail & Kewl Tune",
              "Keterangan Wasit: ILEGAL. Player A melanggar aturan individu karena menggunakan unsur archetype Stardust pada kedua pilihan deck-nya. Setiap pemain wajib membawa pilihan archetype yang benar-benar berbeda satu sama lain."
            ]
          },
          {
            text: "Kasus 3: Melebihi Batas Akumulasi Akibat Mixed Deck",
            subPoints: [
              "Player A: Stardust-Centurion (Mixed) & Dhero",
              "Player B: Stardust-Centurion (Mixed) & Traptrix",
              "Player C: Stardust & Swordsoul",
              "Player D: Stardust & Branded",
              "Player E: Stardust & Kewl Tune",
              "Keterangan Wasit: ILEGAL. Karena archetype Stardust dan Centurion digabungkan dalam mixed deck oleh player A dan B, perhitungan batas maksimalnya wajib diakumulasikan. Tim ini mencatatkan 5 kali penggunaan unsur Stardust dan 2 kali penggunaan unsur Centurion. Total akumulasi gabungannya adalah 7 kali penggunaan, melanggar batas maksimal 5 (lima). Tim wajib merevisi susunan line-up sebelum pertandingan dimulai."
            ]
          }
        ]
      },
      {
        title: "3. Pengiriman Deck (Submit Deck)",
        points: [
          "a. Kesepuluh deck wajib dikirimkan di channel masing-masing tim selambat-lambatnya 60 menit sebelum jadwal pertandingan dimulai. Gambar screenshot deck harus yang paling terbaru.",
          "b. Keterlambatan pengiriman maksimal adalah hingga waktu kick-off pertandingan. Setiap keterlambatan pengiriman akan dipenalti dengan pemotongan waktu kontrol tim sebanyak 2 menit per deck yang terlambat.",
          "c. Jika hingga pertandingan dimulai ada slot deck yang kosong/tidak dikirim, maka slot deck tersebut otomatis dinyatakan auto-loss dan langsung menjadi poin kemenangan bagi lawan."
        ]
      }
    ]
  },
  {
    id: "F",
    title: "Aturan Pertandingan (In-Game Rules)",
    rules: [
      {
        title: "1. Waktu Kontrol (Control Time)",
        points: [
          "a. Setiap tim diberikan waktu kontrol total selama 15 menit per match.",
          "b. Penghitungan dan pengawasan waktu kontrol sepenuhnya dipegang oleh wasit yang bertugas menggunakan alat ukur resmi. Keputusan wasit mengenai sisa waktu mutlak dan tidak dapat diganggu gugat.",
          "c. Waktu berjalan ketika pemain melakukan persiapan, mengganti deck, terjadi pergantian pemain, atau pemain tidak merespons panggilan tanpa alasan jelas. Waktu berhenti (di-pause) saat pemain berada di dalam lobby/bermain.",
          "d. Jika waktu kontrol habis (00:00), tim tersebut mendapat penalti loss 1 deck, lalu diberikan tambahan waktu 3 menit. Jika 3 menit habis, terkena loss deck lagi, dan seterusnya."
        ]
      },
      {
        title: "2. Tangkapan Layar (Screenshot) Starting Hand",
        points: [
          "a. Pemain yang sedang bertanding wajib mengambil tangkapan layar (SS) starting hand di setiap game. SS wajib full screen menampilkan: hand/field sendiri, hand/field lawan, dan jumlah kartu main/extra deck lawan.",
          "b. SS wajib dikirim ke channel tim sesaat setelah game berakhir. Kegagalan melampirkan SS akan dikenakan peringatan ringan (pelanggaran 1) dan loss 1 deck (pelanggaran 2)."
        ]
      },
      {
        title: "3. Pemain Cadangan (Substitute Saat Pertandingan)",
        points: [
          "a. Jika pemain utama tidak bisa bertanding saat hari-H, ia bisa digantikan oleh anggota aktif tim lainnya (pemain cadangan) dengan izin wasit. Pergantian ini hanya diizinkan maksimal 1 (satu) kali per pertandingan.",
          "b. Pemain cadangan wajib menggunakan 2 deck yang sama persis dengan yang sudah didaftarkan/dikirimkan oleh pemain yang digantikannya.",
          "c. Apabila pemain cadangan hanya memiliki 1 dari 2 deck tersebut, maka tim otomatis mendapat kekalahan (auto-loss) pada slot deck yang tidak dimiliki. Wasit wajib memberitahu pihak lawan mengenai kekalahan ini sebelum duel dimulai. Pemain Cadangan dalam kondisi ini tidak diperbolehkan menggunakan hak pengulangan (repeat)."
        ]
      },
      {
        title: "4. Pengulangan Deck (Repeat Deck)",
        points: [
          "a. Tim memiliki kuota 2x repeat deck per match.",
          "b. Repeat hanya boleh dilakukan jika pemain kalah di game pertama tanpa sempat meraih kemenangan dengan deck pertamanya.",
          "c. Deck yang diulang akan menghapus/menggantikan slot deck kedua milik pemain tersebut. Hak pengulangan harus dideklarasikan ke wasit dan tim lawan sebelum pertandingan selanjutnya dimulai dan tidak bisa ditarik kembali."
        ]
      },
      {
        title: "5. Ruang Pertandingan (Room) & Komunikasi",
        points: [
          "a. Room dibuat khusus oleh wasit. Dilarang keras menyebarkan ID room. Hanya pemain yang sedang bertanding yang boleh berada di room. Semua pihak (menang/kalah) wajib segera keluar room setelah duel usai.",
          "b. Seluruh pemain yang didaftarkan boleh masuk ke voice chat (VC) discord TWI. Wasit akan melakukan inspeksi berkala. Terindikasi membicarakan cheat/mod/bug di VC akan berujung diskualifikasi instan. Layar (screen share) hanya boleh dilakukan oleh pemain yang sedang bertanding."
        ]
      },
      {
        title: "6. Disconnects (DC) & Glitches",
        points: [
          "a. Disconnect: Jika DC terjadi, pemain otomatis kalah di game tersebut. Wasit akan memutuskan validitas DC berdasarkan layar hasil sistem game atau kemunculan \"Simbol Disconnect\" pada SS/Video bukti yang diberikan.",
          "b. Glitches/Bug: Jika pemain mengklaim terkena glitch, ia wajib menjelaskan dan menyertakan bukti kuat (video/SS) kepada wasit selambat-lambatnya 5 menit sejak glitch terjadi.",
          "c. Apabila bukti diserahkan melewati 5 menit, laporan diabaikan dan hasil game dianggap sah. Jika bukti valid dan posisi duel imbang, rematch dapat dilakukan. Jika satu pemain sudah jelas dalam posisi \"pasti menang\" (lethal) sebelum glitch, wasit dapat memberikan kemenangan langsung tanpa rematch."
        ]
      },
      {
        title: "7. Pertandingan Seri (Draw)",
        points: [
          "a. Jika sistem game mencatatkan \"Draw\", kedua belah pihak dianggap kehilangan (loss) deck yang sedang dipakai.",
          "b. Jika \"Draw\" terjadi di partai puncak (skor 9-9), diadakan 1 game tambahan (tiebreaker duel) di mana tiap tim bebas memilih 1 pemain & 1 deck untuk bertanding ulang."
        ]
      }
    ]
  },
  {
    id: "G",
    title: "Kode Etik, Pelanggaran & Sanksi",
    rules: [
      {
        title: "Ketentuan Umum",
        points: [
          "Semua sanksi bersifat akumulatif dan diputuskan secara mutlak oleh wasit/ ketua wasit/ presiden TWI."
        ]
      },
      {
        title: "1. Peringatan Ringan (Minor Warning)",
        points: [
          "a. Diberikan atas pelanggaran administratif/teknis, seperti: telat meninggalkan room, SS starting hand tidak valid/terpotong, nama tidak sesuai, menunda waktu secara sengaja.",
          "b. Sanksi: Akumulasi 2x peringatan ringan dalam satu match = tim mendapat hukuman kekalahan (loss) 1 deck/game. Peringatan ringan berikutnya akan langsung berakibat loss deck tanpa perlu akumulasi."
        ]
      },
      {
        title: "2. Pelanggaran Deck & ID (Diskualifikasi Deck)",
        points: [
          "a. Masuk menggunakan ID/Nama akun yang salah: loss 2 deck/game.",
          "b. Ketahuan mengubah isi kartu dari deck yang sudah disubmit: loss 2 deck/game.",
          "c. Memasuki pertandingan dengan jenis/archetype deck yang salah: loss 1 deck/game."
        ]
      },
      {
        title: "3. Peringatan Berat (Major Warning) & Skorsing",
        points: [
          {
            text: "Diberikan atas tindakan fatal seperti: tidak sportif, berkata kasar/ pelecehan kepada wasit/lawan, kolusi, penggunaan cheat/mod.",
            subPoints: [
              "i. Sanksi: Pemain yang terbukti bersalah dapat didiskualifikasi (skorsing/banned) dari turnamen secara individu.",
              "ii. Apabila sebuah tim mengumpulkan 2x peringatan berat dalam satu musim, tim tersebut akan didiskualifikasi dari TWI Season 7 secara permanen, poin dicabut, dan seluruh hasil pertandingannya dianulir."
            ]
          }
        ]
      },
      {
        title: "4. W.O, Pengunduran Diri & Kolusi",
        points: [
          "a. Tim yang gagal menghadirkan minimal 3 pemain & 6 deck saat jam tanding dinyatakan kalah W.O. Tim pemenang mendapat skor (10-0), tim kalah mendapat skor (0-10).",
          "b. Jika WO dicurigai sengaja dilakukan demi mengatur klasemen (kolusi/match-fixing), investigasi mendalam akan dilakukan. Tim yang terbukti berkolusi akan di-ban permanen dari seluruh kompetisi TWI."
        ]
      }
    ]
  },
  {
    id: "H",
    title: "Aturan Bursa Transfer (Roster & Off-Season)",
    rules: [
      {
        title: "Ketentuan Jendela Transfer",
        points: [
          "Permintaan keluar/masuk anggota wajib melalui channel #transfer-request di Discord TWI.",
          "a. Off-Season (akhir musim - minggu ke-1): Transfer bebas tanpa batasan jumlah.",
          {
            text: "b. Season Transfer (minggu ke-1 - akhir regular season):",
            subPoints: [
              "i. Tim bebas merekrut \"Free Agent\" (pemain yang belum terdaftar di tim manapun).",
              "ii. Tim maksimal hanya boleh merekrut 2 (dua) pemain perpindahan dari tim lain.",
              "iii. Seorang pemain maksimal hanya boleh membela 2 tim berbeda dalam satu musim yang sama.",
              "iv. Batas waktu pemrosesan transfer adalah 1x24 jam."
            ]
          },
          "c. Playoffs Transfer (minggu terakhir - akhir playoffs): Roster di-lock. Tim dilarang mengambil pemain dari tim lain, dan hanya diizinkan merekrut Free Agent.",
          "d. PENTING. Syarat kuota tim (min 5, max 10) tetap berlaku setiap kali transfer terjadi."
        ]
      }
    ]
  },
  {
    id: "I",
    title: "Struktur Organisasi Team Wars Indonesia Season 7",
    rules: [
      {
        title: "Jajaran Kepengurusan",
        points: [
          "a. Presiden: Pradinata",
          "b. Administrator: Tsaqif",
          "c. Head of Finance: Elthor",
          "d. Match Observer: Kevin",
          "e. Chief Referee: Iqbal",
          "f. Lead Data Analyst: Fajar Haikal",
          "g. Head Of Creative: Nazz"
        ]
      }
    ]
  }
];
        
