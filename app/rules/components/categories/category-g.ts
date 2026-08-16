import { RuleCategory } from "../rules-types";

export const categoryG: RuleCategory = {
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
};
