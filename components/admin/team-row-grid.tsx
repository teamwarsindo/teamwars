"use client"

import { useState } from "react"
import { TeamData } from "@/types/admin"
import { updateTeamCore } from "@/app/admin/dashboard/actions"
import { CellText } from "./cell-text"
import { CellImage } from "./cell-image"
import { RosterModal } from "./roster-modal"
import Swal from "sweetalert2"

export function TeamRowGrid({ initialTeam }: { initialTeam: TeamData }) {
  const [team, setTeam] = useState<TeamData>(initialTeam)
  const [showRoster, setShowRoster] = useState(false)

  const handleUpdate = async (field: keyof TeamData, val: any) => {
    // Optimistic Update UI
    const updatedTeam = { ...team, [field]: val };
    setTeam(updatedTeam); 
    
    // Simpan ke DB
    const res = await updateTeamCore(team.id, { [field]: val })
    if (!res.success) Swal.fire("Error", res.error as string, "error")
  }

  // Hitung jumlah verified
  const verifiedCount = team.players.filter(p => p.isVerified).length;
  const totalRoster = team.players.length;

  return (
    <>
      <tr className="hover:bg-primary/5 transition-colors border-b border-border/30 group">
        
        {/* Identitas (Bisa diedit) */}
        <td className="px-4 py-2 border-r border-border/20">
          <div className="flex items-center gap-2 min-w-[180px]">
            <div className="relative w-4 h-4 rounded-full overflow-hidden shrink-0 border border-border">
              <input type="color" value={team.hex || "#ffffff"} onChange={(e) => handleUpdate("hex", e.target.value)} className="absolute -inset-2 w-8 h-8 cursor-pointer" title="Ubah Warna" />
            </div>
            <CellText val={team.namaTim} onSave={(v) => handleUpdate("namaTim", v)} />
          </div>
        </td>
        <td className="px-4 py-2 border-r border-border/20"><CellText val={team.email} type="email" onSave={(v) => handleUpdate("email", v)} /></td>
        
        {/* Dokumen Gambar */}
        <td className="px-4 py-2 border-r border-border/20">
          <div className="flex items-center gap-3">
            <CellImage url={team.logoTim} teamName={team.namaTim} type="logo" onSave={(url) => handleUpdate("logoTim", url)} />
            <CellImage url={team.buktiTransfer} teamName={team.namaTim} type="bukti" onSave={(url) => handleUpdate("buktiTransfer", url)} />
          </div>
        </td>

        {/* Status Form Dropdown */}
        <td className="px-4 py-2 border-r border-border/20 min-w-[150px]">
          <select value={team.statusVerifikasi} onChange={(e) => handleUpdate("statusVerifikasi", e.target.value)} className="bg-transparent border border-border/50 text-xs rounded p-1.5 w-full outline-none focus:border-primary">
            <option value="Pending" className="bg-background text-yellow-500">Pending</option>
            <option value="Verified" className="bg-background text-green-500">Verified</option>
            <option value="Rejected" className="bg-background text-red-500">Rejected</option>
          </select>
        </td>

        {/* Roster & Progress */}
        <td className="px-4 py-2 border-r border-border/20 min-w-[120px]">
          <div className="flex flex-col items-center">
            <span className={`text-xs font-bold ${verifiedCount === totalRoster ? "text-green-500" : "text-yellow-500"}`}>
              {verifiedCount} / {totalRoster} Valid
            </span>
            <button onClick={() => setShowRoster(true)} className="text-[10px] mt-1 bg-primary/20 hover:bg-primary text-primary hover:text-white px-2 py-1 rounded w-full transition-colors">
              Lihat Roster
            </button>
          </div>
        </td>

        {/* Link Edit Mandiri */}
        <td className="px-4 py-2 text-center min-w-[100px]">
          <a href={`/edit-team/${team.editToken}`} target="_blank" rel="noreferrer" className="text-xs bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded shadow">Edit Link ↗</a>
        </td>
      </tr>

      {showRoster && <RosterModal team={team} onClose={() => setShowRoster(false)} onUpdate={(players) => handleUpdate("players", players)} />}
    </>
  )
        }
