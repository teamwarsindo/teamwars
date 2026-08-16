import { RuleCategory } from "../rules-types";

export const categoryH: RuleCategory = {
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
};
