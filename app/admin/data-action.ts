"use server"

import { kv } from "@vercel/kv"

export async function getTeamsData() {
  try {
    // 1. Cari semua key yang berawalan "teams:"
    const keys = await kv.keys("teams:*")
    
    if (keys.length === 0) return []

    // 2. Gunakan pipeline untuk mengambil seluruh isi Hash sekaligus (Lebih cepat dari loop biasa)
    const pipeline = kv.pipeline()
    keys.forEach((key) => pipeline.hgetall(key))
    const results = await pipeline.exec()

    // 3. Format dan rapikan datanya
    const formattedTeams = results.map((data: any, index) => {
      // Parse data pemain (karena di Redis Hash, array/object sering disimpan sebagai string JSON)
      let players = []
      try {
        players = typeof data.players === "string" ? JSON.parse(data.players) : (data.players || [])
      } catch (e) {
        players = []
      }

      // Ambil data kapten (asumsi pemain pertama di array adalah kapten)
      const captain = players.length > 0 ? players[0] : null

      return {
        id: keys[index].replace("teams:", ""), // Ambil slug tim (contoh: asashin-og)
        namaTim: data.namaTim || "Unknown Team",
        email: data.email || "-",
        kaptenDiscord: captain?.discord || captain?.discordId || "-",
        kaptenIgn: captain?.ign || captain?.nama || "Tidak diketahui",
        statusVerifikasi: data.statusVerifikasi || "Pending",
        createdAt: data.createdAt || 0, // Bisa timestamp atau ISO string
        warna: data.warna || "#ffffff",
        logoTim: data.logoTim || null,
        buktiTransfer: data.buktiTransfer || null,
        playersCount: players.length
      }
    })

    // Urutkan dari yang terbaru daftar (berdasarkan createdAt)
    return formattedTeams.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return dateB - dateA
    })

  } catch (error) {
    console.error("Gagal mengambil data tim:", error)
    return [] // Kembalikan array kosong jika error
  }
          }
