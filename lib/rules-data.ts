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
          "b. Struktur keanggotaan wajib memiliki 1 ketua tim dan 1 wakil ketua. Ketua dan wakil ketua terhitung sebagai anggota tim.",
          "c. Setiap pemain hanya diperbolehkan terdaftar di 1 tim pada waktu yang bersamaan."
        ]
      },
      {
        title: "3. Tata Kelola Tim & Kepemimpinan",
        points: [
          "a. Hanya ketua atau wakil ketua yang memiliki hak untuk mewakili tim dalam voting resmi penyelenggara dan mengajukan Transfer/Substitute pemain.",
          "b. Ketua atau wakil ketua yang tidak menggunakan hak vote ketika diminta, akan kehilangan hak suaranya untuk sesi tersebut.",
          "c. Ketua atau wakil ketua yang ingin keluar dari tim wajib memindahkan posisinya kepada anggota lain terlebih dahulu.",
          "d. Apabila ketua tidak aktif selama 7 hari (168 jam) dan terdapat pengaduan dari anggota, posisi ketua akan dialihkan kepada perwakilan yang ditunjuk pelapor/anggota."
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
          "a. TWI Season 7 menggunakan format round robin atau swiss system, serta mekanisme kelolosan menuju playoffs yang disesuaikan dengan total pendaftar.",
          "b. Setiap pertandingan (match) mempertemukan 5 pemain dari masing-masing tim, setiap pemain wajib membawa 2 deck (total 10 deck per tim).",
          "c. Sistem pertandingan menggunakan format 1v1 elimination. Deck yang kalah langsung tereliminasi. Pemain menang akan terus bertanding menggunakan deck yang sama.",
          "d. Pertandingan berakhir ketika salah satu tim mengeliminasi seluruh (10) deck lawan."
        ]
      },
      {
        title: "2. Perhitungan Poin Klasemen",
        points: [
          "a. Menang match: Mendapatkan 3 Poin.",
          "b. Kalah match: Mendapatkan 0 Poin.",
          "c. Menang W.O: Mendapatkan 3 poin dan 10 points scored (skor otomatis 10-0).",
          "d. Kalah W.O: Mendapatkan 0 poin dan 0 points scored (skor otomatis 0-10)."
        ]
      },
      {
        title: "3. Ketentuan Tiebreakers",
        points: [
          {
            text: "Apabila poin klasemen sama, peringkat final ditentukan berdasarkan kriteria berikut secara berurutan:",
            subPoints: [
              "a. Match Wins: Jumlah total kemenangan pertandingan",
              "b. Indikator Efisiensi Fase: Points difference (Round Robin) atau median-buchholz (Swiss System)",
              "c. Points Scored: Total akumulasi poin kemenangan deck sepanjang musim",
              "d. Head-to-Head (H2H)",
              "e. Tiebreaker Match: Laga ekstra (3 pemain & 6 deck per tim)."
            ]
          }
        ]
      }
    ]
  },
  {
    id: "C",
    title: "Jadwal Pertandingan & Reschedule",
    rules: [
      {
        title: "1. Jadwal Resmi & Kapasitas",
        points: [
          "Jadwal Resmi (Default Schedule): Penyelenggara akan merilis jadwal resmi. Seluruh tim wajib mematuhi jam tanding kecuali mengajukan reschedule.",
          "Kapasitas Pertandingan: Panitia menetapkan batas maksimal pengawasan 3 (tiga) match per hari."
        ]
      },
      {
        title: "2. Prosedur Reschedule",
        points: [
          "a. Permintaan reschedule wajib diajukan kepada tim lawan dan wasit maksimal 24 jam sebelum jadwal resmi.",
          "b. Reschedule sah jika kedua tim sepakat waktu baru & kuota hari tersebut belum penuh (3 match/hari).",
          "c. Jika tidak ada kesepakatan atau slot penuh, jadwal dikembalikan ke jadwal resmi. Tim yang tidak hadir akan di W.O."
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
          "1. Kartu & BOX: Semua kartu (main box, mini box, event, dll) LEGAL sejak hari rilis resmi di game.",
          "2. Skill: Semua skill legal sejak dirilis.",
          "3. Banlist: Aturan banlist TWI langsung diterapkan setelah daftar resmi diumumkan, meski belum aktif di dalam game.",
          "4. Bug/Glitches: Legalitas kartu/skill yang mengalami bug akan ditangguhkan dan dibahas per kasus."
        ]
      }
    ]
  },
  {
    id: "E",
    title: "Peraturan Pra-Pertandingan",
    rules: [
      {
        title: "1. ID & Nama Pemain",
        points: [
          "a. Ketua tim wajib memastikan ID dan in-game name sesuai dengan data registrasi.",
          "b. Dilarang menggunakan ID sama dengan pemain lain. Kesalahan ID berakibat sanksi loss deck."
        ]
      },
      {
        title: "2. Aturan Komposisi Deck",
        points: [
          "a. Tiap pemain wajib menggunakan 2 deck dengan archetype utama berbeda.",
          "b. Limit archetype tim: Maksimal penggunaan 1 jenis archetype yang sama adalah 5 kali penggunaan per tim.",
          "c. Definisi archetype: Minimal 3 kartu dengan kesamaan nama. Kurang dari itu diklasifikasikan 'Deck Khusus'.",
          "d. Mixed Deck: Penggabungan archetype wajib diakumulasikan. Total unsur gabungan tidak boleh melebihi batas 5 kali."
        ]
      },
      {
        title: "3. Submit Deck",
        points: [
          "a. 10 deck wajib dikirim di channel tim selambatnya 60 menit sebelum pertandingan (Screenshot terbaru).",
          "b. Keterlambatan dikenakan penalti pemotongan waktu kontrol 2 menit per deck yang terlambat.",
          "c. Slot deck yang tidak dikirim hingga pertandingan dimulai dinyatakan auto-loss."
        ]
      }
    ]
  },
  {
    id: "F",
    title: "Aturan Pertandingan (In-Game)",
    rules: [
      {
        title: "1. Waktu Kontrol",
        points: [
          "Setiap tim mendapat waktu kontrol total 15 menit per match, diawasi oleh wasit.",
          "Waktu berjalan saat persiapan, ganti deck, absen pemain. Waktu berhenti saat duel berlangsung.",
          "Jika waktu habis (00:00), tim terkena loss 1 deck dan diberi tambahan 3 menit."
        ]
      },
      {
        title: "2. Ketentuan Lainnya",
        points: [
          "Screenshot Starting Hand: Wajib full screen dikirim tiap game usai. Kegagalan berujung minor warning/loss deck.",
          "Pemain Cadangan: Hanya 1x per match. Wajib pakai 2 deck yang sama persis dengan pemain yang diganti.",
          "Repeat Deck: Kuota 2x per match jika kalah di game pertama tanpa kemenangan. Deck yang diulang menghapus slot deck kedua.",
          "Room & Komunikasi: Room dibuat wasit, dilarang sebar ID. Semua pemain wajib di VC Discord TWI.",
          "Disconnects: Pemain DC otomatis kalah, kecuali glitch yang dilaporkan dengan bukti dalam 5 menit.",
          "Draw: Kedua belah pihak kehilangan deck. Jika draw di partai puncak (9-9), diadakan tiebreaker 1 game."
        ]
      }
    ]
  },
  {
    id: "G",
    title: "Pelanggaran & Sanksi",
    rules: [
      {
        title: "1. Kategori Pelanggaran",
        points: [
          "Minor Warning: Pelanggaran teknis/administratif. 2x Minor Warning dalam 1 match = loss 1 deck.",
          "Pelanggaran Deck/ID: Salah ID/Nama (loss 2 deck), Ubah isi deck (loss 2 deck), Salah archetype (loss 1 deck).",
          "Major Warning: Tidak sportif, berkata kasar, kolusi, cheat. Sanksi: Banned individu/diskualifikasi tim permanen.",
          "W.O: Gagal hadir (minimal 3 pemain & 6 deck). Terindikasi kolusi W.O = Banned permanen."
        ]
      }
    ]
  },
  {
    id: "H",
    title: "Aturan Bursa Transfer",
    rules: [
      {
        title: "Ketentuan Jendela Transfer",
        points: [
          "1. Off-Season (akhir musim - mgg 1): Transfer bebas tanpa batasan.",
          "2. Season Transfer: Bebas ambil Free Agent, maks 2 pemain dari tim lain. 1 pemain maks bela 2 tim/musim.",
          "3. Playoffs Transfer: Roster di-lock, hanya boleh ambil Free Agent.",
          "PENTING: Syarat kuota tim (min 5, max 10) tetap berlaku setiap transfer."
        ]
      }
    ]
  },
  {
    id: "I",
    title: "Struktur Organisasi TWI Season 7",
    rules: [
      {
        title: "Jajaran Kepengurusan",
        points: [
          "Presiden: Adriansyah Pratama Putra",
          "Administrator: Achmad Nuruddin",
          "Head of Finance: Victor Widiaputra",
          "Head of Competition: Agung Mahendra",
          "Chief Referee: Xenon Yanu",
          "Lead Data Analyst: Fajar Haikal",
          "Head Of Creative: Nazz Rill"
        ]
      }
    ]
  }
];
  
