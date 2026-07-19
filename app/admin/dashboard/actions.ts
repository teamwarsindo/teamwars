"use server"

import { kv } from "@vercel/kv"
import { revalidatePath } from "next/cache"
import { TeamData } from "@/types/admin"

// 1. Ambil Semua Data Tim
export async function getTeamsCore(): Promise<TeamData[]> {
  try {
    const keys = await kv.keys("teams:*")
    if (keys.length === 0) return []

    const pipeline = kv.pipeline()
    keys.forEach((key) => pipeline.hgetall(key))
    const results = await pipeline.exec()

    return results.map((data: any, index) => {
      let players = []
      try {
        players = typeof data.players === "string" ? JSON.parse(data.players) : (data.players || [])
      } catch (e) { players = [] }

      return {
        id: keys[index].replace("teams:", ""),
        namaTim: data.namaTim || "",
        email: data.email || "",
        logoTim: data.logoTim || null,
        buktiTransfer: data.buktiTransfer || null,
        players: players,
        editToken: data.editToken || null,
        warna: data.warna || "#ffffff",
        statusVerifikasi: data.statusVerifikasi || "Pending",
      }
    })
  } catch (error) {
    console.error("Error fetching teams:", error)
    return []
  }
}

// 2. Simpan Perubahan Tim
export async function updateTeamCore(teamId: string, updateData: Partial<TeamData>) {
  try {
    const key = `teams:${teamId}`;
    
    // Siapkan payload, jika ada update array players, ubah ke string JSON
    const payload: Record<string, any> = { ...updateData };
    if (updateData.players) {
      payload.players = JSON.stringify(updateData.players);
    }

    await kv.hset(key, payload);
    
    // Refresh halaman dashboard agar data terbaru langsung muncul
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
