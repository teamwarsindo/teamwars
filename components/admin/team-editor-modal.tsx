"use client"

import { useState } from "react"
import { TeamData } from "@/types/admin"
import { updateTeamCore } from "@/app/admin/dashboard/actions"

interface TeamEditorModalProps {
  team: TeamData;
  onClose: () => void;
}

export function TeamEditorModal({ team, onClose }: TeamEditorModalProps) {
  // State lokal untuk form agar tidak langsung mengubah data asli sebelum di-save
  const [formData, setFormData] = useState<TeamData>(team)
  const [isSaving, setIsSaving] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  // Fungsi Tukar Posisi Kapten (Index 0) dan Wakil (Index 1)
  const handleSwapCaptain = () => {
    if (formData.players.length < 2) return;
    
    const newPlayers = [...formData.players];
    // Tukar posisi array 0 dan 1
    const temp = newPlayers[0];
    newPlayers[0] = newPlayers[1];
    newPlayers[1] = temp;

    setFormData({ ...formData, players: newPlayers });
  }

  // Fungsi Copy Link Bypass
  const handleCopyLink = () => {
    const link = `https://teamwars.web.id/registration?edit=${team.editToken}`
    navigator.clipboard.writeText(link)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  // Submit ke Server Action
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Kirim hanya field yang relevan untuk diupdate
    await updateTeamCore(team.id, {
      namaTim: formData.namaTim,
      email: formData.email,
      logoTim: formData.logoTim,
      buktiTransfer: formData.buktiTransfer,
      players: formData.players
    });
    
    setIsSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-background border border-primary/30 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header Modal */}
        <div className="flex justify-between items-center p-5 border-b border-border/50">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: team.warna }}></span>
            Edit Tim: {team.namaTim}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white">✕</button>
        </div>

        {/* Konten Form yang bisa di-scroll */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          
          {/* Section 1: Link Token */}
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <label className="text-[10px] font-bold uppercase text-primary mb-1 block">Link Akses Peserta (Edit Mandiri)</label>
            <div className="flex gap-2">
              <input readOnly value={`https://teamwars.web.id/registration?edit=${team.editToken}`} className="flex-1 bg-black/50 text-xs px-2 py-1.5 rounded border border-border text-muted-foreground" />
              <button type="button" onClick={handleCopyLink} className="bg-primary px-3 py-1.5 text-xs text-white rounded font-bold">
                {isCopied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <form id="editForm" onSubmit={handleSave} className="space-y-4">
            
            {/* Section 2: Data Inti */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Nama Tim</label>
                <input required type="text" value={formData.namaTim} onChange={(e) => setFormData({...formData, namaTim: e.target.value})} className="w-full bg-background border border-input rounded px-3 py-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Email</label>
                <input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-background border border-input rounded px-3 py-2 text-sm mt-1" />
              </div>
            </div>

            {/* Section 3: Dokumen (URL) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground">URL Logo Tim</label>
                <input type="url" value={formData.logoTim || ""} onChange={(e) => setFormData({...formData, logoTim: e.target.value})} className="w-full bg-background border border-input rounded px-3 py-2 text-sm mt-1" placeholder="https://..." />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground">URL Bukti Transfer</label>
                <input type="url" value={formData.buktiTransfer || ""} onChange={(e) => setFormData({...formData, buktiTransfer: e.target.value})} className="w-full bg-background border border-input rounded px-3 py-2 text-sm mt-1" placeholder="https://..." />
              </div>
            </div>

            {/* Section 4: Swap Kapten */}
            <div className="pt-4 border-t border-border/50">
              <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-3">Manajemen Posisi Roster</label>
              
              {formData.players.length >= 2 ? (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center bg-background/50 border border-border p-3 rounded text-sm">
                    <div>
                      <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded mr-2">KAPTEN</span>
                      {formData.players[0].ign}
                    </div>
                  </div>
                  
                  {/* Tombol Swap */}
                  <div className="flex justify-center -my-2 relative z-10">
                    <button type="button" onClick={handleSwapCaptain} className="bg-muted hover:bg-primary hover:text-white text-muted-foreground rounded-full w-8 h-8 flex items-center justify-center transition-colors shadow-md border border-border">
                      ↕
                    </button>
                  </div>

                  <div className="flex justify-between items-center bg-background/50 border border-border p-3 rounded text-sm">
                    <div>
                      <span className="bg-muted text-muted-foreground text-[10px] font-bold px-2 py-0.5 rounded mr-2">WAKIL (P2)</span>
                      {formData.players[1].ign}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Tim ini tidak memiliki roster yang cukup untuk melakukan swap.</p>
              )}
            </div>

          </form>
        </div>

        {/* Footer Modal */}
        <div className="p-5 border-t border-border/50 flex justify-end gap-3 bg-zinc-900/50">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-white">Batal</button>
          <button type="submit" form="editForm" disabled={isSaving} className="px-4 py-2 text-sm bg-primary text-white rounded font-bold hover:bg-primary/80 disabled:opacity-50">
            {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>

      </div>
    </div>
  )
                  }
