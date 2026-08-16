import { RuleCategory } from "../rules-types";

export const categoryE: RuleCategory = {
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
};
        
