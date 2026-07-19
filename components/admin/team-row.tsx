"use client"

import { useState } from "react"
import { TeamData } from "@/types/admin"
import { TeamInlineEditor } from "./team-inline-editor"

export function TeamRow({ team }: { team: TeamData }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <>
      <tr className={`hover:bg-primary/5 transition-colors ${isExpanded ? "bg-primary/10" : ""}`}>
        <td className="px-4 py-3 font-medium flex items-center gap-2">
          <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: team.hex }}></span>
          {team.namaTim}
        </td>
        <td className="px-4 py-3 font-semibold text-primary">{team.players[0]?.ign || "-"}</td>
        <td className="px-4 py-3 text-muted-foreground">{team.players[1]?.ign || "-"}</td>
        <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
          
          {/* Tombol Bypass Langsung (Sesuai Struktur URL Asli) */}
          <a 
            href={`/edit-team/${team.editToken}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs bg-indigo-500 text-white font-bold px-3 py-1.5 rounded hover:bg-indigo-600 transition-colors shadow-lg"
          >
            Edit Tim ↗
          </a>

          {/* Tombol Expand/Collapse Inline Edit */}
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className={`text-xs font-bold px-3 py-1.5 rounded transition-all border ${isExpanded ? "bg-primary text-white border-primary" : "bg-transparent text-primary border-primary/50 hover:bg-primary/20"}`}
          >
            {isExpanded ? "Tutup ⬆️" : "Detail ⬇️"}
          </button>

        </td>
      </tr>
      
      {/* Jika di-expand, render Editor di bawahnya (memakan 4 kolom penuh) */}
      {isExpanded && (
        <tr>
          <td colSpan={4} className="p-0 border-b border-primary/20">
            <TeamInlineEditor team={team} />
          </td>
        </tr>
      )}
    </>
  )
}
