import { RuleCategory } from "../rules-types";

export const categoryF: RuleCategory = {
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
};
