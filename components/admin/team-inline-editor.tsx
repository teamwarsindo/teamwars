"use client"

import { TeamData } from "@/types/admin"
import { updateTeamCore } from "@/app/admin/dashboard/actions"
import { InlineEditField } from "./inline-edit-field"
import Swal from "sweetalert2"

export function TeamInlineEditor({ team }: { team: TeamData }) {
  
  const handleUpdate = async (field: string, val: string | any[]) => {
    const res = await updateTeamCore(team.id, { [field]: val })
    if (!res.success) Swal.fire("Error", res.error as string, "error")
  }

  const handleSwapCaptain = async () => {
    if (team.players.length < 2) return Swal.fire("Gagal", "Minimal 2 pemain.", "error")
    const newPlayers = [...team.players];
    [newPlayers[0], newPlayers[1]] = [newPlayers[1], newPlayers[0]];
    await handleUpdate("players", newPlayers)
  }

  return (
    <div className="p-4 sm:p-6 bg-primary/5 border-b border-border/50 animate-in slide-in-from-top-2 duration-300">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Identitas (Inline Edit) */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-primary uppercase border-b border-primary/20 pb-1">Identitas (Inline Edit)</h4>
          <InlineEditField label="Nama Tim" value={team.namaTim} onSave={(val) => handleUpdate("namaTim", val)} />
          <InlineEditField label="Email Kapten" value={team.email} type="email" onSave={(val) => handleUpdate("email", val)} />
          <InlineEditField label="Warna (Hex)" value={team.hex} onSave={(val) => handleUpdate("hex", val)} />
        </div>

        {/* Status Roster */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-primary uppercase border-b border-primary/20 pb-1">Manajemen Roster</h4>
          {team.players.length >= 2 ? (
            <div className="flex flex-col gap-2 bg-background/50 p-3 rounded-xl border border-border/50">
              <div className="text-xs"><span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold mr-2">P1</span>{team.players[0].ign}</div>
              <button onClick={handleSwapCaptain} className="bg-muted hover:bg-primary hover:text-white text-[10px] py-1 rounded transition-colors mx-4 shadow">↕ Tukar Kapten ↕</button>
              <div className="text-xs"><span className="bg-muted px-1.5 py-0.5 rounded font-bold mr-2">P2</span>{team.players[1].ign}</div>
            </div>
          ) : <p className="text-xs text-muted-foreground">Roster tidak lengkap.</p>}
        </div>

        {/* Dokumen & Aksi Lanjutan */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-primary uppercase border-b border-primary/20 pb-1">Dokumen & Form Penuh</h4>
          <div className="flex flex-col gap-2">
            <a href={team.logoTim || "#"} target="_blank" rel="noreferrer" className="text-xs bg-background/50 border border-border/50 p-2 rounded hover:border-primary transition-colors">🖼️ Lihat Logo Tim</a>
            <a href={team.buktiTransfer || "#"} target="_blank" rel="noreferrer" className="text-xs bg-background/50 border border-border/50 p-2 rounded hover:border-primary transition-colors">💵 Lihat Bukti Transfer</a>
            <p className="text-[9px] text-muted-foreground mt-1">Untuk update dokumen dan tambah/hapus roster, silakan gunakan tombol "Buka Edit Tim" di sebelah kanan atas.</p>
          </div>
        </div>

      </div>
    </div>
  )
}
