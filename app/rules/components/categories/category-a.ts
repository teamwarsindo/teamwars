import { RuleCategory } from "../rules-types";

export const categoryA: RuleCategory = {
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
};
