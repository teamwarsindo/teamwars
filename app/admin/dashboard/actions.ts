"use server"

import { kv } from "@vercel/kv"
import { revalidatePath } from "next/cache"
import { TeamData } from "@/types/admin"

export async function getTeamsCore(): Promise<TeamData[]> {
  try {
    const keys = await kv.keys("teams:*")
    if (keys.length === 0) return []

    const pipeline = kv.pipeline()
    keys.forEach((k) => pipeline.hgetall(k))
    const results = await pipeline.exec()

    return results.map((data: any, idx) => ({
      id: keys[idx].replace("teams:", ""),
      namaTim: data.namaTim || "",
      email: data.email || "",
      hex: data.warna || "#00BFFF",
      logoTim: data.logoTim || null,
      buktiTransfer: data.buktiTransfer || null,
      players: typeof data.players === "string" ? JSON.parse(data.players) : (data.players || []),
      editToken: data.editToken || null,
      statusVerifikasi: data.statusVerifikasi || "Pending",
    }))
  } catch (error) {
    return []
  }
}

export async function updateTeamCore(teamId: string, updateData: Partial<TeamData>) {
  try {
    const key = `teams:${teamId}`;
    const existing: any = await kv.hgetall(key);
    if (!existing) throw new Error("Data tim tidak ditemukan.");

    const payload = {
      ...existing,
      namaTim: updateData.namaTim ?? existing.namaTim,
      email: updateData.email ?? existing.email,
      warna: updateData.hex ?? existing.warna,
      logoTim: updateData.logoTim ?? existing.logoTim,
      buktiTransfer: updateData.buktiTransfer ?? existing.buktiTransfer,
      players: updateData.players ? JSON.stringify(updateData.players) : existing.players,
    };

    await kv.hset(key, payload);
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
        }
      
