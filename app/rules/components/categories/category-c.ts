import { RuleCategory } from "../rules-types";

export const categoryC: RuleCategory = {
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
};
