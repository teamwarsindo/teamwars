"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { TeamData } from "./types"

interface TeamModalProps {
  team: TeamData
  onClose: () => void
}

export function TeamModal({ team, onClose }: TeamModalProps) {
  const [modalTab, setModalTab] = useState<"ROSTER" | "SETTINGS">("ROSTER")
  const [isCopied, setIsCopied] = useState(false)

  const handleCopyLink = (token: string) => {
    const link = `https://teamwars.web.id/registration?edit=${token}`
    navigator.clipboard.writeText(link)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  // --- MOCKUP FUNGSI ACTION API ---
  const handleSwapCaptain = async (playerIndex: number) => {
    if(!window.confirm("Jadikan pemain ini sebagai Kapten?")) return;
    alert(`Mockup: Memanggil API untuk menukar kapten ke index ${playerIndex}...`)
  }

  const handleRevokeRole = async (discordId?: string) => {
    if(!window.confirm("Cabut role tim dari user Discord ini?")) return;
    alert(`Mockup: Memanggil Bot Discord untuk mencabut role dari ID ${discordId}...`)
  }

  const handleUpdateTeamData = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    alert("Mockup: Menyimpan perubahan Nama Tim dan Email...")
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-background border border-primary/30 w-full max-w-3xl rounded-2xl shadow-[0_0_50px_-10px_rgba(220,38,38,0.3)] flex flex-col h-[85vh] sm:h-[80vh] overflow-hidden">
        
        {/* 1. Header Modal */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border/50 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-border/50 bg-background/50 shadow-inner">
              <span className="w-4 h-4 rounded-full" style={{ backgroundColor: team.warna }}></span>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold">{team.namaTim}</h2>
              <p className="text-xs text-muted-foreground font-mono">ID: {team.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-muted hover:bg-red-500 hover:text-white transition-colors">✕</button>
        </div>

        {/* 2. Navigasi Tab Internal Modal */}
        <div className="flex border-b border-border/50 bg-zinc-900/30">
          <button 
            onClick={() => setModalTab("ROSTER")}
            className={cn("flex-1 py-3 text-xs sm:text-sm font-semibold uppercase tracking-wider transition-colors", modalTab === "ROSTER" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:bg-muted/50")}
          >
            👥 Roster & Discord
          </button>
          <button 
            onClick={() => setModalTab("SETTINGS")}
            className={cn("flex-1 py-3 text-xs sm:text-sm font-semibold uppercase tracking-wider transition-colors", modalTab === "SETTINGS" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:bg-muted/50")}
          >
            ⚙️ Data & Akses Edit
          </button>
        </div>

        {/* 3. Area Konten Modal (Scrollable) */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 bg-background/50">
          
          {/* TAB A: ROSTER & DISCORD SYNC */}
          {modalTab === "ROSTER" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5">
                <div>
                  <h4 className="text-xs font-bold uppercase text-indigo-400 mb-1">Discord Role ID</h4>
                  <code className="text-sm font-mono text-zinc-300">{team.discordRoleId || "Belum ada role ter-assign"}</code>
                </div>
                <button className="mt-3 sm:mt-0 text-xs bg-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded hover:bg-indigo-500/30 transition-colors font-semibold">
                  🔄 Sync Ulang Role
                </button>
              </div>

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Susunan Pemain ({team.playersCount})</h3>
                <div className="space-y-3">
                  {team.players.map((player, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-border/50 bg-background/30 gap-3">
                      <div className="flex items-center gap-3">
                        {idx === 0 ? (
                          <span className="w-8 h-8 rounded bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">CPT</span>
                        ) : (
                          <span className="w-8 h-8 rounded bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold shrink-0">P{idx+1}</span>
                        )}
                        <div>
                          <p className="font-bold text-sm">{player.ign}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground font-mono">Discord: {player.discord}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {idx !== 0 && (
                          <button onClick={() => handleSwapCaptain(idx)} className="text-[10px] sm:text-xs border border-primary/50 text-primary px-2 py-1.5 rounded hover:bg-primary hover:text-white transition-colors">
                            Jadikan Kapten
                          </button>
                        )}
                        <button onClick={() => handleRevokeRole(player.discordId)} className="text-[10px] sm:text-xs bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-1.5 rounded hover:bg-red-500 hover:text-white transition-colors flex items-center gap-1">
                          ✖ Revoke Role
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB B: SETTINGS & LINK EDIT */}
          {modalTab === "SETTINGS" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 shadow-inner">
                <h4 className="text-xs font-bold uppercase text-primary mb-2">🔗 Akses Link Edit Tim (Bypass)</h4>
                <p className="text-[10px] text-muted-foreground mb-3">
                  Jika kapten tim tidak menerima email, copy link ini dan berikan langsung kepadanya agar mereka bisa mengubah anggota / deck mandiri.
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-background border border-border/50 rounded px-3 py-2 text-[10px] sm:text-xs font-mono text-zinc-400 truncate select-all">
                    {team.editToken ? `https://teamwars.web.id/registration?edit=${team.editToken}` : "Token tidak ditemukan"}
                  </div>
                  <button 
                    onClick={() => handleCopyLink(team.editToken || "")}
                    disabled={!team.editToken}
                    className="bg-primary text-white text-xs px-3 py-2 rounded hover:bg-primary/80 font-bold transition-colors disabled:opacity-50 shrink-0"
                  >
                    {isCopied ? "Tersalin!" : "Copy"}
                  </button>
                </div>
              </div>

              <form onSubmit={handleUpdateTeamData} className="p-4 sm:p-5 rounded-xl border border-border/50 bg-background/30 space-y-4">
                <h4 className="text-xs font-bold uppercase text-muted-foreground border-b border-border/50 pb-2 mb-4">Edit Data Inti</h4>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Nama Tim</label>
                  <input type="text" defaultValue={team.namaTim} className="w-full bg-background border border-input rounded px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Email Kapten (Notifikasi)</label>
                  <input type="email" defaultValue={team.email} className="w-full bg-background border border-input rounded px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div className="pt-2">
                  <button type="submit" className="w-full bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700 py-2.5 rounded text-xs font-bold tracking-wider transition-colors">
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
