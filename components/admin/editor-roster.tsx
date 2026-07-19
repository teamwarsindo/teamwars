"use client"

import { TeamData } from "@/types/admin"
import Swal from "sweetalert2"

export function EditorRoster({ formData, setFormData }: { formData: TeamData, setFormData: (d: TeamData) => void }) {
  
  const handleSwapCaptain = () => {
    if (formData.players.length < 2) {
      Swal.fire("Gagal", "Minimal 2 pemain untuk swap.", "error");
      return;
    }
    const newPlayers = [...formData.players];
    [newPlayers[0], newPlayers[1]] = [newPlayers[1], newPlayers[0]]; // Swap logic
    setFormData({ ...formData, players: newPlayers });
  }

  return (
    <section className="glass glow-border rounded-xl border p-5 bg-background/50 space-y-4">
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <h3 className="text-sm font-bold text-primary">Manajemen Roster</h3>
        <a href={`/registration?edit=${formData.editToken}`} target="_blank" rel="noreferrer" className="text-[10px] bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded font-bold">Buka Form Bypass ↗</a>
      </div>
      
      {formData.players.length >= 2 ? (
        <div className="flex flex-col gap-2 max-w-sm">
          <div className="flex justify-between items-center bg-primary/10 border border-primary/20 p-3 rounded-lg text-sm">
            <div className="flex items-center gap-2"><span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded">P1 (KAPTEN)</span><span className="font-semibold">{formData.players[0].ign}</span></div>
          </div>
          <div className="flex justify-center -my-3 relative z-10">
            <button type="button" onClick={handleSwapCaptain} className="bg-background border border-border hover:border-primary text-muted-foreground hover:text-primary rounded-full w-8 h-8 flex items-center justify-center transition-all shadow-md text-sm">↕</button>
          </div>
          <div className="flex justify-between items-center bg-background border border-border p-3 rounded-lg text-sm">
            <div className="flex items-center gap-2"><span className="bg-muted text-muted-foreground text-[10px] font-bold px-2 py-0.5 rounded">P2 (WAKIL)</span><span className="text-muted-foreground">{formData.players[1].ign}</span></div>
          </div>
        </div>
      ) : <p className="text-xs text-muted-foreground">Roster tidak lengkap.</p>}
    </section>
  )
              }
