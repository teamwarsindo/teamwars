import { NextResponse } from 'next/server';
import { discordAPI } from '@/lib/discord/utils'; // Pastikan path ini sesuai dengan helper lu

export async function GET(req: Request) {
  const appId = process.env.DISCORD_CLIENT_ID; 
  if (!appId) return NextResponse.json({ error: 'Missing Client ID' }, { status: 500 });

  // ==========================================
  // KONFIGURASI PENGIRIMAN SOP WASIT
  // ==========================================
  const channelId = "1172158841845207193"; // Channel tujuan POST
  const refereeRoleId = "604079443647922197"; // Role Referee

  // Susunan Payload dengan Embed Estetik
  const sopPayload = {
    // Content di luar embed agar notifikasi ping role masuk ke wasit
    content: `<@&${refereeRoleId}>\nMohon perhatiannya untuk seluruh wasit yang bertugas! Berikut adalah Standar Operasional Prosedur (SOP) resmi kita.`,
    embeds: [
      {
        title: "🚨 STANDAR OPERASIONAL PROSEDUR (SOP) WASIT TWI S7 🚨",
        description: "Berikut adalah panduan langkah demi langkah (Juklak) untuk wasit yang bertugas mengawal pertandingan. Mohon dibaca, dipahami, dan dijalankan dengan tegas!\n\n=============================================",
        color: 15548997, // Warna Merah (Hex: #ED4245)
        fields: [
          {
            name: "🔹 FASE 1: PERSIAPAN & PENGAWASAN DECK (H-1 Jam)",
            value: "> **Gunakan Bot:** Ketik `/reminder` dan isi jam kick-off di channel Tim A & B.\n• **Inspeksi Waktu:** Kesepuluh (10) deck wajib dikirim maksimal 60 menit sebelum kick-off.\n• **Sanksi Telat:** Potong waktu kontrol 2 menit per deck telat. Slot kosong saat kick-off = Auto-loss.\n• **Validasi Archetype:** Maksimal 5 kali pemakaian per 1 jenis archetype dalam 1 tim. Melanggar = **Loss 1 deck/game**.",
            inline: false
          },
          {
            name: "🔹 FASE 2: BRIEFING & KICK-OFF (H-30 Menit)",
            value: "> **Gunakan Bot:** Ketik `/prepare` (Tag Role Tim A, Tim B, isi ID Room) di channel Match.\n• **Persiapan Room:** Buat Room di Duel Links sesuai ID yang dikirim.\n• **Absensi VC:** Seluruh pemain terdaftar WAJIB standby di Voice Chat (VC) Discord TWI.\n• **Validasi IGN:** Masuk menggunakan ID/IGN yang salah = **Loss 2 deck/game**.",
            inline: false
          },
          {
            name: "🔹 FASE 3: IN-GAME & MANAJEMEN WAKTU (Saat Match)",
            value: "> ⏱️ **Kunci Wasit:** Siapkan *stopwatch* 15 menit per tim.\n• **Aturan Waktu:** Berjalan saat persiapan/ganti deck, di-pause saat masuk lobby/bermain.\n• **Aba-aba Mulai:** Ketik **\"START / MULAI\"** saat waktu di-pause dan pemain siap.\n• **Inspeksi SS:** WAJIB kirim SS Starting Hand (Full Screen). Gagal = **Peringatan Ringan**.\n• **DC & Glitch:** DC = Kalah otomatis. Glitch = Maks 5 menit kirim bukti valid (SS/Video).\n• **Hak Pemain:** Substitute maks 1x per match (deck persis). Repeat Deck maks 2x per match (hanya untuk deck kalah di game pertama).",
            inline: false
          },
          {
            name: "🔹 FASE 4: POST-MATCH (Selesai Pertandingan)",
            value: "• **Deklarasi Selesai:** Berakhir jika satu tim mengeliminasi 10 deck lawan. Instruksikan keluar room.\n• **Penetapan Poin:** Menang = 3 Poin, Kalah = 0 Poin.\n• **Laporan:** Susun laporan akhir (Skor, Sisa Waktu, Pelanggaran) ke channel panitia internal.",
            inline: false
          }
        ],
        footer: {
          text: "Informasi atau tugas lainnya akan ditambahkan oleh Chief Referee.\nKetegasan wasit adalah kunci kelancaran TWI Season 7. Selamat bertugas! 🛡️"
        },
        timestamp: new Date().toISOString()
      }
    ]
  };

  // Eksekusi tembakan POST ke Discord API
  let postResult = null;
  try {
    postResult = await discordAPI(`/channels/${channelId}/messages`, 'POST', sopPayload);
  } catch (error) {
    console.error("Gagal mengirim pesan SOP:", error);
    return NextResponse.json({ error: '❌ Gagal mengirim SOP ke Discord' }, { status: 500 });
  }

  // ==========================================
  // KEMBALIKAN RESPON
  // ==========================================
  return NextResponse.json({ 
    message: '✅ SOP Wasit Berhasil Dikirim sebagai Embed!', 
    result: postResult 
  });
}
