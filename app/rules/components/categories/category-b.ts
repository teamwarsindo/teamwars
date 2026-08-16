import { RuleCategory } from "../rules-types";

export const categoryB: RuleCategory = {
  id: "B",
  title: "Format Turnamen & Sistem Poin",
  rules: [
    {
      title: "1. Struktur Grup & Format Pertandingan",
      points: [
        {
          text: "a. Team Wars Indonesia Season 7 menggunakan format Single Round Robin pada fase grup. Sebanyak 16 tim peserta dibagi secara merata ke dalam 2 (dua) grup:",
          subPoints: [
            "i. Grup A: Anda Yakin?",
            "ii. Grup B: Sakurasawa Fighters"
          ]
        },
        "b. Penentuan pembagian grup dilakukan secara transparan melalui proses drawing / pengundian (roulette wheel) yang disiarkan langsung di server Discord resmi TWI sebelum turnamen dimulai.",
        "c. Setiap pertandingan (match) mempertemukan 5 pemain dari masing-masing tim, di mana setiap pemain wajib membawa 2 deck (total 10 deck per tim).",
        "d. Sistem pertandingan menggunakan format 1v1 elimination. Deck yang kalah akan langsung tereliminasi dari match. Pemain yang menang akan terus bertanding menggunakan deck yang sama sampai deck tersebut kalah.",
        "e. Pertandingan resmi berakhir ketika salah satu tim berhasil mengeliminasi seluruh (10) deck milik tim lawan (mencapai 10 kemenangan)."
      ]
    },
    {
      title: "2. Mekanisme Kualifikasi Babak Lanjutan",
      points: [
        "Sistem kualifikasi telah ditentukan untuk meloloskan sebanyak 12 tim dari total 16 tim peserta fase grup menuju babak Playoff, di mana sisa tim di luar Top 2 masing-masing grup akan diakumulasikan ke dalam klasemen Standing Global Wildcard untuk memperebutkan Top 8 Wildcard:",
        "a. Top 2 Anda Yakin? (Rank 1 & 2): Lolos otomatis langsung menuju babak Quarter Finals.",
        "b. Top 2 Sakurasawa Fighters (Rank 1 & 2): Lolos otomatis langsung menuju babak Quarter Finals.",
        "c. Top 8 Wildcard (Rank 1 s/d 8): Lolos playoff menuju babak Round 1 (Play-Ins)."
      ]
    },
    {
      title: "3. Perhitungan Poin Klasemen",
      points: [
        "a. Menang match: Mendapatkan 1 poin kemenangan (1-0).",
        "b. Kalah match: Mendapatkan 1 poin kekalahan (0-1).",
        "c. Menang W.O (walkover): Mendapatkan 1 poin kemenangan dan 10 points scored win (1-0, +10).",
        "d. Kalah W.O (walkover): Mendapatkan 1 poin kekalahan dan 10 points scored lose (0-1, -10)."
      ]
    },
    {
      title: "4. Ketentuan Tiebreakers (Penentuan Peringkat Klasemen)",
      points: [
        "Apabila terdapat dua tim atau lebih yang memiliki rekor Match W-L yang sama di akhir fase, peringkat final akan ditentukan secara berurutan berdasarkan kriteria berikut:",
        "a. Points Difference (Pts Diff): Selisih antara total points scored win dengan points scored lose.",
        "b. Points Scored (Scored): Total akumulasi kemenangan deck/game yang dikumpulkan sepanjang musim.",
        "c. Head-to-Head (H2H): Hasil pertandingan langsung antara tim yang bersangkutan.",
        "d. Tiebreaker Match: Jika masih seri setelah kriteria di atas, diadakan laga ekstra. Masing-masing tim mengirim 3 pemain dengan 2 deck (total 6 deck), menggunakan aturan TWI Season 7 yang berlaku."
      ]
    }
  ]
};
